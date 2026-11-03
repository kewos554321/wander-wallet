"use client"

// /demo/expense-prototype — an OPERABLE before/after/platform switch (single state).
//   改前 = the real ExpenseFormV2View (the product's actual component)
//   改後 = the redesigned ledger layout (expense-form-after-view.tsx, demo-only)
//   平台式 = the Apple/Google-style list row + detail sheet
// All are driven by the SAME useExpenseDraft, so the split/payer math is the
// real engine and the modes share one draft (switching preserves what you
// typed). "重設" re-seeds it. Nothing in the product tree changes.
//
// Deep links: ?mode=after / ?mode=platform

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft, type DraftExpense } from "@/components/v2/expense-form/use-expense-draft"
import type { PreviewRateInfo } from "@/lib/currency-conversion"
import { DEMO_CURRENCY, DEMO_LIVE_RATE, DEMO_MEMBERS, DEMO_PROJECT_ID } from "@/app/demo/_data/fixtures"
import { ExpenseFormAfterView } from "./expense-form-after-view"

const ALL_IDS = DEMO_MEMBERS.map((m) => m.id)

const previewRateInfo = (currency: string): PreviewRateInfo =>
  currency && currency !== DEMO_CURRENCY ? { rate: DEMO_LIVE_RATE, source: "live" } : { rate: null, source: "same" }

// One representative expense: JPY 1,280, I paid, split 4 ways. (Tap 個人品項 /
// 指定金額 in the split card to try the advanced paths.)
const EXPENSE: DraftExpense = {
  amount: 1280,
  currency: "JPY",
  exchangeRate: null,
  rateKind: null,
  rateDate: null,
  description: "一蘭拉麵晚餐",
  category: "food",
  payers: [{ memberId: "me", amount: 1280 }],
  expenseDate: "2026-10-11",
  location: null,
  latitude: null,
  longitude: null,
  image: null,
  participants: ALL_IDS.map((id) => ({ memberId: id, shareAmount: 320 })),
  splitDetail: null,
}

type Mode = "before" | "after" | "platform"

function Stage({ mode }: { mode: Mode }) {
  const init = useMemo(
    () => ({ members: DEMO_MEMBERS, currency: "JPY", projectCurrency: DEMO_CURRENCY, paidBy: "me", expense: EXPENSE }),
    [],
  )
  const draft = useExpenseDraft(init, previewRateInfo)
  const shared = {
    mode: "create" as const,
    projectId: DEMO_PROJECT_ID,
    members: DEMO_MEMBERS,
    draft,
    canNotifyLine: false,
    submitting: false,
    submitError: null,
    onSubmit: () => {},
    projectCurrency: DEMO_CURRENCY,
    previewRateInfo,
    rateContext: () => ({ liveRate: DEMO_LIVE_RATE, liveTimestamp: null }),
    recentRates: () => [],
  }
  if (mode === "before") return <ExpenseFormV2View {...shared} />
  return <ExpenseFormAfterView {...shared} variant={mode === "platform" ? "platform" : "ledger"} />
}

function Prototype() {
  const params = useSearchParams()
  const initialMode: Mode =
    params.get("mode") === "after" ? "after" : params.get("mode") === "platform" ? "platform" : "before"
  const [mode, setMode] = useState<Mode>(initialMode)
  const [seed, setSeed] = useState(0)

  const seg = (active: boolean, danger = false) =>
    `rounded-full px-3.5 py-1.5 text-[12px] font-bold ${active ? (danger ? "bg-v2-danger text-white" : "bg-v2-lake text-v2-on-lake") : "border border-v2-line bg-v2-surface text-v2-ink"}`

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-2 px-4 pt-5">
        <span className="text-[11px] font-bold text-v2-ink-muted">版本</span>
        <div className="inline-flex rounded-full bg-v2-sand p-0.5">
          <button type="button" onClick={() => setMode("before")} aria-pressed={mode === "before"} className={seg(mode === "before", true)}>
            改前
          </button>
          <button type="button" onClick={() => setMode("after")} aria-pressed={mode === "after"} className={seg(mode === "after")}>
            改後
          </button>
          <button type="button" onClick={() => setMode("platform")} aria-pressed={mode === "platform"} className={seg(mode === "platform")}>
            平台式
          </button>
        </div>
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="ml-auto rounded-full border border-v2-line bg-v2-surface px-3 py-1.5 text-[12px] font-bold text-v2-ink-muted">
          重設
        </button>
      </div>

      <p className="px-4 pt-3 text-[11px] leading-relaxed text-v2-ink-muted">
        {mode === "after"
          ? "改後：個人品項在共同分攤之前、明細收合成一行、單一狀態、顯示幣別在底部列。可直接操作；金額卡的匯率操作與原版相同（點匯率列開面板）。"
          : mode === "platform"
            ? "平台式：Google/Apple list 慣例——左邊名字、右邊金額＋箭頭，個人明細收進點擊後的 sheet。可直接操作。"
            : "改前：產品真實元件，可直接操作。切換版本會保留你已輸入的內容。"}
      </p>

      {/* seed changes only on 重設, so the before/after switch keeps the draft. */}
      <Stage key={seed} mode={mode} />
    </div>
  )
}

export default function ExpensePrototypeDemoPage() {
  return (
    <Suspense>
      <Prototype />
    </Suspense>
  )
}
