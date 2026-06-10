'use client'
import { useEffect, useState } from 'react'
import { MerchantData } from '@/types'
import { getTier, TIER_META, type Tier } from '@/lib/triage'

const STAGE_LABELS = {
  cold_start: { label: '冷启期', style: 'bg-gray-100 text-gray-600' },
  growth: { label: '成长期', style: 'bg-blue-100 text-blue-700' },
  mature: { label: '成熟期', style: 'bg-green-100 text-green-700' },
}

const TIER_ORDER: Tier[] = ['big', 'mid', 'tail']
const COLLAPSE_KEY = 'amos:merchantList:collapsed'

function HealthDot({ score }: { score?: number }) {
  if (!score) return <span className="w-2 h-2 rounded-full bg-gray-300" />
  if (score >= 80) return <span className="w-2 h-2 rounded-full bg-green-500" />
  if (score >= 60) return <span className="w-2 h-2 rounded-full bg-amber-400" />
  return <span className="w-2 h-2 rounded-full bg-red-500" />
}

interface Props {
  merchants: MerchantData[]
  selected: string
  healthScores: Record<string, number>
  onSelect: (id: string) => void
}

export default function MerchantSelector({
  merchants,
  selected,
  healthScores,
  onSelect,
}: Props) {
  // 整个列表折叠 + 各分层折叠状态，持久化到 localStorage
  const [listOpen, setListOpen] = useState(true)
  const [openTiers, setOpenTiers] = useState<Record<Tier, boolean>>({
    big: true,
    mid: true,
    tail: false, // 长尾默认收起，减少干扰
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (typeof saved.listOpen === 'boolean') setListOpen(saved.listOpen)
        if (saved.openTiers) setOpenTiers((p) => ({ ...p, ...saved.openTiers }))
      }
    } catch {}
  }, [])

  function persist(next: { listOpen?: boolean; openTiers?: Record<Tier, boolean> }) {
    try {
      const cur = { listOpen, openTiers, ...next }
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(cur))
    } catch {}
  }

  function toggleList() {
    setListOpen((o) => {
      const v = !o
      persist({ listOpen: v })
      return v
    })
  }

  function toggleTier(t: Tier) {
    setOpenTiers((prev) => {
      const next = { ...prev, [t]: !prev[t] }
      persist({ openTiers: next })
      return next
    })
  }

  // 分组
  const grouped: Record<Tier, MerchantData[]> = { big: [], mid: [], tail: [] }
  merchants.forEach((m) => grouped[getTier(m.monthlyGMV)].push(m))

  function renderItem(m: MerchantData) {
    const isSelected = m.id === selected
    const score = healthScores[m.id]
    const stage = STAGE_LABELS[m.stage]
    return (
      <button
        key={m.id}
        onClick={() => onSelect(m.id)}
        className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
          isSelected
            ? 'bg-blue-50 border border-blue-200'
            : 'hover:bg-gray-50 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <HealthDot score={score} />
          <span className="text-sm font-medium text-gray-900 truncate">{m.name}</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className={`text-xs px-1.5 py-0.5 rounded ${stage.style}`}>{stage.label}</span>
          <span className="text-xs text-gray-400">{m.category}</span>
          {score && <span className="text-xs text-gray-500 ml-auto">{score}分</span>}
        </div>
      </button>
    )
  }

  return (
    <div>
      {/* 列表总开关 */}
      <button
        onClick={toggleList}
        className="w-full flex items-center justify-between px-2 mb-2 hover:opacity-80 transition-opacity"
        aria-expanded={listOpen}
      >
        <span className="flex items-baseline gap-1.5">
          <span style={{ fontSize: '10px', lineHeight: 1 }} className="text-gray-300 inline-block w-3 text-left">
            {listOpen ? '▾' : '▸'}
          </span>
          <span className="text-xs text-gray-500 uppercase tracking-widest">商家列表</span>
          <span className="text-[10px] text-gray-400">{merchants.length}</span>
        </span>
      </button>

      {listOpen && (
        <div className="space-y-3">
          {TIER_ORDER.map((tier) => {
            const rows = grouped[tier]
            if (rows.length === 0) return null
            const open = openTiers[tier]
            return (
              <div key={tier}>
                {/* 分层小标题（可折叠） */}
                <button
                  onClick={() => toggleTier(tier)}
                  className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded transition-colors"
                  aria-expanded={open}
                >
                  <span className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: '9px', lineHeight: 1 }} className="text-gray-300 inline-block w-2.5 text-left">
                      {open ? '▾' : '▸'}
                    </span>
                    <span className="text-[11px] font-medium text-gray-600">{TIER_META[tier].label}</span>
                    <span className="text-[10px] text-gray-400">{rows.length} 家</span>
                  </span>
                </button>
                {open && <div className="space-y-1 mt-1">{rows.map(renderItem)}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
