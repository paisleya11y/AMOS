// src/lib/rag/embeddings.ts

const DEEPSEEK_EMBEDDING_URL = 'https://api.deepseek.com/v1/embeddings'
const FALLBACK_DIMS = 256

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  if (normA === 0 || normB === 0) return 0
  return dot / (normA * normB)
}

function simpleEmbed(text: string, dims: number = FALLBACK_DIMS): number[] {
  // 轻量级关键词哈希向量作为 fallback，不依赖外部 API
  const tokens = text
    .toLowerCase()
    .split(/[\s,，。、；：！？]+/)
    .filter(Boolean)

  const vec = new Array(dims).fill(0)
  for (const token of tokens) {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0
    }
    vec[Math.abs(hash) % dims] += 1
  }

  // L2 归一化
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < dims; i++) vec[i] /= norm
  }
  return vec
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return simpleEmbed(text)

  try {
    const res = await fetch(DEEPSEEK_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-embedding',
        input: text,
      }),
    })

    if (!res.ok) throw new Error(`Embedding API returned ${res.status}`)
    const data = await res.json()
    return data.data[0].embedding as number[]
  } catch {
    // API 不可用时自动降级到本地哈希向量
    return simpleEmbed(text)
  }
}

export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(getEmbedding))
}
