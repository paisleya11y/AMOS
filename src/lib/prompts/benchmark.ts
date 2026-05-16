import { MerchantData } from '@/types'
import { BenchmarkCaseExtended } from '@/lib/mockData/benchmarkCases'
import { GapAnalysis } from '@/lib/tools/benchmarkMatcher'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'

export async function buildBenchmarkPrompt(
  merchant: MerchantData,
  matchedCase: BenchmarkCaseExtended,
  gap: GapAnalysis
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'benchmark', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)

  const selfMatchWarning = gap.isSelfMatch
    ? `⚠️ 注意：当前商家即为该标杆案例本身，请基于该品类其他阶段的成长路径或跨品类顶级案例的方法论提供参考，不要建议"向自己学习"。\n`
    : ''

  const gapSection = gap.keyDifferences.length > 0
    ? gap.keyDifferences.map((d) => `- ${d}`).join('\n')
    : '无明显差异点，标杆案例策略可直接参考'

  const adaptationSection = gap.adaptationNotes.length > 0
    ? gap.adaptationNotes.map((a) => `- ${a}`).join('\n')
    : '无需特殊适配'

  return `请基于标杆案例为以下商家生成学习建议，输出 JSON。

【检索到的相关知识（必须基于此生成建议，并在建议中标注来源）】
${knowledgeCtx}

${selfMatchWarning}【当前商家】
名称：${merchant.name}
品类：${merchant.category}
经营阶段：${merchant.stage}
月GMV：$${merchant.monthlyGMV.toLocaleString()}
广告ROI：${merchant.weeklyData.adROI}
达人内容占比：${((merchant.weeklyData.creatorContentGMV / merchant.weeklyData.totalGMV) * 100).toFixed(0)}%
自制内容占比：${((merchant.weeklyData.sellerContentGMV / merchant.weeklyData.totalGMV) * 100).toFixed(0)}%

【匹配标杆案例】
名称：${matchedCase.name}
品类：${matchedCase.category}
突破点：${matchedCase.breakthrough}
关键动作：${matchedCase.keyActions.join('、')}
最终结果：${matchedCase.result}
实现周期：${matchedCase.timelineWeeks}周

【差距分析（必须基于此调整建议，不要直接照搬标杆动作）】
综合评估：${gap.scaleAssessment}

${gap.subCategoryNote}
${gap.stageNote}
${gap.gmvNote}
${gap.roiNote}
${gap.contentMaturityNote}

关键差异点：
${gapSection}

必须执行的适配：
${adaptationSection}

【生成规则（强制遵守）】
1. 不要直接复述标杆的关键动作，必须结合差距分析给出差异化建议
2. 对于差距较大的维度，给出"先补齐差距，再复制策略"的分阶段路径，每个阶段标注预估周期
3. actionableSteps 中的每条步骤必须标注：基于标杆的哪个动作、做了哪些差异化调整、预估执行周期
4. 如果商家自身就是标杆案例（isSelfMatch），不要建议"向自己学习"，而是给出下一阶段突破方向或跨品类启发
5. expectedOutcome 必须基于差距分析调整预期——差距越大，预期越保守

重要：每条建议必须标注知识来源，格式为「建议内容（来源：XXX）」

输出以下 JSON（不要有任何其他文字）：
{
  "matchedCase": {
    "name": "${matchedCase.name}",
    "category": "${matchedCase.category}",
    "stage": "${matchedCase.stage}",
    "breakthrough": "${matchedCase.breakthrough}",
    "keyActions": ${JSON.stringify(matchedCase.keyActions)},
    "result": "${matchedCase.result}"
  },
  "similarityReason": "为什么这个案例适合当前商家，需包含匹配维度分析和关键差异提醒",
  "actionableSteps": [
    "差异化可复制的具体行动步骤1（标注：基于标杆的X动作 + 因Y差异做了Z调整 + 预估周期）",
    "步骤2",
    "步骤3",
    "步骤4"
  ],
  "expectedOutcome": "基于差距分析调整后的量化预期（差距越大预期越保守，标注置信度）"
}`
}
