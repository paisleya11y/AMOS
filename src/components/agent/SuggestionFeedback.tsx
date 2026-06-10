'use client'
import { useEffect, useState } from 'react'
import {
  setFeedback,
  clearFeedback,
  getFeedback,
  makeSuggestionId,
  type FeedbackAction,
} from '@/lib/feedbackStore'

interface Props {
  merchantId: string
  week: string
  module: string
  /** 建议原文（也用于生成稳定 ID） */
  suggestionText: string
  /** 处置后回调（父级可用于刷新回顾卡等） */
  onChange?: () => void
}

const ACTION_META: Record<
  FeedbackAction,
  { label: string; icon: string; active: string; idle: string }
> = {
  adopted: {
    label: '采纳',
    icon: '✓',
    active: 'bg-emerald-500 text-white border-emerald-500',
    idle: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50',
  },
  ignored: {
    label: '忽略',
    icon: '✕',
    active: 'bg-gray-400 text-white border-gray-400',
    idle: 'text-gray-500 border-gray-200 hover:bg-gray-50',
  },
  revised: {
    label: '改一下',
    icon: '✎',
    active: 'bg-blue-500 text-white border-blue-500',
    idle: 'text-blue-600 border-blue-200 hover:bg-blue-50',
  },
}

/**
 * 建议级反馈条：✓采纳 / ✕忽略 / ✎改一下
 * - 写入 localStorage（feedbackStore），刷新后保留
 * - 再次点已选中的动作 = 取消
 * - 点"改一下"展开输入框，提交后记为 revised
 */
export default function SuggestionFeedback({
  merchantId,
  week,
  module,
  suggestionText,
  onChange,
}: Props) {
  const sid = makeSuggestionId(module, suggestionText)
  const [action, setAction] = useState<FeedbackAction | null>(null)
  const [revisedText, setRevisedText] = useState('')
  const [editing, setEditing] = useState(false)

  // 挂载时读已存状态
  useEffect(() => {
    const fb = getFeedback(merchantId, sid)
    if (fb) {
      setAction(fb.action)
      if (fb.revisedText) setRevisedText(fb.revisedText)
    } else {
      setAction(null)
      setRevisedText('')
    }
    setEditing(false)
  }, [merchantId, sid])

  function pick(next: FeedbackAction) {
    if (next === 'revised') {
      // 切换改写输入框
      setEditing((e) => !e)
      return
    }
    if (action === next) {
      // 再次点 = 取消
      clearFeedback(merchantId, sid)
      setAction(null)
      onChange?.()
      return
    }
    setFeedback({ merchantId, week, module, suggestionId: sid, suggestionText, action: next })
    setAction(next)
    setEditing(false)
    onChange?.()
  }

  function submitRevise() {
    const t = revisedText.trim()
    if (!t) return
    setFeedback({
      merchantId,
      week,
      module,
      suggestionId: sid,
      suggestionText,
      action: 'revised',
      revisedText: t,
    })
    setAction('revised')
    setEditing(false)
    onChange?.()
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        {(['adopted', 'ignored', 'revised'] as FeedbackAction[]).map((a) => {
          const meta = ACTION_META[a]
          const isActive = action === a
          return (
            <button
              key={a}
              onClick={() => pick(a)}
              style={{ fontSize: '10px', lineHeight: 1.2 }}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors ${
                isActive ? meta.active : `bg-white ${meta.idle}`
              }`}
              title={meta.label}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          )
        })}
        {action && action !== 'revised' && (
          <span style={{ fontSize: '10px', lineHeight: 1.2 }} className="text-gray-400 ml-1">
            已记录
          </span>
        )}
      </div>

      {/* 改写输入框 */}
      {editing && (
        <div className="mt-1.5 flex items-start gap-1.5">
          <textarea
            value={revisedText}
            onChange={(e) => setRevisedText(e.target.value)}
            placeholder="写下你认为更合适的版本…"
            rows={2}
            style={{ fontSize: '11px', lineHeight: 1.4 }}
            className="flex-1 px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-200 resize-none"
          />
          <button
            onClick={submitRevise}
            disabled={!revisedText.trim()}
            style={{ fontSize: '10px', lineHeight: 1.2 }}
            className="shrink-0 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          >
            保存
          </button>
        </div>
      )}

      {/* 已保存的改写内容回显 */}
      {action === 'revised' && !editing && revisedText && (
        <p
          style={{ fontSize: '10px', lineHeight: 1.4 }}
          className="mt-1 text-blue-700 bg-blue-50/60 border border-blue-100 rounded px-1.5 py-1"
        >
          你的改法：{revisedText}
        </p>
      )}
    </div>
  )
}
