"use client"

import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatLocalDate, parseLocalDate, slashDate } from "./date-utils"

// Shared date-range trigger + popover calendar used by the new-trip and
// project-settings v2 screens (see v1 project-settings-v1.tsx for the same
// range-selection semantics).
export function DateRangeField({
  label,
  startDate,
  endDate,
  onChange,
  disabled,
  triggerClassName,
}: {
  label: string
  startDate: string | null
  endDate: string | null
  onChange: (start: string | null, end: string | null) => void
  disabled?: boolean
  triggerClassName?: string
}) {
  const range: DateRange | undefined = startDate
    ? { from: parseLocalDate(startDate), to: endDate ? parseLocalDate(endDate) : undefined }
    : undefined

  let display = "選擇日期"
  if (startDate && endDate) display = `${slashDate(startDate)} – ${slashDate(endDate)}`
  else if (startDate) display = `${slashDate(startDate)} – ...`

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-v2-ink-muted">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`flex w-full items-center gap-2 rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3 text-left text-[13px] ${triggerClassName ?? ""}`}
          >
            <CalendarIcon className="h-[15px] w-[15px] shrink-0 text-v2-ink-muted" aria-hidden="true" />
            <span className={startDate ? "text-v2-ink" : "text-v2-ink-subtle"}>{display}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} collisionPadding={16} className="w-[calc(100vw-32px)] max-w-[360px] p-2">
          <div className="flex items-center justify-center">
            <Calendar
              mode="range"
              defaultMonth={range?.from}
              selected={range}
              className="p-2 [--cell-size:--spacing(10)] text-sm"
              onSelect={(next) => {
                if (next?.from && next?.to) onChange(formatLocalDate(next.from), formatLocalDate(next.to))
                else if (next?.from) onChange(formatLocalDate(next.from), null)
                else onChange(null, null)
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
