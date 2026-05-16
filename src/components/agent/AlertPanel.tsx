'use client'
import { Alert } from '@/types'

const LEVEL_STYLES = {
  critical: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    title: 'text-red-800',
    body: 'text-red-600',
    dot: 'bg-red-500',
    label: '紧急',
    labelStyle: 'bg-red-100 text-red-700',
  },
  warning: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    title: 'text-amber-800',
    body: 'text-amber-600',
    dot: 'bg-amber-400',
    label: '注意',
    labelStyle: 'bg-amber-100 text-amber-700',
  },
  info: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    title: 'text-blue-800',
    body: 'text-blue-600',
    dot: 'bg-blue-400',
    label: '提示',
    labelStyle: 'bg-blue-100 text-blue-700',
  },
}

interface Props {
  alerts: Alert[]
}

export default function AlertPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 p-4 text-center text-gray-400 text-sm">
        暂无预警
      </div>
    )
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.level] - order[b.level]
  })

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
        商家后台预警（{alerts.length}）
      </div>
      {sorted.map((alert, i) => {
        const s = LEVEL_STYLES[alert.level]
        return (
          <div
            key={i}
            className={`rounded-lg border ${s.border} ${s.bg} p-3`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${s.labelStyle}`}>
                {s.label}
              </span>
              <span className={`text-sm font-medium ${s.title}`}>
                {alert.title}
              </span>
            </div>
            <p className={`text-xs ${s.body} leading-relaxed ml-3.5`}>
              {alert.body}
            </p>
          </div>
        )
      })}
    </div>
  )
}