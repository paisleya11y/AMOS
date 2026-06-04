'use client'
import { ReactNode, useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  /** 唯一标识，用于 localStorage 记忆宽度 */
  storageKey: string
  /** 默认宽度（像素） */
  defaultWidth?: number
  /** 最小宽度 */
  minWidth?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 拖拽手柄在哪一侧（左栏=right，右栏=left） */
  side: 'left' | 'right'
  className?: string
  children: ReactNode
}

/**
 * 可拖拽改宽度的侧边栏。
 * - 拖拽手柄在 side 指定的一侧
 * - 宽度持久化到 localStorage
 * - 双击手柄恢复默认宽度
 */
export default function ResizableAside({
  storageKey,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 480,
  side,
  className = '',
  children,
}: Props) {
  const [width, setWidth] = useState(defaultWidth)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(defaultWidth)

  // 初次挂载从 localStorage 恢复
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved) {
        const n = parseInt(saved, 10)
        if (!isNaN(n) && n >= minWidth && n <= maxWidth) setWidth(n)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      const next =
        side === 'right' ? startWidthRef.current + delta : startWidthRef.current - delta
      const clamped = Math.max(minWidth, Math.min(maxWidth, next))
      setWidth(clamped)
    },
    [side, minWidth, maxWidth]
  )

  const onMouseUp = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    try {
      window.localStorage.setItem(storageKey, String(width))
    } catch {}
  }, [storageKey, width])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    draggingRef.current = true
    setDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onDoubleClick() {
    setWidth(defaultWidth)
    try {
      window.localStorage.setItem(storageKey, String(defaultWidth))
    } catch {}
  }

  const handle = (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title="拖动改变宽度，双击恢复默认"
      className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize z-10 group flex items-center justify-center ${
        side === 'right' ? '-right-0.5' : '-left-0.5'
      }`}
    >
      <div
        className={`w-0.5 h-full transition-colors ${
          dragging ? 'bg-blue-400' : 'bg-transparent group-hover:bg-blue-300'
        }`}
      />
    </div>
  )

  return (
    <aside
      style={{ width }}
      className={`relative flex-shrink-0 ${className}`}
    >
      {children}
      {handle}
    </aside>
  )
}
