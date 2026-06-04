'use client'
import { useEffect, useMemo, useState } from 'react'
import { listReports, type ReportHistoryEntry } from '@/lib/reportHistory'

interface Props {
  merchantId: string
  /** 当前实时报告的健康分；若提供，会拼到序列末尾，避免"刚生成的还没归档" */
  currentScore?: number
  /** 触发刷新（每次保存归档后父级 +1） */
  refreshToken?: number
  /** 最多展示多少个点（默认 8） */
  limit?: number
}

/**
 * 右栏：健康分走势 sparkline（可折叠）
 * 数据来源：`reportHistory.listReports(merchantId)` —— 取最近 N 期归档分。
 */
export default function HealthScoreTrend({
  merchantId,
  currentScore,
  refreshToken,
  limit = 8,
}: Props) {
  const [open, setOpen] = useState(true)
  const [history, setHistory] = useState<ReportHistoryEntry[]>([])

  useEffect(() => {
    setHistory(listReports(merchantId))
  }, [merchantId, refreshToken])

  // 取最近 N 期，按时间升序绘制
  const points = useMemo(() => {
    const recent = history.slice(0, limit).reverse()
    const series = recent.map((r) => ({
      ts: r.ts,
      score: Math.round(r.healthScore),
    }))
    if (typeof currentScore === 'number') {
      const last = series[series.length - 1]
      // 当前分如果与最后一条 ts 不同，则补到末尾
      if (!last || Math.abs(currentScore - last.score) > 0.01 || true) {
        // 始终把 currentScore 作为最后一个点（最右），避免 stale
        if (last && last.score === currentScore) {
          // 已是同分则不重复加
        } else {
          series.push({ ts: Date.now(), score: Math.round(currentScore) })
        }
      }
    }
    return series.slice(-limit)
  }, [history, currentScore, limit])

  if (points.length < 2) {
    // 至少 2 个点才有"走势"可言；只有 1 期归档时只显示当前分
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-widest mb-2"
        >
          <span>健康分走势</span>
          <span className="text-gray-300">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
            <p className="text-2xl font-semibold text-gray-700">
              {points[0]?.score ?? currentScore ?? '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              暂无历史，再生成一次即可看到走势
            </p>
          </div>
        )}
      </div>
    )
  }

  // sparkline 计算
  const W = 200
  const H = 48
  const PAD = 4
  const min = Math.min(...points.map((p) => p.score))
  const max = Math.max(...points.map((p) => p.score))
  const range = Math.max(1, max - min)
  const xs = points.map((_, i) => PAD + (i * (W - PAD * 2)) / (points.length - 1))
  const ys = points.map(
    (p) => H - PAD - ((p.score - min) / range) * (H - PAD * 2),
  )
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')

  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const delta = last.score - prev.score
  const deltaColor =
    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-gray-500'
  const deltaSign = delta > 0 ? '↑' : delta < 0 ? '↓' : '→'

  // 颜色：当前分高低决定主线颜色
  const stroke =
    last.score >= 80 ? '#10b981' : last.score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-widest mb-2 hover:text-gray-700"
      >
        <span>健康分走势</span>
        <span className="text-gray-300">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-2xl font-semibold text-gray-800">{last.score}</span>
              <span className={`ml-2 text-xs font-medium ${deltaColor}`}>
                {deltaSign} {Math.abs(delta)}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">近 {points.length} 期</p>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
            {/* 趋势线 */}
            <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            {/* 末点 */}
            <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={2.5} fill={stroke} />
            {/* 60 / 80 健康基线 */}
            {[60, 80].map((line) => {
              if (line < min || line > max) return null
              const y = H - PAD - ((line - min) / range) * (H - PAD * 2)
              return (
                <line
                  key={line}
                  x1={PAD}
                  x2={W - PAD}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
              )
            })}
          </svg>

          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
            <span>低 {min}</span>
            <span>高 {max}</span>
          </div>
        </div>
      )}
    </div>
  )
}
