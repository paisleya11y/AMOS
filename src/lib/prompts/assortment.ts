import { MerchantData, InventoryAnalysis, TrendOpportunity } from '@/types'
import { formatCampaignContext } from '@/lib/tools/calendarTool'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'
import { formatInventoryForPrompt, formatTrendsForPrompt } from '@/lib/tools/inventoryAnalyzer'
import { DateRange, rangePromptLine } from '@/lib/dateRange'

export async function buildAssortmentPrompt(
  merchant: MerchantData,
  inventory: InventoryAnalysis,
  trends: TrendOpportunity[],
  focusNote?: string,
  dateRange?: DateRange
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'assortment', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)
  const campaignCtx = formatCampaignContext()
  const inventoryCtx = formatInventoryForPrompt(inventory)
  const trendsCtx = formatTrendsForPrompt(trends)

  const trendKeywords = trends.map(t => t.keyword)
  const rangeLine = rangePromptLine(dateRange)

  return `你是 TikTok Shop 选品货盘专家。请基于以下数据，为商家「${merchant.name}」生成诊断文本和建议。
${rangeLine ? rangeLine + '\n（所有"本周/近期"诊断都基于此周期，避免出现与该周期不一致的时间词。）\n' : ''}
${focusNote ? `【AM 本次重点关注（必须在 structureDiagnosis / recommendedProducts / inventoryWarnings 中体现）】\n${focusNote}\n` : ''}
【相关知识】
${knowledgeCtx}

【商家画像】
品类：${merchant.category}（${merchant.categoryType}）
子品类：${merchant.subCategoryTags.join('、')}
阶段：${merchant.stage}
月GMV：$${merchant.monthlyGMV.toLocaleString()}

【营销日历】
${campaignCtx}

【货盘数据（已由规则引擎预计算）】
${inventoryCtx}

【趋势数据】
${trendsCtx}

═══════════════════
你需要做的事：
═══════════════════

1. 为货盘诊断的四个维度各写一段 2-3 句的定制化建议：
   - structureDiagnosis：货盘结构建议（结合商家阶段：${merchant.stage}）
   - marginDiagnosis：毛利优化建议
   - turnoverDiagnosis：滞销品处理建议
   - fieldMixDiagnosis：场域优化方向

2. 为每个趋势词写一句个性化 suggestedAction，必须结合该商家现有品类和SKU特点（${merchant.subCategoryTags.join('、')}），不能照搬趋势数据通用文案。
   趋势词列表：${trendKeywords.join('、')}

3. 综合货盘缺口 + 趋势信号 + 营销日历，生成：
   - recommendedProducts：3-5 个具体产品方向，每个标注 type/name/reason/urgency/basedOn
   - inventoryWarnings：1-3 条库存预警
   - upcomingOpportunities：1-3 个近期机会点

   **货盘建议必须覆盖"主推商品 + 配件/搭配 + 测试品"三类，不能全部都是配件 / 全部都是基础款。**
   - 至少 1 条直接围绕商家的主推主机/核心 SKU（来自上方明星品或主品类，例如相机/小家电主机/服饰主款），可以是「升级版本 / 限时套装 / 主推捆绑」。
   - 至少 1 条围绕配件 / 提升客单 / 拓展消费场景。
   - 至少 1 条 testing 类型用于测试新方向。
   - name 字段必须出现具体商品名（含规格/容量/颜色/版本等限定词），禁止用"主推套装""新品测试"这种泛泛的占位词。

═══════════════════
输出规则：
═══════════════════
- basedOn 只能选：inventory_gap / trend_signal / calendar_event / structure_optimization
- urgency 判断：high=风险品需立即处理或趋势增速>70%且竞争低；medium=结构优化或中期布局；low=长期机会
- 阶段适配（当前：${merchant.stage}）：cold_start 聚焦1-2个爆品，growth 平衡常青和趋势，mature 精细化毛利管理
- 正文文本中**严禁**出现"（来源：…）"、"（依据：…）"、"根据 XXX："等显式归因短语；来源由结构化 evidence/basedOn 字段处理，正文只写结论与建议本身。

仅输出以下 JSON，不要任何其他文字：
{
  "structureDiagnosis": "",
  "marginDiagnosis": "",
  "turnoverDiagnosis": "",
  "fieldMixDiagnosis": "",
  "trendActions": [
    { "keyword": "${trendKeywords[0] || '示例趋势词'}", "suggestedAction": "" }
  ],
  "recommendedProducts": [
    { "type": "evergreen", "name": "", "reason": "", "urgency": "medium", "basedOn": "inventory_gap" }
  ],
  "inventoryWarnings": [""],
  "upcomingOpportunities": [""],
  "evidence": [
    { "type": "metric", "label": "≤10字短标签", "detail": "≤40字真实数据/出处" }
  ]
}

【evidence 字段（必填，3-5 条）】
- 这是整个"选品货盘"板块结论的依据，前端会在板块标题旁渲染统一的"来源"小标签，hover 弹出列表。
- type 取值：sku（具体商品）/ metric（货盘或本周数据）/ trend（趋势/搜索热度）/ calendar（档期）/ benchmark（标杆）/ knowledge（知识库）。
- label ≤10 字，detail ≤40 字，必须引用真实数值或上方真实出现的 SKU/趋势/档期/案例。严禁编造。`
}
