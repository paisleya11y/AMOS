// src/lib/rag/knowledgeBase.ts

import { getEmbedding } from './embeddings'

export interface KnowledgeEntry {
  id: string
  source: string
  category: string
  stage: string
  content: string
  dataPoint?: string
  verified: boolean
  embedding?: number[] // 预计算的向量，检索时用
}

export const knowledgeBase: KnowledgeEntry[] = [
  {
    id: 'ace_001',
    source: 'ACE白皮书 3.2节',
    category: 'all',
    stage: 'cold_start',
    content: '冷启期商家应优先布局达人内容场，达人短视频是货找人最高效的方式',
    dataPoint: '白皮书数据：达人内容场贡献冷启期商家平均60%以上GMV',
    verified: true,
  },
  {
    id: 'ace_002',
    source: 'ACE白皮书 JBL案例',
    category: '3C家电',
    stage: 'cold_start',
    content: '3C品类冷启期应大量铺达人短视频，重点选垂类3C达人，设置有竞争力的联盟佣金',
    dataPoint: 'JBL入驻20天月销破100万美元，达人视频是核心驱动力',
    verified: true,
  },
  {
    id: 'ace_003',
    source: 'ACE白皮书 5.1节',
    category: 'all',
    stage: 'all',
    content: 'GMV Max适合有稳定素材的商家，全自动投放，ROI目标导向',
    dataPoint: '使用GMV Max的商家平均广告效率提升35%',
    verified: true,
  },
  {
    id: 'platform_001',
    source: 'TikTok Shop 平台公告 2024Q4',
    category: 'all',
    stage: 'all',
    content: 'SPS评分低于60将影响搜索排名和参与官方活动资格',
    dataPoint: 'SPS评分每提升10分，搜索曝光量平均提升18%',
    verified: true,
  },
  {
    id: 'industry_001',
    source: '行业数据 美妆品类',
    category: '美妆个护',
    stage: 'growth',
    content: '美妆品类买家实测型内容转化率最高，其次是生活场景型',
    dataPoint: '买家实测型视频平均CVR比其他分型高出2.3倍',
    verified: true,
  },
]

let embeddingsReady = false

export async function initKnowledgeBaseEmbeddings(): Promise<void> {
  if (embeddingsReady) return

  const texts = knowledgeBase.map(
    (e) => `${e.category} ${e.stage} ${e.content}`
  )

  console.log(`[RAG] 开始为 ${texts.length} 条知识生成 embedding...`)
  const vectors = await Promise.all(texts.map(getEmbedding))

  for (let i = 0; i < knowledgeBase.length; i++) {
    knowledgeBase[i].embedding = vectors[i]
  }

  embeddingsReady = true
  console.log(`[RAG] embedding 初始化完成，维度：${vectors[0]?.length ?? 'unknown'}`)
}

export function isEmbeddingsReady(): boolean {
  return embeddingsReady
}
