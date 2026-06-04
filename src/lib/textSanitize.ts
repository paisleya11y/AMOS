/**
 * 全局清理 LLM 偶尔会偷偷加上的"（来源：XXX）/（依据：XXX）/根据 XXX："等显式归因短语。
 * 归因统一走结构化 evidence 字段 + hover Tooltip 视觉，正文应只保留结论和行动。
 *
 * 设计原则：
 *  - 仅做"显式归因短语"的剥离，不动正文语义
 *  - 兼容中英文括号，兼容"来源 / 出处 / 依据 / 引自 / 参考"等近义词
 *  - 单字段最多剥几次（避免 catastrophic backtracking）
 */
const PATTERNS: RegExp[] = [
  // （来源：xxx） / (来源: xxx) / （引自 xxx）等
  /[（(](?:来源|出处|引自|参考|依据|资料|数据来源)[：: ][^()（）]{1,80}[）)]/g,
  // 行内 "， 来源：xxx" / "； 依据：xxx" 这种逗号分号尾巴
  /[，,；;]\s*(?:来源|出处|引自|参考|依据|数据来源)[：:][^。.；;\n]{1,80}/g,
  // 句首 "根据 XXX，" / "根据《XXX》，"  —— 仅吃到第一个逗号/句号
  /^根据[^，。\n]{1,40}[，,]\s*/,
  /(?<=[。\n])根据[^，。\n]{1,40}[，,]\s*/g,
]

export function stripSourceMentions(text: string | undefined | null): string {
  if (!text) return ''
  let out = text
  for (const re of PATTERNS) out = out.replace(re, '')
  // 收尾：连续标点 / 多空格压缩
  out = out.replace(/\s{2,}/g, ' ').replace(/[，,]\s*[。.]/g, '。').trim()
  return out
}

/**
 * 对任意对象/数组进行深度遍历，把所有字符串字段都过一次 stripSourceMentions。
 * 这样可以在不改 50+ 个渲染点的情况下，统一在数据进入 UI 前剥掉显式归因。
 * 注意：函数仅替换字符串值，不改变结构。
 */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return stripSourceMentions(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDeep(v)
    }
    return out as unknown as T
  }
  return value
}
