"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useDialogHistory } from "@/components/v2/use-dialog-history"

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Bottom-sheet dialog for the v2 form surface. Gives the sheet real dialog
 * semantics: `role="dialog"` + `aria-modal`, Escape and backdrop-click to close,
 * a focus trap while open, and focus restored to the trigger on close. Several
 * v2 sheets (cover picker, delete confirmation) used a bare fixed overlay and
 * escaped all of that.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog (e.g. "更換封面"). */
  label: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Keep the latest onClose without putting it in the effect deps: callers pass
  // inline arrows, and a deps change would re-run the trap on every re-render
  // (stealing focus back to the panel mid-interaction).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Phone back closes the sheet instead of leaving the page (and pops the
  // entry again when the sheet is dismissed by X / backdrop / Escape).
  useDialogHistory(open, onClose, label)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open])

  // Lock background scroll while the sheet owns the viewport.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-v2-overlay sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-v2-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-lg outline-none sm:rounded-2xl"
      >
        {children}
      </div>
    </div>
  )
}
