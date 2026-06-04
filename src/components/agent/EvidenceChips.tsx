'use client'
import { Evidence } from '@/types'
import Tooltip from './Tooltip'

const TYPE_STYLE: Record<Evidence['type'], { bg: string; dot: string; tip: string }> = {
  sku:       { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400', tip: 'SKU' },
  metric:    { bg: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-400',    tip: '数据' },
  benchmark: { bg: 'bg-purple-50 text-purple-700',   dot: 'bg-purple-400',  tip: '标杆' },
  knowledge: { bg: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400',   tip: '知识' },
  trend:     { bg: 'bg-rose-50 text-rose-700',       dot: 'bg-rose-400',    tip: '趋势' },
  calendar:  { bg: 'bg-indigo-50 text-indigo-700',   dot: 'bg-indigo-400',  tip: '档期' },
}

interface Props {
  evidence?: Evidence[]
  /** 紧凑模式：触发标签字号更小（用于选题等密集列表） */
  compact?: boolean
}

/**
 * 报告里只保留**一个"来源"小标签作为入口**（不再罗列彩色 chip 一长串）。
 * 鼠标 hover 到 "来源" 上时弹出深色 Tooltip，里面展示：
 *   - 类型小圆点 + 标签
 *   - 该条证据的具体 detail
 * Tooltip 的内容是 selectable + interactive，鼠标可以从标签移过去选中并复制文字。
 */
export default function EvidenceChips({ evidence, compact }: Props) {
  if (!evidence || evidence.length === 0) return null

  const triggerSize = compact ? 'text-[10px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'
  const wrap = compact ? 'mt-1' : 'mt-1.5'

  return (
    <div className={`${wrap} flex`}>
      <Tooltip
        interactive
        maxWidth={340}
        content={
          <div className="space-y-1.5">
            <div className="text-gray-300 text-[10px] uppercase tracking-wider">
              来源 · {evidence.length} 条
            </div>
            <ul className="space-y-1">
              {evidence.map((e, i) => {
                const s = TYPE_STYLE[e.type] ?? TYPE_STYLE.knowledge
                return (
                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                    <span>
                      <span className="text-gray-300">{s.tip}</span>
                      <span className="mx-1 text-gray-500">·</span>
                      <span className="text-white font-medium">{e.label}</span>
                      {e.detail && (
                        <span className="block text-gray-200 mt-0.5">{e.detail}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        }
      >
        <span
          className={`${triggerSize} text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded inline-flex items-center gap-1 cursor-help`}
        >
          <span>来源</span>
          <span className="text-gray-300">· {evidence.length}</span>
        </span>
      </Tooltip>
    </div>
  )
}
