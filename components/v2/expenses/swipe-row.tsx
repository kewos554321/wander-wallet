"use client"

import { useRef, useState, type ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { nextOffset, SWIPE_OPEN } from "./swipe-math"

interface SwipeRowProps {
  onDelete: () => void
  disabled?: boolean
  children: ReactNode
}

export function SwipeRow({ onDelete, disabled = false, children }: SwipeRowProps) {
  const [offset, setOffset] = useState(0)
  const start = useRef<{ x: number; y: number; vertical: boolean } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return
    start.current = { x: e.clientX, y: e.clientY, vertical: false }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (disabled || !start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (Math.abs(dy) > Math.abs(dx)) start.current.vertical = true
  }

  function onPointerUp(e: React.PointerEvent) {
    if (disabled || !start.current) return
    const { x, vertical } = start.current
    start.current = null
    if (vertical) return
    setOffset(nextOffset(x, e.clientX, offset))
  }

  const action = (side: "left" | "right") => (
    <button
      type="button"
      aria-label="刪除"
      disabled={disabled}
      onFocus={() => !disabled && setOffset(side === "left" ? SWIPE_OPEN : -SWIPE_OPEN)}
      onBlur={() => !disabled && setOffset(0)}
      onClick={onDelete}
      className={`absolute inset-y-0 flex w-[72px] flex-col items-center justify-center gap-1.5 bg-v2-danger text-v2-on-lake disabled:opacity-60 ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-on-lake/20">
        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="text-[11px] font-bold">刪除</span>
    </button>
  )

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      {action("left")}
      {action("right")}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative z-10"
        style={{ transform: `translateX(${offset}px)`, transition: "transform .25s ease", touchAction: "pan-y" }}
      >
        {children}
      </div>
    </div>
  )
}
