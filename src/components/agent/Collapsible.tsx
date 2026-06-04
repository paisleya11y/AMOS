'use client'
import { useState, ReactNode } from 'react'

interface Props {
  title: ReactNode
  /** 标题右侧附加内容（小标签、计数等） */
  badge?: ReactNode
  defaultOpen?: boolean
  /** 标题左侧色条 hex 或 tailwind class，例 'bg-blue-500' */
  accent?: string
  /** 不带外层 card 边框（用作子区块时） */
  flat?: boolean
  children: ReactNode
}

/**
 * 通用折叠卡片：标题点击展开/收起，箭头跟随状态翻转。
 * 顶层报告大卡（Assortment / Content / Empowerment / Benchmark）和内容子区块复用。
 */
export default function Collapsible({
  title,
  badge,
  defaultOpen = false,
  accent = 'bg-gray-300',
  flat = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const wrapperCls = flat
    ? 'border-b border-gray-100 last:border-b-0'
    : 'rounded-xl border border-gray-200'

  return (
    <div className={wrapperCls}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        className={`w-full flex items-center gap-2 cursor-pointer ${
          flat ? 'py-2.5 px-1' : 'p-5'
        } hover:bg-gray-50 transition-colors text-left select-none`}
      >
        <span className={`w-1.5 h-4 ${accent} rounded-full flex-shrink-0`} />
        <span className="text-sm font-semibold text-gray-700 flex-1 flex items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {badge}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {open && (
        <div className={flat ? 'pb-3 px-1' : 'px-5 pb-5 -mt-2'}>{children}</div>
      )}
    </div>
  )
}
