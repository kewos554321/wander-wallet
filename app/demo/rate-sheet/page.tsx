"use client"

import { useState } from "react"
import { RateSheet } from "@/components/v2/expense-form/rate-sheet"
import { DEMO_CURRENCY, DEMO_LIVE_RATE, DEMO_RECENT_RATES } from "@/app/demo/_data/fixtures"

// The real rate sheet. Opens immediately so the screen reads as the sheet; the
// button below reopens it after you close it.
export default function RateSheetDemoPage() {
  const [open, setOpen] = useState(true)
  const [rate, setRate] = useState<number | null>(DEMO_LIVE_RATE)
  const [custom, setCustom] = useState(false)
  const [kind, setKind] = useState<"market" | "custom" | null>("market")

  return (
    <div className="mx-auto max-w-md p-4">
      <p className="m-0 text-[12px] text-v2-ink-muted">匯率面板 · 真元件（JPY → {DEMO_CURRENCY}）</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-full border border-v2-lake px-4 py-1.5 text-xs font-bold text-v2-lake"
      >
        重新開啟面板
      </button>

      <RateSheet
        open={open}
        onClose={() => setOpen(false)}
        fromCurrency="JPY"
        toCurrency={DEMO_CURRENCY}
        rate={rate}
        customRate={custom}
        appliedKind={kind}
        liveRate={DEMO_LIVE_RATE}
        liveTimestamp={null}
        recentRates={DEMO_RECENT_RATES}
        onUseRate={(value, nextKind) => {
          setRate(value)
          setKind(nextKind)
          setCustom(nextKind === "custom")
        }}
        onReset={() => {
          setRate(DEMO_LIVE_RATE)
          setKind(null)
          setCustom(false)
        }}
      />
    </div>
  )
}
