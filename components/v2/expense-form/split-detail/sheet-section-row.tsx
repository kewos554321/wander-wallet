"use client"

// Brand-styled list row with the behavior of a Material accordion:
// one clear trigger, a value, optional supporting text, aria wiring and a
// panel region. Visual tokens stay on the v2 theme.

import { ChevronDown } from "lucide-react"

export function SheetSectionRow({
  id,
  label,
  value,
  supporting,
  expanded,
  onToggle,
  children,
}: {
  id: string
  label: string
  value: React.ReactNode
  supporting?: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const buttonId = `${id}-label`
  const panelId = `${id}-panel`

  return (
    <>
      <button
        id={buttonId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-v2-lake-tint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-v2-ink">{label}</span>
          {supporting && <span className="block truncate text-[11px] text-v2-ink-muted">{supporting}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold tabular-nums">
          {value}
          <ChevronDown
            className={`h-4 w-4 text-v2-ink-subtle transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>
      {expanded && (
        <div id={panelId} role="region" aria-labelledby={buttonId}>
          {children}
        </div>
      )}
    </>
  )
}
