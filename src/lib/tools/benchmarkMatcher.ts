import { MerchantData } from '@/types'
import { benchmarkCases, BenchmarkCaseExtended } from '@/lib/mockData/benchmarkCases'

// 对标维度定义
interface MatchDimension {
  name: string
  weight: number
  score: number
  reason: string
}

export interface GapAnalysis {
  subCategoryNote: string
  stageMatch: boolean
  stageNote: string
  gmvComparison: string
  gmvNote: string
  roiGap: string
  roiNote: string
  contentMaturityGap: string
  contentMaturityNote: string
  scaleAssessment: string
  keyDifferences: string[]
  adaptationNotes: string[]
  isSelfMatch: boolean
}

export interface MatchResult {
  case: BenchmarkCaseExtended
  totalScore: number
  dimensions: MatchDimension[]
  matchSummary: string
  gapAnalysis: GapAnalysis
}

function computeGap(
  merchant: MerchantData,
  benchmark: BenchmarkCaseExtended,
  totalScore: number,
  subCategoryOverlap: string[]
): GapAnalysis {
  // 0. 子品类差异分析
  const subCategoryMatch = subCategoryOverlap.length > 0
  const subCategoryNote = subCategoryMatch
    ? `子品类匹配：商家和标杆共享标签「${subCategoryOverlap.join('、')}」，产品类型相近，运营策略可直接参考`
    : `⚠️ 子品类不匹配：商家标签「${merchant.subCategoryTags.join('、')}」与标杆标签「${benchmark.subCategoryTags.join('、')}」无重叠。标杆的具体商品策略（选品方向、内容选题、达人类型）不适用于当前商家，仅可参考方法论层面的经营思路。`

  // 1. 阶段匹配分析
  const stageMatch = merchant.stage === benchmark.fromStage
  const stageNote = stageMatch
    ? `当前商家经营阶段（${merchant.stage}）与标杆突破起点一致，策略可直接参考`
    : `当前商家为「${merchant.stage}」阶段，标杆是从「${benchmark.fromStage}」阶段突破的。标杆的部分策略需降级适配，不能直接照搬`

  // 2. GMV 量级对比
  const [benchMin, benchMax] = benchmark.monthlyGMVRange
  let gmvComparison: string
  let gmvNote: string

  if (merchant.monthlyGMV < benchMin) {
    gmvComparison = `当前 GMV $${merchant.monthlyGMV.toLocaleString()} < 标杆起步区间下限 $${benchMin.toLocaleString()}`
    gmvNote = `商家 GMV 低于标杆起步水平，资源投入（达人预算、广告预算、团队规模）需等比缩放，不能按标杆的量级执行。建议按 GMV 比例折算：系数约 ${(merchant.monthlyGMV / Math.max(benchMin, 1)).toFixed(1)}x`
  } else if (merchant.monthlyGMV > benchMax) {
    gmvComparison = `当前 GMV $${merchant.monthlyGMV.toLocaleString()} > 标杆区间上限 $${benchMax.toLocaleString()}`
    gmvNote = `商家 GMV 已超越标杆水平，标杆案例的参考价值以方法论为主，具体数字不再适用。建议寻找更高量级的跨品类案例作为新标杆`
  } else {
    gmvComparison = `当前 GMV $${merchant.monthlyGMV.toLocaleString()} 在标杆区间 [$${benchMin.toLocaleString()}, $${benchMax.toLocaleString()}] 内`
    gmvNote = `GMV 量级与标杆基本一致，资源投入量级可直接参考`
  }

  // 3. ROI 差距分析（以 2.0 为健康线基准）
  let roiGap: string
  let roiNote: string

  if (merchant.weeklyData.adROI < 1.5) {
    roiGap = `当前 ROI ${merchant.weeklyData.adROI}，低于危险线 1.5`
    roiNote = `商家 ROI 处于危险区，标杆案例中可能包含"加大投放"类建议，但当前不应执行。优先优化素材和转化率，ROI 回到 2.0 以上再考虑放量`
  } else if (merchant.weeklyData.adROI < 2.0) {
    roiGap = `当前 ROI ${merchant.weeklyData.adROI}，在警戒区（1.5-2.0）`
    roiNote = `ROI 未达健康线，标杆案例的投放策略需保守执行——先小预算 A/B 测试素材，不直接放量`
  } else {
    roiGap = `当前 ROI ${merchant.weeklyData.adROI}，在健康区（≥2.0）`
    roiNote = `ROI 健康，标杆案例中的投放放量建议可以直接参考执行`
  }

  // 4. 内容成熟度差距
  const sellerRatio = merchant.weeklyData.sellerContentGMV / Math.max(merchant.weeklyData.totalGMV, 1)
  let contentMaturityGap: string
  let contentMaturityNote: string

  if (sellerRatio < 0.1) {
    contentMaturityGap = `自制内容 GMV 占比仅 ${(sellerRatio * 100).toFixed(0)}%，严重依赖达人内容`
    contentMaturityNote = `标杆案例中涉及"自制内容矩阵""品牌自播"等建议暂不适用。当前应先补齐达人内容场的量，同时小规模测试自制内容（1-2 条/周），不要直接上自播矩阵`
  } else if (sellerRatio < 0.2 && merchant.stage !== 'cold_start') {
    contentMaturityGap = `自制内容 GMV 占比 ${(sellerRatio * 100).toFixed(0)}%，低于成长期建议值 15%`
    contentMaturityNote = `自制内容能力正在建设中，标杆案例的"商家自播为主"策略需调整为"达人+自制并行"，给自制内容留 4-6 周爬坡期`
  } else {
    contentMaturityGap = `自制内容 GMV 占比 ${(sellerRatio * 100).toFixed(0)}%，内容能力成熟`
    contentMaturityNote = `内容基础扎实，标杆案例的内容策略可以直接参考`
  }

  // 5. 综合评估
  const scaleAssessment =
    totalScore >= 80
      ? '高度匹配：标杆案例的策略可直接参考，重点关注 GMV 量级和 ROI 差异做微调'
      : totalScore >= 60
        ? '中度匹配：标杆案例的方法论可参考，但具体执行方案需结合差异点调整'
        : '低度匹配：标杆案例仅提供方法论参考，具体策略需大幅调整，建议同时参考跨品类案例'

  // 6. 关键差异点汇总
  const keyDifferences: string[] = []
  if (!subCategoryMatch) {
    keyDifferences.push(
      `⚠️ 子品类不匹配：商家为「${merchant.subCategoryTags.join('、')}」，标杆为「${benchmark.subCategoryTags.join('、')}」，具体商品/内容策略不可照搬，仅参考方法论`
    )
  }
  if (!stageMatch) keyDifferences.push(`经营阶段不同：当前为「${merchant.stage}」，标杆从「${benchmark.fromStage}」突破`)
  if (merchant.monthlyGMV < benchMin) keyDifferences.push(`GMV 量级差距：当前 $${merchant.monthlyGMV.toLocaleString()}，标杆起步至少 $${benchMin.toLocaleString()}`)
  if (merchant.monthlyGMV > benchMax) keyDifferences.push(`GMV 已超标杆：当前 $${merchant.monthlyGMV.toLocaleString()}，标杆上限 $${benchMax.toLocaleString()}`)
  if (merchant.weeklyData.adROI < 1.5) keyDifferences.push(`ROI 危险：${merchant.weeklyData.adROI}，不得执行放量类建议`)
  if (sellerRatio < 0.1) keyDifferences.push('内容产能低：自制内容几乎为零，不可执行自播矩阵建议')

  // 7. 适配建议
  const adaptationNotes: string[] = []
  if (!subCategoryMatch) {
    adaptationNotes.push(
      `子品类不匹配：忽略标杆案例中针对「${benchmark.subCategoryTags.join('、')}」的具体选品/内容建议，只提取经营方法论层面的通用策略（如场域协同逻辑、达人矩阵搭建节奏、ROI优化路径）`
    )
  }
  if (!stageMatch) {
    adaptationNotes.push(`先补齐「${benchmark.fromStage}」阶段的基础能力（达人内容量、基础转化率），再执行标杆的增长策略`)
  }
  if (merchant.monthlyGMV < benchMin) {
    adaptationNotes.push(`所有涉及预算的建议按 ${(merchant.monthlyGMV / Math.max(benchMin, 1)).toFixed(1)}x 系数折算`)
  }
  if (merchant.weeklyData.adROI < 1.5) {
    adaptationNotes.push('优先执行 ROI 优化动作（素材 A/B 测试、关闭低效广告组），推迟所有放量投放建议至 ROI≥2.0')
  }
  if (sellerRatio < 0.1) {
    adaptationNotes.push('自制内容建议改为"测试期轻量方案"：每周 1-2 条，不设 GMV 目标，以积累素材和磨合团队为目标')
  }

  return {
    subCategoryNote,
    stageMatch,
    stageNote,
    gmvComparison,
    gmvNote,
    roiGap,
    roiNote,
    contentMaturityGap,
    contentMaturityNote,
    scaleAssessment,
    keyDifferences,
    adaptationNotes,
    isSelfMatch: false,
  }
}

