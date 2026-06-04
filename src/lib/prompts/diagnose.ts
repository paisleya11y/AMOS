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

【检索到的相关知识（建议必须基于此生成）】
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

重要：所有正文文本中**严禁**出现"（来源：…）"、"（依据：…）"、"根据 XXX："等显式归因短语；归因将通过结构化字段在前端以 hover 形式呈现。

**关于 alerts.body 的内容形式建议：**
- 涉及内容/视频建议时，必须使用白皮书"商家好内容五大分型"中的术语：
  卖点讲解型 / 生活场景型 / 买家·卖家实测型 / 测评对比·情景演绎型 / 开箱直拍型
- 应该按品类匹配：3C 配件 / 数码 / 户外运动 → 优先「生活场景型」「测评对比·情景演绎型」「卖点讲解型」；
  美妆个护 → 优先「买家·卖家实测型」；家居小件 → 优先「开箱直拍型」「卖点讲解型」。
- 不要把"开箱直拍型"硬塞给户外运动相机/3C 数码这种以场景体验为主的品类，否则与内容策略板块的 recommendedFormats 互相打架。

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