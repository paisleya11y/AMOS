'use client'
import { useState } from 'react'

export type ReviseModule = 'assortment' | 'content' | 'empowerment' | 'benchmark'

const MODULE_OPTIONS: { value: ReviseModule; label: string }[] = [
  { value: 'assortment', label: '货盘' },
  { value: 'content', label: '内容' },
  { value: 'empowerment', label: '投流' },
  { value: 'benchmark', label: '标杆' },
]

interface Props {
  /** 提交：父级会把 note 写入 focusNote、跑 modules（为空表示全跑） */
  onSubmit: (note: string, modules: ReviseModule[]) => void
  disabled?: boolean
}

/**
 * 右栏 · AM 修改意见
 *  - AM 在这里写自己的判断和调整意见（"我觉得这版哪里不对、应该往哪改"）
 *  - 这些意见会作为 focusNote 注入到下一轮 agent prompt
 *  - 默认全跑；勾了具体模块则只重跑这几块
 */
export default function ReviseRequest({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('')
  const [modules, setModules] = useState<Set<ReviseModule>>(new Set())
  const [open, setOpen] = useState(true)

  function toggle(m: ReviseModule) {
    setModules((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed, Array.from(modules))
    setText('')
    setModules(new Set())
  }

  const canSubmit = !!text.trim() && !disabled

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs text-gray-500 uppercase tracking-widest mb-2 hover:text-gray-700"
      >
        <span>AM 修改意见</span>
        <span className="text-gray-300">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            写下你对这份报告的判断和修改意见，AI 会按你的方向重新生成。例如：
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="· 货盘建议太保守了，这家可以多上 2-3 个测试品&#10;· 投流预算给的太高，这周按 200 美金/天重算&#10;· 内容矩阵直播占比不够，目标商家正在主推直播&#10;· 标杆案例不太相关，换一个同 GMV 段的"
            disabled={disabled}
            rows={5}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-200 resize-none disabled:opacity-50 placeholder:text-gray-400"
          />

          <div className="flex flex-wrap gap-1">
            {MODULE_OPTIONS.map((opt) => {
              const active = modules.has(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  disabled={disabled}
                  style={{ fontSize: '10px', lineHeight: 1.3 }}
                  className={`px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
            {modules.size === 0 && (
              <span className="text-[10px] text-gray-400 self-center ml-1">
                不勾选 = 按你的意见整份重写
              </span>
            )}
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full text-xs py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {disabled ? '正在按你的意见重写…' : '按这个意见重写 →'}
          </button>
        </div>
      )}
    </div>
  )
}
