import { MerchantData, Alert } from '@/types'
import { getCampaignsWithinWeeks } from '@/lib/tools/calendarTool'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'
import { DateRange, rangePromptLine } from '@/lib/dateRange'

export async function buildEmpowermentPrompt(
  merchant: MerchantData,
  alerts: Alert[],
  focusNote?: string,
  dateRange?: DateRange
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'empowerment', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)
  const campaigns = getCampaignsWithinWeeks(8)
  const nextCampaign = campaigns[0]
  const alertSummary = alerts
    .map((a) => `[${a.level}] ${a.title}：${a.body}`)
    .join('\n')

  const rangeLine = rangePromptLine(dateRange)

  return `请为以下商家生成投流与营销策略建议，输出 JSON。
${rangeLine ? rangeLine + '\n（所有"本周/近期"诊断都基于此周期，避免出现与该周期不一致的时间词。）\n' : ''}
${focusNote ? `【AM 本次重点关注（必须在 adStrategy / weeklyBudgetSuggestion 中体现）】\n${focusNote}\n` : ''}
【检索到的相关知识（建议必须基于此生成）】
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

重要：所有正文文本中**严禁**出现"（来源：…）"、"（依据：…）"、"根据 XXX："等显式归因短语；
来源/依据将通过结构化 evidence 字段在前端以 hover 形式呈现，正文只写结论与行动建议本身。

输出以下 JSON（不要有任何其他文字）：
{
  "adStrategy": "中文一段（≤80字）：本周广告策略主线——基于 ROI / 周环比 / 营销节点定调，明确放量 or 控本，以及主推哪类素材。",
  "recommendedTools": ["GMV Max", "Spark Ads"],
  "budgetBreakdown": [
    {
      "tool": "GMV Max | Promote | Spark Ads | Live GMV Max（必须从这4个里选，2-4 个工具）",
      "dailyUsd": 数字（USD/天，必须基于上方"本周广告消耗"按比例分配，不能虚构超过当前消耗 1.5 倍的数）,
      "share": 数字（占比 0-100，所有工具加总 ≈ 100）,
      "purpose": "中文 ≤20 字（例 \\"承接自然流转化\\" / \\"达人爆款素材加热\\"）",
      "targetRoi": 数字（可选，期望 ROI，例 1.8）
    }
  ],
  "campaignNode": ${nextCampaign && nextCampaign.daysUntil <= 56
    ? `{
    "campaignName": "${nextCampaign.name}",
    "daysUntil": ${nextCampaign.daysUntil},
    "actions": ["备战行动1（中文 ≤30 字，具体到做什么）", "备战行动2", "备战行动3"]
  }`
    : 'null'},
  "weeklyBudgetSuggestion": "中文一段（≤60字）：本周总预算金额和加减仓逻辑（例 \\"本周建议 $X/天，周环比 +/-Y%；上半周观察、下半周向 Spark Ads 倾斜\\"）。",
  "evidence": [
    { "type": "metric", "label": "≤10字短标签", "detail": "≤40字真实数据/出处" }
  ]
}

【budgetBreakdown 强约束】
- 必须输出 2-4 个工具的分配（不要全部 4 个工具一股脑都给），share 之和 = 100。
- 冷启期商家：以 Promote / Spark Ads 测素材为主，少量 GMV Max。
- 成长期/成熟期商家：以 GMV Max 为主力（≥50%），Spark Ads / Live GMV Max 为辅。
- 直播为 0 场的商家不要给 Live GMV Max 配预算（share = 0 直接不输出）。
- dailyUsd 必须和上方"本周广告消耗"在同一个量级，不要凭空翻倍。

【evidence 字段（必填，3-5 条）】
- 这是整个"投流营销"板块结论的依据，前端会在板块标题旁渲染统一的"来源"小标签，hover 弹出列表。
- type 取值：metric（本周广告/GMV 数据）/ calendar（营销节点档期）/ knowledge（投放知识 / 工具规则）/ benchmark（标杆案例）。
- label ≤10 字，detail ≤40 字，必须引用真实数值或上方真实出现的档期/工具/案例。严禁编造。`
}