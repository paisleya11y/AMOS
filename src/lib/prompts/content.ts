import { MerchantData } from '@/types'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'

export async function buildContentPrompt(merchant: MerchantData): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'content', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)

  const creatorRatio = (
    (merchant.weeklyData.creatorContentGMV / merchant.weeklyData.totalGMV) * 100
  ).toFixed(0)
  const sellerRatio = (
    (merchant.weeklyData.sellerContentGMV / merchant.weeklyData.totalGMV) * 100
  ).toFixed(0)

  return `请为以下商家生成内容策略建议，输出 JSON。

【检索到的相关知识（必须基于此生成建议，并在建议中标注来源）】
${knowledgeCtx}

【商家信息】
名称：${merchant.name}
品类：${merchant.category}（${merchant.categoryType}）
经营阶段：${merchant.stage}
达人内容场GMV占比：${creatorRatio}%
商家自制内容GMV占比：${sellerRatio}%
本周视频发布数：${merchant.weeklyData.videoCount}
本周直播场次：${merchant.weeklyData.liveCount}
新增粉丝：${merchant.weeklyData.newFollowers}

【五大内容分型参考】
- 卖点讲解型：适合3C配件、清洁工具等功能清晰的小件标品
- 生活场景型：适合家居用品、户外用品、日用百货等品类
- 开箱直拍型：适合3C配件、小家电、收纳类商品
- 买家/卖家实测型：适合美妆个护、家清、服饰配饰等体验感强的品类
- 测评对比型：适合工具类、家电类、功能对比明显的商品

请结合品类特点推荐最适合的内容分型，并给出达人合作 Brief 模板。

重要：每条建议必须标注知识来源，格式为「建议内容（来源：XXX）」

输出以下 JSON（不要有任何其他文字）：
{
  "recommendedFormats": [
    {
      "type": "内容分型名称",
      "reason": "为什么适合这个品类和阶段",
      "exampleAngle": "具体拍摄角度举例"
    }
  ],
  "creatorBrief": "完整的达人内容Brief模板，包含商品卖点、期望创作方向、必须展示的核心卖点、品牌规范",
  "liveStructure": "直播排品结构建议：引流品-主推品-利润品的配比和节奏",
  "weeklyPlan": "本周内容发布计划：几条视频、几场直播、发布时间建议"
}`
}