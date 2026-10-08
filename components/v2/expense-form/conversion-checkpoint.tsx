"use client"

import { roundRateForDisplay } from "@/lib/currency-conversion"

// Makes the conversion order explicit: the total is converted to the settlement
// currency first, and the split/payment sections below operate on that
// converted amount. Shown only for foreign expenses.
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
      <p className="m-0">
        ① 匯率換算 1 {currency} = {rate != null ? roundRateForDisplay(rate) : "—"} {projectCurrency}
      </p>
      <p className="m-0">② 以下以結算幣別 {projectCurrency} 分攤與付款</p>
    </div>
  )
}
