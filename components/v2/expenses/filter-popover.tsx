"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { useDismiss } from "@/components/v2/use-dismiss"

interface FilterPopoverProps {
  label: string
  icon: ReactNode
  count: number
  open: boolean
  onToggle: () => void
  align?: "left" | "right"
  widthClass: string
  /** Panel corner radius; defaults to the 12px filter-panel shell. */
  panelRadiusClass?: string
  /** Persistent accessible name when the visible label changes (e.g. a date range). */
  ariaLabel?: string
  children: ReactNode
}

export function FilterPopover({
  label,
  icon,
  count,
  open,
  onToggle,
  align = "left",
  widthClass,
  panelRadiusClass = "rounded-[12px]",
  ariaLabel,
  children,
}: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useDismiss(ref, onToggle, open)

  // Position the panel with fixed coordinates measured against the trigger so it
  // never spills outside the viewport: flip upward when there is no room below,
  // and clamp horizontally. Fixed (not a Portal) keeps the v2 token scope.
  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const update = () => {
      const trigger = ref.current
      const panel = panelRef.current
      if (!trigger || !panel) return
      const r = trigger.getBoundingClientRect()
      const pw = panel.offsetWidth
      const ph = panel.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight
      const top = r.bottom + 4 + ph > vh ? Math.max(4, r.top - ph - 4) : r.bottom + 4
      const preferred = align === "right" ? r.right - pw : r.left
      const left = Math.min(Math.max(4, preferred), Math.max(4, vw - pw - 4))
      setPos({ top, left })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, align])

  const active = count > 0
  const stateClass = active
    ? "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft font-bold text-v2-lake"
    : open
      ? "border-[1.5px] border-v2-ink-subtle bg-v2-sand font-semibold text-v2-ink"
      : "border border-v2-line bg-v2-surface font-semibold text-v2-ink"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onToggle}
        className={`flex w-full items-center gap-[5px] rounded-[10px] px-2.5 py-[9px] text-xs ${stateClass}`}
      >
        <span className={active ? "text-v2-lake" : open ? "text-v2-ink" : "text-v2-ink-subtle"}>{icon}</span>
        <span className="flex-1 truncate text-left">{label}</span>
        {active ? (
          <span className="flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full bg-v2-lake px-[3px] text-[9px] text-v2-on-lake">
            {count}
          </span>
        ) : (
          <ChevronDown
            data-testid="filter-chevron"
            className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180 text-v2-ink" : "text-v2-ink-subtle"}`}
            aria-hidden="true"
          />
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          data-testid="filter-panel"
          style={{ top: pos?.top, left: pos?.left, visibility: pos ? "visible" : "hidden" }}
          className={`fixed z-20 overflow-hidden ${panelRadiusClass} border border-v2-line bg-v2-surface shadow-[0_10px_28px_rgba(27,24,21,.18)] ${widthClass}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
