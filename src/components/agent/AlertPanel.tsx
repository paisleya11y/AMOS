'use client'
import { useEffect, useState } from 'react'
import { Alert, AgentModule } from '@/types'

const COLLAPSE_KEY = 'amos:alertPanel:collapsed'

/**
 * 告警分级 · 可操作化
 *  - P1（紧急 / critical）：rose，必须立即处理
 *  - P2（注意 / warning）：amber，本周处理
 *  - P3（提示 / info）：blue，下周观察
 *  - 类型 icon：按 alert.module 区分（💰 营收 / 📦 库存 / 🎯 内容 / ⚙️ 投流 / 🏆 标杆）
 *  - 每条带「立即处理」：点击后把这条告警转成 focusNote，重跑对应 agent
 */

const PRIORITY_BY_LEVEL: Record<Alert['level'], { tag: string; chip: string; bg: string; border: string; title: string; body: string; cta: string }> = {
  critical: {
    tag: 'P1',
    chip: 'bg-rose-100 text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    title: 'text-rose-800',
    body: 'text-rose-700',
    cta: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  warning: {
    tag: 'P2',
    chip: 'bg-amber-100 text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'text-amber-800',
    body: 'text-amber-700',
    cta: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    tag: 'P3',
    chip: 'bg-blue-100 text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-800',
    body: 'text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
}

const MODULE_META: Record<AgentModule, { icon: string; label: string }> = {
  diagnose: { icon: '💰', label: '营收' },
  assortment: { icon: '📦', label: '货盘' },
  content: { icon: '🎯', label: '内容' },
  empowerment: { icon: '⚙️', label: '投流' },
  benchmark: { icon: '🏆', label: '标杆' },
}

interface Props {
  alerts: Alert[]
  /** 「立即处理」点击后回传：把告警内容塞到 focusNote 并重跑对应模块 */
  onResolve?: (alert: Alert) => void
  /** 是否禁用 cta（如：正在跑 agent 中） */
  ctaDisabled?: boolean
}

export default function AlertPanel({ alerts, onResolve, ctaDisabled }: Props) {
  const [open, setOpen] = useState(true)
  useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY)
      if (v === '1') setOpen(false)
    } catch {}
  }, [])

  function toggle() {
    setOpen((o) => {
      const next = !o
      try { localStorage.setItem(COLLAPSE_KEY, next ? '0' : '1') } catch {}
      return next
    })
  }

  const stats = {
    critical: alerts.filter((a) => a.level === 'critical').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
    info: alerts.filter((a) => a.level === 'info').length,
  }

  // 折叠态时右上角的紧凑统计 chip
  const headerStats = (
    <span className="text-[10px] text-gray-400">
      {alerts.length === 0 ? (
        '暂无'
      ) : (
        <>
          {stats.critical > 0 && <span className="text-rose-600 font-medium">P1·{stats.critical}</span>}
          {stats.critical > 0 && (stats.warning + stats.info > 0) && ' · '}
          {stats.warning > 0 && <span className="text-amber-600">P2·{stats.warning}</span>}
          {stats.warning > 0 && stats.info > 0 && ' · '}
          {stats.info > 0 && <span className="text-blue-600">P3·{stats.info}</span>}
        </>
      )}
    </span>
  )

  const header = (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
      aria-expanded={open}
      aria-label={open ? '折叠商家后台预警' : '展开商家后台预警'}
    >
      <span className="flex items-baseline gap-1.5">
        <span
          style={{ fontSize: '10px', lineHeight: 1 }}
          className="text-gray-300 inline-block w-3 text-left"
        >
          {open ? '▾' : '▸'}
        </span>
        <span className="text-xs text-gray-500 uppercase tracking-widest">
          商家后台预警{alerts.length > 0 ? `（${alerts.length}）` : ''}
        </span>
      </span>
      {headerStats}
    </button>
  )

  if (alerts.length === 0) {
    return (
      <div>
        {header}
        {open && (
          <div className="rounded-lg border border-gray-100 p-4 text-center text-gray-400 text-sm">
            暂无预警
          </div>
        )}
      </div>
    )
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.level] - order[b.level]
  })

  return (
    <div>
      {header}

      {open && (
        <div className="space-y-2">
          {sorted.map((alert, i) => {
            const s = PRIORITY_BY_LEVEL[alert.level]
            const m = MODULE_META[alert.module] ?? { icon: '·', label: '' }
            return (
              <div
                key={i}
                className={`rounded-lg border ${s.border} ${s.bg} p-3`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.chip}`}>
                    {s.tag}
                  </span>
                  <span className="text-xs" title={`${m.label}相关`}>
                    {m.icon}
                  </span>
                  <span className={`text-sm font-medium ${s.title} flex-1 min-w-0 truncate`}>
                    {alert.title}
                  </span>
                </div>
                <p className={`text-xs ${s.body} leading-relaxed mb-2`}>
                  {alert.body}
                </p>
                {onResolve && (
                  <button
                    onClick={() => onResolve(alert)}
                    disabled={ctaDisabled}
                    className={`w-full text-[11px] py-1 rounded ${s.cta} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    {ctaDisabled ? '正在处理…' : '立即处理 →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
