'use client'
import { useEffect, useMemo, useState } from 'react'
import { listReports, deleteReport, ReportHistoryEntry } from '@/lib/reportHistory'

interface Props {
  merchantId: string
  /** 当前正在展示的报告（用于高亮）；live = 刚跑出来还没存的实时报告 */
  activeKey: string | 'live' | null
  /** 当前实时报告的健康分（live 节点用） */
  liveScore?: number
  /** 当前实时报告的本周重点（live 节点 hover/预览用） */
  liveFocusNote?: string
  /** 当前实时报告的告警分级数（用于预览面板 vs 上次对比） */
  liveAlertCounts?: { critical: number; warning: number; info: number }
  /** 当前实时报告的 P1 告警标题（最多展示 2 条） */
  liveCriticalTitles?: string[]
  onPick: (key: string) => void
  onPickLive: () => void
  /** 当被删除的归档恰好是当前激活的 activeKey 时，通知父级清空选中态 */
  onActiveDeleted?: () => void
  /** 外部触发刷新（保存新报告时让父组件 +1） */
  refreshToken?: number
}

function fmtTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtShort(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function scoreText(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score > 0) return 'text-rose-600'
  return 'text-gray-400'
}

function scoreDot(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score > 0) return 'bg-rose-500'
  return 'bg-gray-300'
}

interface Node {
  key: string | 'live'
  ts: number
  score: number
  focusNote?: string
  alertCounts: { critical: number; warning: number; info: number }
  criticalTitles: string[]
  isLive: boolean
}

const COLLAPSE_KEY = 'amos:timeline:collapsed'

