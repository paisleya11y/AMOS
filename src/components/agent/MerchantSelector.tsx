'use client'
import { MerchantData } from '@/types'

const STAGE_LABELS = {
  cold_start: { label: '冷启期', style: 'bg-gray-100 text-gray-600' },
  growth: { label: '成长期', style: 'bg-blue-100 text-blue-700' },
  mature: { label: '成熟期', style: 'bg-green-100 text-green-700' },
}

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
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500 uppercase tracking-widest px-2 mb-3">
        商家列表
      </div>
      {merchants.map((m) => {
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
              <span className="text-sm font-medium text-gray-900 truncate">
                {m.name}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className={`text-xs px-1.5 py-0.5 rounded ${stage.style}`}>
                {stage.label}
              </span>
              <span className="text-xs text-gray-400">{m.category}</span>
              {score && (
                <span className="text-xs text-gray-500 ml-auto">
                  {score}分
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}