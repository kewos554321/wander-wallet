"use client"

import { useRef, type ReactNode } from "react"
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
  /** Persistent accessible name when the visible label changes (e.g. a date range). */
  ariaLabel?: string
  children: ReactNode
}

export function FilterPopover({ label, icon, count, open, onToggle, align = "left", widthClass, ariaLabel, children }: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onToggle, open)
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
          <ChevronDown className={`h-3 w-3 shrink-0 ${open ? "text-v2-ink" : "text-v2-ink-subtle"}`} aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          className={`absolute top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-v2-line bg-v2-surface shadow-[0_10px_28px_rgba(27,24,21,.18)] ${
            align === "right" ? "right-0" : "left-0"
          } ${widthClass}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