export default function ReportTimeline({
  merchantId,
  activeKey,
  liveScore,
  liveFocusNote,
  liveAlertCounts,
  liveCriticalTitles,
  onPick,
  onPickLive,
  onActiveDeleted,
  refreshToken,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    setMounted(true)
    try {
      const v = localStorage.getItem(COLLAPSE_KEY)
      if (v === '1') setCollapsed(true)
    } catch {}
  }, [])

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const [nudge, setNudge] = useState(0)
  const entries = useMemo<ReportHistoryEntry[]>(
    () => (mounted ? listReports(merchantId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mounted, merchantId, refreshToken, nudge],
  )

  // 升序：左旧右新（更符合"时间从左到右流动"的直觉）
  const nodes = useMemo<Node[]>(() => {
    const archived: Node[] = [...entries]
      .sort((a, b) => a.ts - b.ts)
      .map((e) => ({
        key: e.key,
        ts: e.ts,
        score: Math.round(e.healthScore),
        focusNote: e.focusNote,
        alertCounts: e.alertCounts ?? { critical: 0, warning: 0, info: 0 },
        criticalTitles: e.criticalTitles ?? [],
        isLive: false,
      }))
    if (activeKey === 'live' && typeof liveScore === 'number') {
      archived.push({
        key: 'live',
        ts: Date.now(),
        score: Math.round(liveScore),
        focusNote: liveFocusNote,
        alertCounts: liveAlertCounts ?? { critical: 0, warning: 0, info: 0 },
        criticalTitles: liveCriticalTitles ?? [],
        isLive: true,
      })
    }
    return archived
  }, [entries, activeKey, liveScore, liveFocusNote, liveAlertCounts, liveCriticalTitles])

  function removeOne(key: string, ts: number) {
    const label = fmtTime(ts)
    if (!confirm(`删除 ${label} 这份归档报告？此操作不可恢复。`)) return
    deleteReport(key)
    setNudge((n) => n + 1)
    if (activeKey === key) {
      onActiveDeleted?.()
    }
  }

  if (!mounted) return null
  if (nodes.length === 0) return null

  const activeIndex = nodes.findIndex((n) => n.key === activeKey)
  const active = activeIndex >= 0 ? nodes[activeIndex] : null
  const prev = activeIndex > 0 ? nodes[activeIndex - 1] : null
  const scoreDelta = active && prev ? active.score - prev.score : null

  // alert delta —— vs 上一次
  const alertDelta = active && prev
    ? {
        critical: active.alertCounts.critical - prev.alertCounts.critical,
        warning: active.alertCounts.warning - prev.alertCounts.warning,
        info: active.alertCounts.info - prev.alertCounts.info,
      }
    : null

  function deltaSpan(delta: number, label: string, color: string) {
    if (delta === 0) {
      return (
        <span className="text-[10px] text-gray-400">
          {label} {delta > 0 ? '+' : ''}0
        </span>
      )
    }
    return (
      <span className={`text-[10px] font-medium ${color}`}>
        {label} {delta > 0 ? '+' : ''}{delta}
      </span>
    )
  }

  // 折叠态下顶栏右侧的紧凑摘要：当前选中分数 + 总份数
  const collapsedSummary = collapsed && active ? (
    <span className="flex items-center gap-1.5">
      <span
        className={`block w-2 h-2 rounded-full ${
          active.isLive ? 'bg-blue-500' : scoreDot(active.score)
        }`}
      />
      <span
        style={{ fontSize: '10px', lineHeight: 1.3 }}
        className={active.isLive ? 'text-blue-700' : scoreText(active.score)}
      >
        {active.isLive ? '最新' : fmtShort(active.ts)} · {active.score}
      </span>
    </span>
  ) : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 overflow-hidden">
      {/* 顶栏：可点击折叠/展开整个时间轴 */}
      <div className={`px-4 pt-3 pb-2 flex items-center justify-between ${collapsed ? '' : 'border-b border-gray-100'}`}>
        <button
          onClick={toggleCollapsed}
          className="flex items-baseline gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开时间轴' : '折叠时间轴'}
        >
          <span
            style={{ fontSize: '10px', lineHeight: 1 }}
            className="text-gray-300 mr-0.5 inline-block w-3 text-left"
          >
            {collapsed ? '▸' : '▾'}
          </span>
          <span className="text-xs font-medium text-gray-700">历史报告 · 时间轴</span>
          <span className="text-[10px] text-gray-400">
            {entries.length} 份归档{!collapsed && ' · 最多保留 20 份'}
          </span>
        </button>
        <div className="flex items-center gap-3">
          {collapsedSummary}
          {!collapsed && (
            <span className="text-[10px] text-gray-400">点节点回看任一份归档报告</span>
          )}
          {!collapsed && entries.length > 0 && (
            <button
              onClick={() => {
                if (confirm('清空该商家的全部历史报告？')) {
                  entries.forEach((e) => deleteReport(e.key))
                  setNudge((n) => n + 1)
                }
              }}
              className="text-[10px] text-gray-400 hover:text-rose-500 px-1.5"
              title="清空历史"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
      {/* 上半 · 极简标尺：横向滚动的"圆点 + 日期" */}
      <div className="px-4 pt-3 pb-2 overflow-x-auto">
        <div className="flex items-end gap-0 min-w-max">
          {nodes.map((n, i) => {
            const isActive = activeKey === n.key
            return (
              <div key={String(n.key) + n.ts} className="flex items-center">
                <div className="relative group/node">
                  {/* 节点删除按钮 —— hover 时浮现，仅归档节点支持，live 节点不显示 */}
                  {!n.isLive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeOne(n.key as string, n.ts)
                      }}
                      title="删除此份归档"
                      aria-label="删除此份归档"
                      className="absolute -top-0.5 right-0 w-4 h-4 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity z-10 shadow-sm"
                      style={{ fontSize: '10px', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                <button
                  onClick={() => (n.isLive ? onPickLive() : onPick(n.key as string))}
                  className="group flex flex-col items-center px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  title={n.isLive ? '最新（未归档）' : fmtTime(n.ts)}
                >
                  {/* 分数标签 —— active 时显示 */}
                  <span
                    style={{ fontSize: '10px', lineHeight: 1.2 }}
                    className={`mb-1 font-semibold transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                    } ${n.isLive ? 'text-blue-600' : scoreText(n.score)}`}
                  >
                    {n.score}
                  </span>

                  {/* 节点圆点 */}
                  {n.isLive ? (
                    <span className="relative flex items-center justify-center">
                      <span className="absolute w-3.5 h-3.5 rounded-full bg-blue-400 opacity-30 animate-ping" />
                      <span
                        className={`relative block rounded-full bg-blue-500 ${
                          isActive
                            ? 'w-3 h-3 ring-2 ring-blue-200'
                            : 'w-2.5 h-2.5'
                        }`}
                      />
                    </span>
                  ) : (
                    <span
                      className={`block rounded-full ${scoreDot(n.score)} transition-all ${
                        isActive
                          ? 'w-3 h-3 ring-2 ring-offset-1 ring-gray-300'
                          : 'w-2 h-2 group-hover:w-2.5 group-hover:h-2.5'
                      }`}
                    />
                  )}

                  {/* 日期 */}
                  <span
                    style={{ fontSize: '10px', lineHeight: 1.3 }}
                    className={`mt-1.5 ${
                      isActive
                        ? n.isLive ? 'text-blue-700 font-medium' : 'text-gray-700 font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {n.isLive ? '最新' : fmtShort(n.ts)}
                  </span>
                </button>
                </div>

                {/* 节点之间的连接线 —— 极细灰线（非曲线），仅作"时间轴"暗示 */}
                {i < nodes.length - 1 && (
                  <span className="block w-4 h-px bg-gray-200" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 下半 · 当前选中报告的概要面板 */}
      {active ? (
        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/40 to-white px-4 py-3">
          <div className="flex items-start gap-4">
            {/* 左：分数大块 */}
            <div className="shrink-0 flex flex-col items-start">
              <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-gray-400">
                {active.isLive ? '最新（未归档）' : fmtTime(active.ts)}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-2xl font-semibold leading-none ${
                    active.isLive ? 'text-blue-600' : scoreText(active.score)
                  }`}
                >
                  {active.score}
                </span>
                {scoreDelta !== null && (
                  <span
                    style={{ fontSize: '10px', lineHeight: 1.3 }}
                    className={`font-medium ${
                      scoreDelta > 0 ? 'text-emerald-600' : scoreDelta < 0 ? 'text-rose-600' : 'text-gray-500'
                    }`}
                  >
                    {scoreDelta > 0 ? '↑' : scoreDelta < 0 ? '↓' : '→'} {Math.abs(scoreDelta)}
                  </span>
                )}
              </div>
              {prev && (
                <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-gray-400 mt-0.5">
                  vs 上次 {prev.score}
                </span>
              )}
            </div>

            {/* 中：本次重点 + 与上次差异 */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-gray-400 mr-1.5">
                  本次重点
                </span>
                {active.focusNote ? (
                  <span style={{ fontSize: '11px', lineHeight: 1.5 }} className="text-gray-700">
                    {active.focusNote}
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', lineHeight: 1.5 }} className="text-gray-400 italic">
                    本次未填写
                  </span>
                )}
              </div>

              {/* 与上次的告警变化 + 本次告警计数 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-gray-400">
                    告警
                  </span>
                  <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-rose-600 font-medium">
                    P1·{active.alertCounts.critical}
                  </span>
                  <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-amber-600 font-medium">
                    P2·{active.alertCounts.warning}
                  </span>
                  <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-blue-600 font-medium">
                    P3·{active.alertCounts.info}
                  </span>
                </div>
                {alertDelta && (alertDelta.critical !== 0 || alertDelta.warning !== 0 || alertDelta.info !== 0) && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                    <span style={{ fontSize: '10px', lineHeight: 1.3 }} className="text-gray-400">
                      vs 上次
                    </span>
                    {deltaSpan(alertDelta.critical, 'P1', alertDelta.critical > 0 ? 'text-rose-600' : 'text-emerald-600')}
                    {deltaSpan(alertDelta.warning, 'P2', alertDelta.warning > 0 ? 'text-amber-600' : 'text-emerald-600')}
                    {deltaSpan(alertDelta.info, 'P3', alertDelta.info > 0 ? 'text-blue-600' : 'text-emerald-600')}
                  </div>
                )}
              </div>

              {/* 本次的 P1 关键告警标题（最多 2 条），帮 AM 一眼看出"这次是为什么跑的" */}
              {active.criticalTitles.length > 0 && (
                <div className="flex items-start gap-1.5 pt-0.5">
                  <span
                    style={{ fontSize: '10px', lineHeight: 1.3 }}
                    className="text-gray-400 shrink-0 mt-0.5"
                  >
                    P1
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {active.criticalTitles.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        style={{ fontSize: '10px', lineHeight: 1.4 }}
                        className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100"
                      >
                        {t}
                      </span>
                    ))}
                    {active.criticalTitles.length > 2 && (
                      <span style={{ fontSize: '10px', lineHeight: 1.4 }} className="text-gray-400">
                        +{active.criticalTitles.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 右：回看状态徽标 + 删除此份归档 */}
            <div className="shrink-0 flex flex-col items-end gap-1">
              {active.isLive ? (
                <span
                  style={{ fontSize: '10px', lineHeight: 1.3 }}
                  className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                >
                  当前实时
                </span>
              ) : (
                <>
                  <span
                    style={{ fontSize: '10px', lineHeight: 1.3 }}
                    className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                  >
                    回看模式
                  </span>
                  <button
                    onClick={() => removeOne(active.key as string, active.ts)}
                    style={{ fontSize: '10px', lineHeight: 1.3 }}
                    className="text-gray-400 hover:text-rose-600 underline-offset-2 hover:underline"
                    title="删除这份归档"
                  >
                    删除此份
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3">
          <span style={{ fontSize: '11px', lineHeight: 1.5 }} className="text-gray-400">
            点击上方任一节点回看那一次的完整报告
          </span>
        </div>
      )}
        </>
      )}
    </div>
  )
}
