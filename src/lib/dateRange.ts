/**
 * 报告分析周期工具。
 * 默认周期 = 本周一 ~ 本周日（用户本地时区）。
 * 所有 Agent 的 prompt 顶部都会注入这个 range，让 LLM 知道"这次说的是哪段时间"。
 */

export interface DateRange {
  /** YYYY-MM-DD */
  start: string
  /** YYYY-MM-DD */
  end: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 取指定日期所在自然周的周一 */
function startOfWeek(d: Date): Date {
  const out = new Date(d)
  const day = out.getDay() // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day // 让周一为起点
  out.setDate(out.getDate() + diff)
  out.setHours(0, 0, 0, 0)
  return out
}

/** 默认 = 本周一 ~ 本周日 */
export function defaultDateRange(now: Date = new Date()): DateRange {
  const start = startOfWeek(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: fmt(start), end: fmt(end) }
}

/** 给定 range，返回天数（含端点） */
export function rangeDays(r: DateRange): number {
  const a = new Date(r.start)
  const b = new Date(r.end)
  return Math.round((b.getTime() - a.getTime()) / 86400_000) + 1
}

/** 渲染成中文："2026-06-01 ~ 06-07（7 天）" */
export function rangeLabel(r: DateRange): string {
  if (!r?.start || !r?.end) return ''
  const days = rangeDays(r)
  // 同月内简写后段：2026-06-01 ~ 06-07
  const sameMonth = r.start.slice(0, 7) === r.end.slice(0, 7)
  const endShort = sameMonth ? r.end.slice(5) : r.end
  return `${r.start} ~ ${endShort}（${days} 天）`
}

/** 给 prompt 用的一句话 */
export function rangePromptLine(r?: DateRange): string {
  if (!r?.start || !r?.end) return ''
  return `【分析周期】${r.start} ~ ${r.end}（${rangeDays(r)} 天）`
}

/**
 * 把分析周期渲染成「2026 年 6 月第 1 周」这种自然中文 label。
 * 周编号 = 该周起始日落在所在月的第几周（按自然月切分，周一为起点）。
 * 如果起止跨月，按 start 所在月计。
 */
export function rangeWeekLabel(r?: DateRange): string {
  if (!r?.start) {
    const now = new Date()
    return rangeWeekLabel(defaultDateRange(now))
  }
  const start = new Date(r.start)
  const year = start.getFullYear()
  const month = start.getMonth() + 1
  // 该月 1 号
  const firstOfMonth = new Date(year, start.getMonth(), 1)
  // 该月 1 号所在周的周一（可能在上个月）
  const firstWeekMonday = startOfWeek(firstOfMonth)
  const diffDays = Math.round(
    (start.getTime() - firstWeekMonday.getTime()) / 86400_000
  )
  const weekOfMonth = Math.floor(diffDays / 7) + 1
  return `${year} 年 ${month} 月第 ${weekOfMonth} 周`
}
