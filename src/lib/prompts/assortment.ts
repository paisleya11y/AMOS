import { MerchantData, InventoryAnalysis, TrendOpportunity } from '@/types'
import { formatCampaignContext } from '@/lib/tools/calendarTool'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'
import { formatInventoryForPrompt, formatTrendsForPrompt } from '@/lib/tools/inventoryAnalyzer'

export async function buildAssortmentPrompt(
  merchant: MerchantData,
  inventory: InventoryAnalysis,
  trends: TrendOpportunity[]
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'assortment', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)
  const campaignCtx = formatCampaignContext()
  const inventoryCtx = formatInventoryForPrompt(inventory)
  const trendsCtx = formatTrendsForPrompt(trends)

  const trendKeywords = trends.map(t => t.keyword)

  return `你是 TikTok Shop 选品货盘专家。请基于以下数据，为商家「${merchant.name}」生成诊断文本和建议。

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

═══════════════════
输出规则：
═══════════════════
- basedOn 只能选：inventory_gap / trend_signal / calendar_event / structure_optimization
- urgency 判断：high=风险品需立即处理或趋势增速>70%且竞争低；medium=结构优化或中期布局；low=长期机会
- 阶段适配（当前：${merchant.stage}）：cold_start 聚焦1-2个爆品，growth 平衡常青和趋势，mature 精细化毛利管理
- 标注知识来源：「建议内容（来源：XXX）」

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
  "upcomingOpportunities": [""]
}`
}
