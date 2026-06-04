'use client'
import { DateRange, defaultDateRange, rangeLabel, fmt } from '@/lib/dateRange'

interface Props {
  value: DateRange
  onChange: (next: DateRange) => void
  disabled?: boolean
}

function shift(value: DateRange, days: number): DateRange {
  const a = new Date(value.start)
  const b = new Date(value.end)
  a.setDate(a.getDate() + days)
  b.setDate(b.getDate() + days)
  return { start: fmt(a), end: fmt(b) }
}

/**
 * 分析周期选择器（视觉与左栏其他模块对齐：
 *  - 标题：uppercase 灰色小字
 *  - 主体：白底 rounded-lg 边框卡片，与 textarea / 选项卡同一语言
 *  - 快捷按钮：chip 风格，命中"本周"时高亮蓝
 */
export default function DateRangePicker({ value, onChange, disabled }: Props) {
  const lbl = rangeLabel(value)
  const thisWeek = defaultDateRange()
  const isThisWeek = value.start === thisWeek.start && value.end === thisWeek.end

  const inputCls =
    'flex-1 min-w-0 text-xs bg-transparent border-0 px-1 py-1.5 focus:outline-none focus:ring-0 disabled:opacity-50 text-gray-700'

  const chipBase =
    'flex-1 px-2 py-1 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-normal'
  const chipStyle = { fontSize: '10px', lineHeight: 1.3 } as const

  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-widest px-2 mb-2">
        分析周期
      </div>

      {/* 主输入卡片 */}
      <div className="rounded-lg border border-gray-200 bg-white px-2 flex items-center gap-1 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-200">
        <input
          type="date"
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
          disabled={disabled}
          className={inputCls}
        />
        <span className="text-gray-300 text-xs shrink-0">→</span>
        <input
          type="date"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          disabled={disabled}
          className={inputCls}
        />
      </div>

      {/* 快捷按钮 chip */}
      <div className="flex items-center gap-1.5 mt-2">
        <button
          onClick={() => onChange(shift(value, -7))}
          disabled={disabled}
          style={chipStyle}
          className={`${chipBase} border-gray-200 text-gray-600 hover:bg-gray-50`}
        >
          ← 上一周
        </button>
        <button
          onClick={() => onChange(defaultDateRange())}
          disabled={disabled}
          style={chipStyle}
          className={`${chipBase} ${
            isThisWeek
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          本周
        </button>
        <button
          onClick={() => onChange(shift(value, 7))}
          disabled={disabled}
          style={chipStyle}
          className={`${chipBase} border-gray-200 text-gray-600 hover:bg-gray-50`}
        >
          下一周 →
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-1.5 px-2">{lbl}</p>
    </div>
  )
}
