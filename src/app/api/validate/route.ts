import { NextRequest, NextResponse } from 'next/server'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { MerchantData, AssortmentResult, ContentResult, EmpowermentResult, BenchmarkResult } from '@/types'

interface ValidationInput {
  merchantData: MerchantData
  generatedReport: {
    assortment: AssortmentResult
    content: ContentResult
    empowerment: EmpowermentResult
    benchmark: BenchmarkResult
  }
  healthScore: number
}

interface ValidationResult {
  overallConfidence: number
  issues: string[]
  suggestionScores: { suggestion: string; score: number; reason: string }[]
  revisedSuggestions: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { merchantData, generatedReport, healthScore } = (await req.json()) as ValidationInput & { healthScore: number }

    const validatePrompt = `你是一个严格的质量审核员，负责检查 AI 生成的 TikTok Shop 商家运营建议是否合理。

【商家真实数据】
名称：${merchantData.name}
品类：${merchantData.category}（${merchantData.categoryType}）
经营阶段：${merchantData.stage}
月GMV：$${merchantData.monthlyGMV.toLocaleString()}
SPS评分：${merchantData.spsScore}
本周GMV：$${merchantData.weeklyData.totalGMV.toLocaleString()}
广告ROI：${merchantData.weeklyData.adROI}
周环比：${merchantData.weeklyData.weekOverWeekChange}%
达人GMV占比：${((merchantData.weeklyData.creatorContentGMV / merchantData.weeklyData.totalGMV) * 100).toFixed(0)}%
健康评分：${healthScore}

【待审核的建议】
选品建议：${JSON.stringify(generatedReport.assortment)}
内容策略：${JSON.stringify(generatedReport.content)}
投流策略：${JSON.stringify(generatedReport.empowerment)}
标杆分析：${JSON.stringify(generatedReport.benchmark)}

请检查以下几点：
1. 建议是否与商家数据矛盾（比如ROI很低却建议加预算）
2. 建议是否过于激进或保守（与商家阶段不匹配）
3. 每条建议的可信度评分（0-100）
4. 需要修正的建议有哪些

注意：
- 如果建议引用了具体来源（白皮书、案例），可信度加分
- 如果建议有具体数字和时间节点，可信度加分
- 如果建议与商家数据明显矛盾，立即标注为 issue
- 如果建议模糊、无量化指标，降低可信度评分

输出以下 JSON（不要有任何其他文字）：
{
  "overallConfidence": 0-100,
  "issues": ["问题描述1", "问题描述2"],
  "suggestionScores": [
    {"suggestion": "被评估的建议原文", "score": 85, "reason": "评分理由"}
  ],
  "revisedSuggestions": ["修正后的建议1", "修正后的建议2"]
}`

    const result = await callDeepSeekJSON<ValidationResult>([
      {
        role: 'system',
        content: '你是严格的质量审核员，不会对明显错误的建议放行。你对 TikTok Shop 运营有深刻理解，能准确判断建议是否与商家数据匹配。',
      },
      { role: 'user', content: validatePrompt },
    ])

    return NextResponse.json(result)
  } catch (err) {
    console.error('[validate]', err)
    return NextResponse.json({
      overallConfidence: 0,
      issues: ['验证服务暂时不可用: ' + String(err)],
      suggestionScores: [],
      revisedSuggestions: [],
    } as ValidationResult)
  }
}
