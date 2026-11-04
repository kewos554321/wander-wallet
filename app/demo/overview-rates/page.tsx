"use client"

import { TripSummaryCard } from "@/components/v2/project/trip-summary-card"
import { DEMO_SUMMARY } from "@/app/demo/_data/fixtures"

const mixed = { ...DEMO_SUMMARY, hasMixedCurrencies: true }
const ratesTimestamp = new Date("2026-11-04T09:00:00+08:00").getTime()

// Three states of the same card: rates still loading, a fallback rate, and a
// live rate. The loading state must never show a converted total.
export default function OverviewRatesDemoPage() {
  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-6">
      <h1 className="m-0 font-v2-serif text-[22px] font-bold text-v2-ink">匯率狀態</h1>
      <p className="m-0 mt-1.5 text-[12.5px] leading-relaxed text-v2-ink-muted">
        外幣旅程在匯率就緒前不顯示總額，避免把日圓當台幣。
      </p>

      <div className="mt-6">
        <p className="m-0 mb-1 px-4 text-[12px] font-bold text-v2-lake">載入中</p>
        <TripSummaryCard summary={mixed} currency="TWD" ratesLoading ratesReady={false} />
      </div>

      <div className="mt-8">
        <p className="m-0 mb-1 px-4 text-[12px] font-bold text-v2-lake">備援匯率</p>
        <TripSummaryCard summary={mixed} currency="TWD" usingFallback ratesTimestamp={ratesTimestamp} />
      </div>

      <div className="mt-8">
        <p className="m-0 mb-1 px-4 text-[12px] font-bold text-v2-lake">即時匯率</p>
        <TripSummaryCard summary={mixed} currency="TWD" ratesTimestamp={ratesTimestamp} />
      </div>
    </div>
  )
}
