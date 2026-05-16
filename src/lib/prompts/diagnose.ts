import { MerchantData, MerchantProfile } from '@/types'
import { formatCampaignContext } from '@/lib/tools/calendarTool'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'

export async function buildDiagnosePrompt(
  merchant: MerchantData,
  profile: MerchantProfile | null
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'diagnose', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)
  const campaignCtx = formatCampaignContext()
  const profileCtx = profile
    ? `\n【历史经营数据】\n${JSON.stringify(profile.weeklyHistory.slice(-3), null, 2)}`
    : ''

  return `请对以下商家进行 ACE 经营诊断，输出 JSON。

【检索到的相关知识（必须基于此生成建议，并在建议中标注来源）】
${knowledgeCtx}

【商家信息】
名称：${merchant.name}
品类：${merchant.category}（${merchant.categoryType}）
月GMV：$${merchant.monthlyGMV.toLocaleString()}
SPS评分：${merchant.spsScore}

【本周数据】
总GMV：$${merchant.weeklyData.totalGMV.toLocaleString()}
达人内容场GMV占比：${((merchant.weeklyData.creatorContentGMV / merchant.weeklyData.totalGMV) * 100).toFixed(0)}%
商家内容场GMV占比：${((merchant.weeklyData.sellerContentGMV / merchant.weeklyData.totalGMV) * 100).toFixed(0)}%
商城+搜索GMV占比：${(((merchant.weeklyData.shopTabGMV + merchant.weeklyData.searchGMV) / merchant.weeklyData.totalGMV) * 100).toFixed(0)}%
广告ROI：${merchant.weeklyData.adROI}
转化率：${merchant.weeklyData.conversionRate}%
周环比变化：${merchant.weeklyData.weekOverWeekChange}%
${profileCtx}

【营销日历】
${campaignCtx}

重要：每条建议必须标注知识来源，格式为「建议内容（来源：XXX）」

请输出以下 JSON 结构（不要有任何其他文字）：
{
  "healthScore": 0-100的整数,
  "stage": "cold_start"|"growth"|"mature",
  "weakestDimension": "assortment"|"content"|"empowerment",
  "stageSummary": "2-3句话的经营阶段总结",
  "alerts": [
    {
      "level": "info"|"warning"|"critical",
      "title": "预警标题",
      "body": "具体描述和建议",
      "module": "diagnose"|"assortment"|"content"|"empowerment"|"benchmark"
    }
  ]
}`
}