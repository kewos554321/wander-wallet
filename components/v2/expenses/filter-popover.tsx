"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { useDismiss } from "@/components/v2/use-dismiss"

interface TriggerRect {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Position a filter panel below (or above) its trigger.
 *
 * The panel is anchored to the trigger's left or right edge and clamped into
 * the viewport. Because the trigger sits in a 3-column grid, a preferred
 * `align` can be impossible to satisfy (e.g. a right-aligned panel on a
 * left-column chip would run off-screen); in that case we keep the panel
 * attached to whichever edge is closest. `align` only breaks ties.
 */
export function computePopoverPosition({
  align,
  trigger,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
}: {
  align: "left" | "right"
  trigger: TriggerRect
  panelWidth: number
  panelHeight: number
  viewportWidth: number
  viewportHeight: number
}): { top: number; left: number } {
  const top =
    trigger.bottom + 4 + panelHeight > viewportHeight
      ? Math.max(4, trigger.top - panelHeight - 4)
      : trigger.bottom + 4
  const maxLeft = Math.max(4, viewportWidth - panelWidth - 4)
  const clampLeft = (value: number) => Math.min(Math.max(4, value), maxLeft)
  const leftAnchor = clampLeft(trigger.left)
  const rightAnchor = clampLeft(trigger.right - panelWidth)
  const leftError = Math.abs(leftAnchor - trigger.left)
  const rightError = Math.abs(rightAnchor + panelWidth - trigger.right)
  const useRight = align === "right" ? rightError <= leftError : rightError < leftError
  return { top, left: useRight ? rightAnchor : leftAnchor }
}

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
  const measure = useCallback(() => {
    const trigger = ref.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const r = trigger.getBoundingClientRect()
    setPos(
      computePopoverPosition({
        align,
        trigger: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
        panelWidth: panel.offsetWidth,
        panelHeight: panel.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
    )
  }, [align])

  // Measure when the panel mounts (ref callback commit) rather than in an
  // effect, so the position is ready before paint.
  const attachPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node
      if (node) measure()
    },
    [measure]
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener("scroll", measure, true)
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("scroll", measure, true)
      window.removeEventListener("resize", measure)
    }
  }, [open, measure])

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
          ref={attachPanel}
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
