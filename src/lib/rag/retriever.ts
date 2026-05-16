// src/lib/rag/retriever.ts

import { knowledgeBase, KnowledgeEntry, initKnowledgeBaseEmbeddings } from './knowledgeBase'
import { getEmbedding, cosineSimilarity } from './embeddings'
import { MerchantData } from '@/types'

function ruleScore(entry: KnowledgeEntry, merchant: MerchantData, module: string): number {
  let score = 0

  // 品类匹配
  if (entry.category === merchant.category) score += 3
  if (entry.category === 'all') score += 1

  // 阶段匹配
  if (entry.stage === merchant.stage) score += 3
  if (entry.stage === 'all') score += 1

  // 模块相关性
  if (module === 'content' && entry.id.includes('content')) score += 2
  if (module === 'empowerment' && entry.id.includes('platform')) score += 2
  if (module === 'benchmark' && entry.source.includes('案例')) score += 2

  // 优先有数据背书的
  if (entry.verified) score += 1

  return score
}

export async function retrieveRelevantKnowledge(
  merchant: MerchantData,
  module: string,
  topK: number = 3
): Promise<KnowledgeEntry[]> {
  // 确保知识库 embedding 已初始化（幂等，首次调用时生成）
  await initKnowledgeBaseEmbeddings()

  const query = `${merchant.category} ${merchant.stage} ${merchant.categoryType} ${module}`
  const queryVec = await getEmbedding(query)

  const scored = knowledgeBase.map((entry) => {
    const rules = ruleScore(entry, merchant, module)

    const semantic = entry.embedding
      ? cosineSimilarity(queryVec, entry.embedding)
      : 0

    // 规则分归一化到 0~1（理论最高分 = 3+3+2+1 = 9）
    const ruleNorm = Math.min(rules / 9, 1)
    // 规则权重 0.4，语义权重 0.6
    const hybrid = ruleNorm * 0.4 + semantic * 0.6

    return { entry, score: hybrid }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry)
}

export function formatKnowledgeContext(entries: KnowledgeEntry[]): string {
  return entries
    .map((e) =>
      `【来源：${e.source}】${e.content}${
        e.dataPoint ? `\n数据支撑：${e.dataPoint}` : ''
      }`
    )
    .join('\n\n')
}