export function matchBenchmark(merchant: MerchantData): MatchResult {
  const results = benchmarkCases.map((c) => {
    const dimensions: MatchDimension[] = []

    // 维度1：子品类匹配（标签重叠度，最关键的产品维度）
    const merchantTags = merchant.subCategoryTags ?? []
    const caseTags = c.subCategoryTags ?? []
    const overlapCount = merchantTags.filter((t) => caseTags.includes(t)).length
    const maxTags = Math.max(merchantTags.length, caseTags.length, 1)
    const overlapRatio = overlapCount / maxTags
    const subCategoryScore = Math.round(overlapRatio * 20) // 0-20，按重叠比例给分
    dimensions.push({
      name: '子品类',
      weight: 20,
      score: subCategoryScore,
      reason: overlapCount > 0
        ? `子品类标签重叠 ${overlapCount}/${maxTags}（${merchantTags.filter((t) => caseTags.includes(t)).join('、')}），产品类型相近`
        : `子品类标签无重叠（商家：${merchantTags.join('、')}，标杆：${caseTags.join('、')}），产品类型差异大`,
    })

    // 维度2：品类类型匹配（small_standard/non_standard/large_standard）
    const categoryTypeScore = c.categoryType === merchant.categoryType ? 20 : 0
    dimensions.push({
      name: '品类类型',
      weight: 20,
      score: categoryTypeScore,
      reason: categoryTypeScore > 0
        ? `同为${merchant.categoryType}类目，运营逻辑相似`
        : '品类类型不同，参考价值有限',
    })

    // 维度3：一级品类匹配
    const categoryScore = c.category === merchant.category ? 15 : 0
    dimensions.push({
      name: '所属品类',
      weight: 15,
      score: categoryScore,
      reason: categoryScore > 0
        ? `同属${merchant.category}品类，竞争环境一致`
        : '跨品类参考，需关注差异',
    })

    // 维度4：经营阶段匹配（从哪个阶段突破最关键）
    const stageScore = c.fromStage === merchant.stage ? 25 : 0
    dimensions.push({
      name: '经营阶段',
      weight: 25,
      score: stageScore,
      reason: stageScore > 0
        ? `标杆商家也是从${merchant.stage}阶段突破的，路径最具参考性`
        : '阶段不完全匹配，需结合实际调整',
    })

    // 维度5：GMV 规模匹配
    const [min, max] = c.monthlyGMVRange
    const gmvScore =
      merchant.monthlyGMV >= min && merchant.monthlyGMV <= max ? 20 : 0
    dimensions.push({
      name: 'GMV 规模',
      weight: 20,
      score: gmvScore,
      reason: gmvScore > 0
        ? `月GMV规模相近，资源投入量级可直接参考`
        : 'GMV规模差异较大，需等比缩放参考',
    })

    const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)

    // 生成匹配摘要
    const matchedDimensions = dimensions.filter((d) => d.score > 0)
    const matchSummary = matchedDimensions.length > 0
      ? `在「${matchedDimensions.map((d) => d.name).join('、')}」${matchedDimensions.length}个维度高度匹配（${totalScore}分/100分）`
      : '跨维度参考案例，建议重点关注方法论而非数据'

    return { case: c, totalScore, dimensions, matchSummary }
  })

  results.sort((a, b) => b.totalScore - a.totalScore)

  // 去重：如果最佳匹配案例名与当前商家名相同，跳过，取下一个
  let best = results[0]
  if (best.case.name === merchant.name && results.length > 1) {
    const skipped = best
    best = results[1]
    console.log(
      `[benchmarkMatcher] 商家「${merchant.name}」自身即为标杆案例「${skipped.case.name}」（${skipped.totalScore}分），已自动跳转到次优匹配「${best.case.name}」（${best.totalScore}分）`
    )
  }

  const subCategoryOverlap = (merchant.subCategoryTags ?? []).filter((t) =>
    (best.case.subCategoryTags ?? []).includes(t)
  )
  const gapAnalysis = computeGap(merchant, best.case, best.totalScore, subCategoryOverlap)
  // 如果触发了去重，标记
  if (results[0].case.name === merchant.name) {
    gapAnalysis.isSelfMatch = true
  }

  return { ...best, gapAnalysis }
}
