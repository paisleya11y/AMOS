import { MerchantData, Alert } from '@/types'
import { getCampaignsWithinWeeks } from '@/lib/tools/calendarTool'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'

export async function buildEmpowermentPrompt(
  merchant: MerchantData,
  alerts: Alert[]
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'empowerment', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)
  const campaigns = getCampaignsWithinWeeks(8)
  const nextCampaign = campaigns[0]
  const alertSummary = alerts
    .map((a) => `[${a.level}] ${a.title}：${a.body}`)
    .join('\n')

  return `请为以下商家生成投流与营销策略建议，输出 JSON。

【检索到的相关知识（必须基于此生成建议，并在建议中标注来源）】
${knowledgeCtx}

【商家信息】
名称：${merchant.name}
品类：${merchant.category}
经营阶段：${merchant.stage}
本周广告消耗：$${merchant.weeklyData.adSpend.toLocaleString()}
当前广告ROI：${merchant.weeklyData.adROI}
GMV周环比：${merchant.weeklyData.weekOverWeekChange}%

【当前预警】
${alertSummary || '暂无预警'}

【最近营销节点】
${nextCampaign ? `${nextCampaign.name}：距今${nextCampaign.daysUntil}天` : '近期无重大节点'}

【广告工具说明】
- GMV Max：全自动投放，适合有稳定素材的商家，ROI目标导向
- Promote：快速测试素材，适合冷启期或新内容测试
- Spark Ads：达人内容加热，适合优质达人素材放量
- Live GMV Max：直播专用，先承接自然流再放量

请给出具体的投流策略和营销节点备战建议。

重要：每条建议必须标注知识来源，格式为「建议内容（来源：XXX）」

输出以下 JSON（不要有任何其他文字）：
{
  "adStrategy": "本周广告策略详细建议，包含预算分配和优化方向",
  "recommendedTools": ["推荐使用的广告工具1", "工具2"],
  "campaignNode": ${nextCampaign && nextCampaign.daysUntil <= 56
    ? `{
    "campaignName": "${nextCampaign.name}",
    "daysUntil": ${nextCampaign.daysUntil},
    "actions": ["备战行动1", "备战行动2", "备战行动3"]
  }`
    : 'null'},
  "weeklyBudgetSuggestion": "本周广告预算建议金额和分配逻辑"
}`
}