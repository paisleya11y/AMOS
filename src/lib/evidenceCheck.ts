import { FullReport, MerchantData, Evidence } from '@/types'

/**
 * P1-⑥ evidence 真实性校验。
 *
 * 背景：evidence（"来源"标签）是 LLM 自己写的，存在"自证/编造"风险——它可能编一条
 * 看似有据的来源去佐证自己的结论。专业 AM 一旦发现来源对不上真实数据，信任即崩。
 *
 * 方案：把"本次报告真实可引用的事实"汇成一个 corpus（真实 SKU 名 / 关键指标数值 /
 * 趋势词 / 子品类 / 标杆案例名 / 知识来源）。逐条核对 evidence 的 label+detail 是否
 * 至少命中 corpus 里的一个锚点。命中=已核实，未命中=待核实（前端标灰，不直接删，
 * 保留透明度）。
 *
 * 注意：这是 demo 级的"轻量 grounding 检查"，靠 token 命中而非严格语义校验——
 * 目的是把"明显凭空捏造"的来源挑出来，并向 AM 展示"哪些来源 AMOS 能对上真实数据"。
 */

/** 从数字里抽取可比较的数值 token（含可能的百分号/美元写法都归一成纯数字串） */
function extractNumbers(s: string): string[] {
  const out: string[] = []
  const re = /\d+(?:\.\d+)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    out.push(m[0])
  }
  return out
}

/**
 * 构造"真实事实语料"。返回两部分：
 *  - phrases：真实存在的名词性 token（SKU 名、趋势词、子品类、标杆名、档期名…）
 *  - numbers：真实出现过的关键数值（GMV、ROI、转化率、周环比、视频数…）
 */
export function buildFactCorpus(
  merchant: MerchantData | undefined,
  report: FullReport,
): { phrases: string[]; numbers: Set<string> } {
  const phrases: string[] = []
  const numbers = new Set<string>()

  const addPhrase = (s?: string) => {
    if (s && s.trim().length >= 2) phrases.push(s.trim().toLowerCase())
  }
  const addNum = (n?: number) => {
    if (typeof n === 'number' && Number.isFinite(n)) {
      numbers.add(String(Math.round(n)))
      numbers.add(String(n))
    }
  }

  if (merchant) {
    addPhrase(merchant.name)
    addPhrase(merchant.category)
    merchant.subCategoryTags?.forEach(addPhrase)
    merchant.skuList?.forEach((s) => addPhrase(s.name))
    const wd = merchant.weeklyData
    addNum(wd.totalGMV)
    addNum(merchant.monthlyGMV)
    addNum(wd.adROI)
    addNum(wd.conversionRate)
    addNum(wd.weekOverWeekChange)
    addNum(Math.abs(wd.weekOverWeekChange))
    addNum(wd.videoCount)
    addNum(wd.liveCount)
    addNum(wd.adSpend)
    // 场域占比（百分比）
    const total = wd.totalGMV || 1
    addNum(Math.round((wd.creatorContentGMV / total) * 100))
    addNum(Math.round((wd.sellerContentGMV / total) * 100))
  }

  // 报告内真实出现的 SKU / 趋势 / 标杆 / 档期
  const inv = report.assortment?.inventoryAnalysis
  inv?.starSkus?.forEach((s) => addPhrase(s.name))
  inv?.riskSkus?.forEach((s) => addPhrase(s.name))
  report.assortment?.trendOpportunities?.forEach((t) => addPhrase(t.keyword))
  report.assortment?.recommendedProducts?.forEach((p) => addPhrase(p.name))
  addPhrase(report.benchmark?.matchedCase?.name)
  addPhrase(report.benchmark?.matchedCase?.category)
  report.empowerment?.campaignNode &&
    addPhrase(report.empowerment.campaignNode.campaignName)
  addNum(report.diagnose?.healthScore)

  return { phrases: phrases.filter(Boolean), numbers }
}

/**
 * 判定一条 evidence 是否"有据"：
 *  - knowledge / benchmark 类型默认放行（来自知识库/标杆，本就是外部出处，不强求命中数值）
 *  - 其它类型：label+detail 命中任一真实 phrase，或包含任一真实数值，即视为已核实
 */
export function isEvidenceGrounded(
  e: Evidence,
  corpus: { phrases: string[]; numbers: Set<string> },
): boolean {
  if (e.type === 'knowledge' || e.type === 'benchmark') return true

  const text = `${e.label ?? ''} ${e.detail ?? ''}`.toLowerCase()
  if (!text.trim()) return false

  // 命中真实名词
  for (const p of corpus.phrases) {
    if (p.length >= 2 && text.includes(p)) return true
  }
  // 命中真实数值
  const nums = extractNumbers(text)
  for (const n of nums) {
    if (corpus.numbers.has(n)) return true
  }
  return false
}
