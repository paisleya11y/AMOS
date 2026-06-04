'use client'
import { ReactNode, useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** 悬浮窗内容（字符串或自定义节点） */
  content: ReactNode
  /** 触发元素 */
  children: ReactNode
  /** 触发元素是否需要 help（?）光标。默认 false，避免出现问号。 */
  cursorHelp?: boolean
  /** 悬浮窗最大宽度（px），默认 280 */
  maxWidth?: number
  /** 优先方向，自动按视口空间翻转。默认 top */
  preferred?: 'top' | 'bottom'
  /**
   * 内容是否允许鼠标交互（默认 true）。
   * 设为 true 时：鼠标可以从 trigger 移到 tooltip 上，**选中并复制 tooltip 里的文字**；
   * 设为 false 时：tooltip 完全不响应鼠标（仅展示）。
   */
  interactive?: boolean
}

/**
 * 统一的悬浮提示组件，配主 agent 视觉调性：
 * 深色圆角卡片 + 白色文字 + 小箭头 + 浅阴影。
 *
 * 关键：tooltip 通过 React Portal 渲染到 document.body，position:fixed 跟视口对齐，
 * 自动根据视口空间在上下方翻转 + 左右钳制，避免被父级 overflow:hidden 截掉。
 */
export default function Tooltip({
  content,
  children,
  cursorHelp = true,
  maxWidth = 280,
  preferred = 'top',
  interactive = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  // 鼠标在 trigger ↔ tooltip 之间穿越时给一个短暂的延迟关闭，避免一离开 trigger 就关
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }
  useEffect(() => () => cancelClose(), [])
  const [pos, setPos] = useState<{
    top: number
    left: number
    placement: 'top' | 'bottom'
    arrowLeft: number
  } | null>(null)

  const recalc = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const t = triggerRef.current.getBoundingClientRect()
    const tt = tooltipRef.current.getBoundingClientRect()
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    // 上下空间
    const spaceTop = t.top
    const spaceBottom = vh - t.bottom
    let placement: 'top' | 'bottom' = preferred
    if (preferred === 'top' && spaceTop < tt.height + margin && spaceBottom > spaceTop) {
      placement = 'bottom'
    } else if (
      preferred === 'bottom' &&
      spaceBottom < tt.height + margin &&
      spaceTop > spaceBottom
    ) {
      placement = 'top'
    }

    const top =
      placement === 'top' ? t.top - tt.height - margin : t.bottom + margin

    // 水平：以触发元素中心对齐，再钳制到视口内
    const triggerCenter = t.left + t.width / 2
    let left = triggerCenter - tt.width / 2
    const minLeft = 8
    const maxLeft = vw - tt.width - 8
    left = Math.max(minLeft, Math.min(left, maxLeft))

    // 箭头位置：相对 tooltip 左边缘，对应触发中心
    const arrowLeft = Math.max(12, Math.min(triggerCenter - left, tt.width - 12))

    setPos({ top, left, placement, arrowLeft })
  }, [preferred])

  useLayoutEffect(() => {
    if (!open) return
    recalc()
    const onScroll = () => recalc()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, recalc, content])

  if (!content) return <>{children}</>

  const tooltipNode =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            onMouseEnter={interactive ? cancelClose : undefined}
            onMouseLeave={interactive ? scheduleClose : undefined}
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              maxWidth,
              zIndex: 9999,
              visibility: pos ? 'visible' : 'hidden',
              pointerEvents: interactive ? 'auto' : 'none',
            }}
            className="animate-[fadeIn_0.12s_ease-out]"
          >
            <div
              className="bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-xl px-3 py-2 whitespace-normal break-words"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              {content}
            </div>
            {/* 箭头 */}
            {pos && (
              <div
                style={{
                  position: 'absolute',
                  left: pos.arrowLeft - 4,
                  ...(pos.placement === 'top'
                    ? { bottom: -4 }
                    : { top: -4 }),
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  ...(pos.placement === 'top'
                    ? { borderTop: '4px solid #111827' }
                    : { borderBottom: '4px solid #111827' }),
                }}
              />
            )}
          </div>,
          document.body
        )
      : null

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center ${cursorHelp ? 'cursor-help' : ''}`}
        onMouseEnter={() => {
          cancelClose()
          setOpen(true)
        }}
        onMouseLeave={() => {
          if (interactive) scheduleClose()
          else setOpen(false)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        {children}
      </span>
      {tooltipNode}
    </>
  )
}
