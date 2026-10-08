"use client"

import { roundRateForDisplay } from "@/lib/currency-conversion"

// Reassures the user that a foreign expense is converted to the settlement
// currency before the split/payment sections below run. Shown only for foreign
// expenses.
export function ConversionCheckpoint({
  currency,
  projectCurrency,
  rate,
}: {
  currency: string
  projectCurrency: string
  rate: number | null
}) {
  return (
    <div
      data-testid="conversion-checkpoint"
      aria-label="匯率換算"
      className="mx-4 mb-4 flex flex-col gap-0.5 rounded-[14px] border border-v2-lake-border bg-v2-lake-soft px-3.5 py-2.5 text-[12px] text-v2-lake"
    >
      <p className="m-0">結算會先換匯，再以 {projectCurrency} 分攤</p>
      <p className="m-0">
        1 {currency} = {rate != null ? roundRateForDisplay(rate) : "—"} {projectCurrency}
      </p>
    </div>
  )
}
