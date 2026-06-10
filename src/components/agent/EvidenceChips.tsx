'use client'
import { createContext, useContext } from 'react'
import { Evidence } from '@/types'
import Tooltip from './Tooltip'
import { isEvidenceGrounded } from '@/lib/evidenceCheck'

/**
 * 事实语料 context：由 ReportCard 在根部提供本次报告的真实事实语料，
 * 让任意层级的 EvidenceChips 自行核验每条 evidence 是否"有据"，
 * 无需逐层透传 props。未提供时（context=null）跳过校验，全部按已核实展示。
 */
export type FactCorpus = { phrases: string[]; numbers: Set<string> }
export const EvidenceCorpusContext = createContext<FactCorpus | null>(null)

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
  const corpus = useContext(EvidenceCorpusContext)
  if (!evidence || evidence.length === 0) return null

  const triggerSize = compact ? 'text-[10px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'
  const wrap = compact ? 'mt-1' : 'mt-1.5'

  // 校验每条 evidence 是否有据（corpus 缺省时一律按已核实）
  const checked = evidence.map((e) => ({
    e,
    grounded: corpus ? isEvidenceGrounded(e, corpus) : true,
  }))
  const verifiedCount = checked.filter((c) => c.grounded).length
  const unverifiedCount = checked.length - verifiedCount

  return (
    <div className={`${wrap} flex`}>
      <Tooltip
        interactive
        maxWidth={340}
        content={
          <div className="space-y-1.5">
            <div className="text-gray-300 text-[10px] uppercase tracking-wider">
              来源 · {verifiedCount} 条已核实
              {unverifiedCount > 0 && (
                <span className="text-amber-300"> · {unverifiedCount} 条待核实</span>
              )}
            </div>
            <ul className="space-y-1">
              {checked.map(({ e, grounded }, i) => {
                const s = TYPE_STYLE[e.type] ?? TYPE_STYLE.knowledge
                return (
                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                    <span
                      className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${grounded ? s.dot : 'bg-gray-500'}`}
                    />
                    <span className={grounded ? '' : 'opacity-60'}>
                      <span className="text-gray-300">{s.tip}</span>
                      <span className="mx-1 text-gray-500">·</span>
                      <span className="text-white font-medium">{e.label}</span>
                      {!grounded && (
                        <span className="ml-1 text-amber-300 text-[10px]">· 待核实</span>
                      )}
                      {e.detail && (
                        <span className="block text-gray-200 mt-0.5">{e.detail}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            {unverifiedCount > 0 && (
              <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-700 leading-relaxed">
                「待核实」= 该来源未能对上本次报告的真实数据，仅供参考。
              </div>
            )}
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
