"use client"

import { useMemo } from "react"
import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import type { PreviewRateInfo } from "@/lib/currency-conversion"
import {
  DEMO_CURRENCY,
  DEMO_LIVE_RATE,
  DEMO_MEMBERS,
  DEMO_PROJECT_ID,
  DEMO_RECENT_RATES,
} from "@/app/demo/_data/fixtures"

// Real expense form view + real draft logic; only the project data is mocked.
const RATES: Record<string, number> = { JPY: DEMO_LIVE_RATE, USD: 31.8 }

export default function AddExpenseDemoPage() {
  const previewRateInfo = useMemo(
    () =>
      (currency: string): PreviewRateInfo =>
        RATES[currency] != null ? { rate: RATES[currency], source: "live" } : { rate: null, source: "none" },
    [],
  )
  const draft = useExpenseDraft(
    { members: DEMO_MEMBERS, currency: DEMO_CURRENCY, projectCurrency: DEMO_CURRENCY, paidBy: "me" },
    previewRateInfo,
  )

  return (
    <div className="mx-auto max-w-md">
      <ExpenseFormV2View
        mode="create"
        projectId={DEMO_PROJECT_ID}
        members={DEMO_MEMBERS}
        draft={draft}
        canNotifyLine={false}
        submitting={false}
        submitError={null}
        projectCurrency={DEMO_CURRENCY}
        previewRateInfo={previewRateInfo}
        rateContext={() => ({ liveRate: DEMO_LIVE_RATE, liveTimestamp: null })}
        recentRates={() => DEMO_RECENT_RATES}
        onSubmit={() => alert("（demo）新增支出")}
      />
    </div>
  )
}
