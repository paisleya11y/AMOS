'use client'

/**
 * 建议反馈 · localStorage MVP（数据飞轮的第一滴水）
 *
 * 记录 AM 对每条建议的处置：采纳 / 忽略 / 改写。
 * 这些数据是后续「执行回顾」(P2-⑦) 与「AM 个性化语气」(P2-⑧) 的输入。
 *
 * 存储结构：
 *   amos:feedback:v1  ->  Record<feedbackKey, FeedbackEntry>
 *   feedbackKey = `${merchantId}::${suggestionId}`（按建议聚合，重复处置覆盖）
 *
 * 先不放后端：跑通"反馈被记录 + 刷新后还在 + 可被回顾读出"的产品形态。
 */

export type FeedbackAction = 'adopted' | 'ignored' | 'revised'

export interface FeedbackEntry {
  merchantId: string
  /** 报告周期 label，便于按周聚合回顾 */
  week: string
  /** 来源模块，便于分析 AM 在哪类建议上分歧最大 */
  module: string
  /** 建议稳定 ID（同一条建议跨报告应尽量一致） */
  suggestionId: string
  /** 建议原文（展示用） */
  suggestionText: string
  action: FeedbackAction
  /** 改写时 AM 填的新内容 */
  revisedText?: string
  /** 处置时间（毫秒） */
  ts: number
}

const STORE_KEY = 'amos:feedback:v1'

function isBrowser() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function readAll(): Record<string, FeedbackEntry> {
  if (!isBrowser()) return {}
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, FeedbackEntry>) {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map))
  } catch (err) {
    console.warn('[feedbackStore] 写入失败', err)
  }
}

function keyOf(merchantId: string, suggestionId: string) {
  return `${merchantId}::${suggestionId}`
}

/** 记录/更新一条反馈（同一建议重复处置会覆盖） */
export function setFeedback(
  input: Omit<FeedbackEntry, 'ts'>,
): FeedbackEntry {
  const entry: FeedbackEntry = { ...input, ts: Date.now() }
  const map = readAll()
  map[keyOf(input.merchantId, input.suggestionId)] = entry
  writeAll(map)
  return entry
}

/** 取消某条反馈（再次点已选中的动作 = 取消） */
export function clearFeedback(merchantId: string, suggestionId: string) {
  const map = readAll()
  delete map[keyOf(merchantId, suggestionId)]
  writeAll(map)
}

/** 取某条建议当前的处置（无则 undefined） */
export function getFeedback(
  merchantId: string,
  suggestionId: string,
): FeedbackEntry | undefined {
  return readAll()[keyOf(merchantId, suggestionId)]
}

/** 取某商家全部反馈（可选按周过滤） */
export function listFeedback(merchantId: string, week?: string): FeedbackEntry[] {
  const all = Object.values(readAll()).filter((e) => e.merchantId === merchantId)
  const scoped = week ? all.filter((e) => e.week === week) : all
  return scoped.sort((a, b) => b.ts - a.ts)
}

/** 某商家（可选某周）的采纳/忽略/改写计数，供回顾卡用 */
export function feedbackStats(merchantId: string, week?: string) {
  const list = listFeedback(merchantId, week)
  return {
    total: list.length,
    adopted: list.filter((e) => e.action === 'adopted').length,
    ignored: list.filter((e) => e.action === 'ignored').length,
    revised: list.filter((e) => e.action === 'revised').length,
  }
}

export type AmTone = 'aggressive' | 'conservative' | 'balanced'

export interface AmToneInsight {
  tone: AmTone
  /** 用于 prompt 的一句话风格指示；样本太少时为 null（不注入） */
  promptHint: string | null
  /** 推断依据，给前端做可解释展示 */
  basis: string
  sample: number
}

/**
 * 从该 AM 对某商家（或全部）的历史反馈，推断其决策风格。
 *  - 改写多 → 偏好按自己的判断调整，AMOS 应给"更具体、留改写空间"的建议
 *  - 忽略多 → 偏保守/不买账，AMOS 应更克制、只给高确定性建议
 *  - 采纳多 → 认同当前调性，保持即可
 * 样本 < 3 条时不下结论（promptHint=null），避免过早个性化。
 */
export function deriveAmTone(merchantId?: string): AmToneInsight {
  const list = merchantId
    ? listFeedback(merchantId)
    : Object.values(readAll())
  const sample = list.length
  const adopted = list.filter((e) => e.action === 'adopted').length
  const ignored = list.filter((e) => e.action === 'ignored').length
  const revised = list.filter((e) => e.action === 'revised').length

  if (sample < 3) {
    return {
      tone: 'balanced',
      promptHint: null,
      basis: `反馈样本不足（${sample} 条），暂不个性化`,
      sample,
    }
  }

  const revisedRate = revised / sample
  const ignoredRate = ignored / sample
  const adoptedRate = adopted / sample

  if (revisedRate >= 0.4) {
    return {
      tone: 'aggressive',
      promptHint:
        'AM 历史上常改写建议、倾向更大胆具体的打法。请把建议写得更具体可执行、敢给明确数字和力度，避免模棱两可的保守措辞。',
      basis: `改写率 ${Math.round(revisedRate * 100)}%（${revised}/${sample}）`,
      sample,
    }
  }
  if (ignoredRate >= 0.4) {
    return {
      tone: 'conservative',
      promptHint:
        'AM 历史上常忽略建议、对不确定建议不买账。请更克制，只给高确定性、低风险的建议，宁少勿滥，每条都要有扎实依据。',
      basis: `忽略率 ${Math.round(ignoredRate * 100)}%（${ignored}/${sample}）`,
      sample,
    }
  }
  return {
    tone: 'balanced',
    promptHint:
      'AM 历史上对建议采纳度较高、认同当前调性。保持当前的建议力度与详略，稳定输出即可。',
    basis: `采纳率 ${Math.round(adoptedRate * 100)}%（${adopted}/${sample}）`,
    sample,
  }
}

/** 给一条建议生成稳定 ID：模块 + 文本归一化哈希 */
export function makeSuggestionId(module: string, text: string): string {
  let h = 0
  const s = `${module}:${text}`
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return `${module}_${(h >>> 0).toString(36)}`
}
