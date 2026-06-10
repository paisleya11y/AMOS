'use client'
import { useMemo } from 'react'
import { MerchantData } from '@/types'
import {
  buildTriage,
  groupByTier,
  TIER_META,
  SIGNAL_META,
  type Tier,
  type TriageItem,
} from '@/lib/triage'

interface Props {
  merchants: MerchantData[]
  /** 点击某商家 → 进入其单商家报告视图 */
  onPick: (merchantId: string) => void
  /** AM 名称（抬头展示，可选） */
  amName?: string
}

const STAGE_LABEL: Record<string, string> = {
  cold_start: '冷启期',
  growth: '成长期',
  mature: '成熟期',
}

const TIER_ORDER: Tier[] = ['big', 'mid', 'tail']

function fmtGMV(g: number) {
  if (g >= 10000) return `$${(g / 10000).toFixed(1)}万`
  return `$${(g / 1000).toFixed(1)}k`
}

function healthColor(h: number) {
  if (h >= 80) return 'text-emerald-600'
  if (h >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

export default function TriageBoard({ merchants, onPick, amName = 'AM' }: Props) {
  const { grouped, redCount, topItem } = useMemo(() => {
    const items = buildTriage(merchants)
    const grouped = groupByTier(items)
    const redCount = items.filter((i) => i.signal === 'red').length
    const topItem = items[0] ?? null
    return { grouped, redCount, topItem }
  }, [merchants])

  return (
    <div className="max-w-5xl mx-auto">
      {/* 抬头 */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-gray-800">本周经营分诊台</h1>
          <span className="text-xs text-gray-400">
            {amName} · 共 {merchants.length} 家在管
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          排序逻辑：优先按 GMV 量级分层（头部 / 腰部 / 长尾），保障高价值客户的服务优先级；同一层级内，按「健康度下行风险」加权排序，将健康分偏低且环比恶化的商家前置。
          {redCount > 0 && (
            <span className="text-rose-600 font-medium">
              {' '}本周 {redCount} 家需立即介入。
            </span>
          )}
        </p>
      </div>

      {/* 本周第一优先 · 大卡 */}
      {topItem && (
        <button
          onClick={() => onPick(topItem.merchant.id)}
          className="w-full text-left mb-6 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-rose-500 font-medium">
              本周第一优先 · 先看这家
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 ${SIGNAL_META[topItem.signal].text}`}>
              {SIGNAL_META[topItem.signal].label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${SIGNAL_META[topItem.signal].dot}`} />
            <span className="text-base font-semibold text-gray-800">
              {topItem.merchant.name}
            </span>
            <span className="text-xs text-gray-400">
              {TIER_META[topItem.tier].label} · {topItem.merchant.category}
            </span>
          </div>
          <div className="flex items-center gap-5 mt-2 text-xs">
            <span className="text-gray-500">
              月 GMV <span className="font-medium text-gray-700">{fmtGMV(topItem.merchant.monthlyGMV)}</span>
            </span>
            <span className="text-gray-500">
              健康分 <span className={`font-semibold ${healthColor(topItem.health)}`}>{topItem.health}</span>
            </span>
            <span className="text-gray-500">
              周环比{' '}
              <span className={topItem.wow < 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                {topItem.wow > 0 ? '+' : ''}{topItem.wow}%
              </span>
            </span>
            <span className="ml-auto text-rose-600 font-medium">进入诊断 →</span>
          </div>
        </button>
      )}

      {/* 分层列表 */}
      <div className="space-y-6">
        {TIER_ORDER.map((tier) => {
          const rows = grouped[tier]
          if (!rows || rows.length === 0) return null
          return (
            <div key={tier}>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <span className="text-xs font-semibold text-gray-700">
                  {TIER_META[tier].label}
                </span>
                <span className="text-[10px] text-gray-400">
                  {TIER_META[tier].hint} · {rows.length} 家
                </span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                {rows.map((it) => (
                  <TriageRow key={it.merchant.id} item={it} onPick={onPick} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TriageRow({ item, onPick }: { item: TriageItem; onPick: (id: string) => void }) {
  const { merchant: m, health, signal, wow } = item
  const sig = SIGNAL_META[signal]
  return (
    <button
      onClick={() => onPick(m.id)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      {/* 信号灯 */}
      <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${sig.dot}`} title={sig.label} />

      {/* 商家名 + 子品类 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
          <span className="text-[10px] text-gray-400 shrink-0">
            {STAGE_LABEL[m.stage] ?? m.stage}
          </span>
        </div>
        <div className="text-[10px] text-gray-400 truncate">
          {m.subCategoryTags.slice(0, 3).join(' · ')}
        </div>
      </div>

      {/* 月 GMV */}
      <div className="shrink-0 w-20 text-right">
        <div className="text-[10px] text-gray-400">月 GMV</div>
        <div className="text-xs font-medium text-gray-700">{fmtGMV(m.monthlyGMV)}</div>
      </div>

      {/* 健康分 */}
      <div className="shrink-0 w-14 text-right">
        <div className="text-[10px] text-gray-400">健康</div>
        <div className={`text-sm font-semibold ${healthColor(health)}`}>{health}</div>
      </div>

      {/* 周环比 */}
      <div className="shrink-0 w-16 text-right">
        <div className="text-[10px] text-gray-400">周环比</div>
        <div className={`text-xs font-medium ${wow < 0 ? 'text-rose-600' : wow > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
          {wow > 0 ? '↑' : wow < 0 ? '↓' : '→'} {Math.abs(wow)}%
        </div>
      </div>

      {/* 介入提示 */}
      <div className="shrink-0 w-20 text-right">
        <span className={`text-[10px] ${sig.text}`}>{sig.label}</span>
      </div>
    </button>
  )
}
