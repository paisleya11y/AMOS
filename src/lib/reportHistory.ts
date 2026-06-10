import type { FullReport } from '@/types'

/**
 * 报告历史 · localStorage MVP
 *
 * 存储结构：
 *   amos:report:index               -> string[] of keys，按时间倒序
 *   amos:report:item:{merchantId}:{ts} -> 一份完整 FullReport JSON
 *
 * 这里特意不放后端：先用 localStorage 跑通"档案 + 回看"的产品形态，
 * 等业务侧确认了再迁到 KV / DB。
 */

const INDEX_KEY = 'amos:report:index'
const ITEM_PREFIX = 'amos:report:item:'
const MAX_PER_MERCHANT = 20 // 每个商家最多保留 20 份历史

export interface ReportHistoryEntry {
  key: string
  merchantId: string
  merchantName: string
  /** 生成时间（毫秒） */
  ts: number
  /** 健康分（用于在时间轴 hover 上展示） */
  healthScore: number
  /** 报告周期 label（如「2026 年 6 月第 2 周」），用于执行回顾按周对比 */
  week: string
  /** 用户当时填的本周重点（可选） */
  focusNote?: string
  /** 三档告警条数（用于时间轴对比"上次 vs 本次"） */
  alertCounts: {
    critical: number
    warning: number
    info: number
  }
  /** 本次报告里 P1（critical）告警的标题列表，用于在时间轴预览面板里展示要点 */
  criticalTitles: string[]
}

function isBrowser() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function readIndex(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeIndex(keys: string[]) {
  if (!isBrowser()) return
  localStorage.setItem(INDEX_KEY, JSON.stringify(keys))
}

function makeKey(merchantId: string, ts: number) {
  return `${ITEM_PREFIX}${merchantId}:${ts}`
}

function parseKey(key: string): { merchantId: string; ts: number } | null {
  if (!key.startsWith(ITEM_PREFIX)) return null
  const tail = key.slice(ITEM_PREFIX.length)
  const [merchantId, tsStr] = tail.split(':')
  const ts = Number(tsStr)
  if (!merchantId || !Number.isFinite(ts)) return null
  return { merchantId, ts }
}

/**
 * 保存一份报告到 localStorage，返回归档 key。
 * 同一商家超过上限会自动淘汰最早的一份。
 */
export function saveReport(report: FullReport, focusNote?: string): string | null {
  if (!isBrowser()) return null
  const ts = Date.now()
  const key = makeKey(report.merchantId, ts)
  const payload = {
    ...report,
    _ts: ts,
    _focusNote: focusNote,
  }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
  } catch (err) {
    console.warn('[reportHistory] 写入失败（可能超限）', err)
    return null
  }

  const idx = readIndex()
  idx.unshift(key)

  // 同商家超过上限的旧 key 淘汰
  const merchantKeys = idx.filter((k) => parseKey(k)?.merchantId === report.merchantId)
  if (merchantKeys.length > MAX_PER_MERCHANT) {
    const drop = merchantKeys.slice(MAX_PER_MERCHANT)
    drop.forEach((k) => {
      try { localStorage.removeItem(k) } catch {}
    })
    const dropSet = new Set(drop)
    const filtered = idx.filter((k) => !dropSet.has(k))
    writeIndex(filtered)
  } else {
    writeIndex(idx)
  }

  return key
}

/**
 * 列出某商家的所有归档（按时间倒序）。
 */
export function listReports(merchantId: string): ReportHistoryEntry[] {
  if (!isBrowser()) return []
  const idx = readIndex()
  const out: ReportHistoryEntry[] = []
  for (const k of idx) {
    const parsed = parseKey(k)
    if (!parsed || parsed.merchantId !== merchantId) continue
    try {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw) as FullReport & { _ts?: number; _focusNote?: string }
      const alerts = obj.popupAlerts ?? []
      const criticalTitles = alerts
        .filter((a) => a.level === 'critical')
        .map((a) => a.title)
      out.push({
        key: k,
        merchantId: parsed.merchantId,
        merchantName: obj.merchantName ?? '',
        ts: obj._ts ?? parsed.ts,
        healthScore: obj.diagnose?.healthScore ?? 0,
        week: obj.week ?? '',
        focusNote: obj._focusNote,
        alertCounts: {
          critical: alerts.filter((a) => a.level === 'critical').length,
          warning: alerts.filter((a) => a.level === 'warning').length,
          info: alerts.filter((a) => a.level === 'info').length,
        },
        criticalTitles,
      })
    } catch {
      // 跳过坏数据
    }
  }
  return out.sort((a, b) => b.ts - a.ts)
}

/**
 * 取一份归档报告（用于时间轴点击回看）。
 */
export function loadReport(key: string): FullReport | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw) as FullReport
    return obj
  } catch {
    return null
  }
}

export function deleteReport(key: string) {
  if (!isBrowser()) return
  try { localStorage.removeItem(key) } catch {}
  const idx = readIndex().filter((k) => k !== key)
  writeIndex(idx)
}
