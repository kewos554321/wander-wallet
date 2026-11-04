"use client"

// /demo/expense-scenarios — the REAL v2 expense form, driven by fixture drafts
// so each scenario renders the actual component (same code the product ships),
// not a redraw. Pick a scenario with the tabs; switching remounts the form so
// the draft resets. No production/demo files are modified — this page is added.
//
// Scenarios:
//   personal   個人品項（先扣個人項目）
//   multiPayer 多人付款（各自固定金額）
//   customSplit 客製化分攤金額
//   remainder  餘額／零頭

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft, type DraftExpense } from "@/components/v2/expense-form/use-expense-draft"
import type { PreviewRateInfo } from "@/lib/currency-conversion"
import { DEMO_CURRENCY, DEMO_LIVE_RATE, DEMO_MEMBERS, DEMO_PROJECT_ID } from "@/app/demo/_data/fixtures"

type ScenarioKey = "personal" | "multiPayer" | "customSplit" | "remainder"

const ALL_IDS = DEMO_MEMBERS.map((m) => m.id)

const previewRateInfo = (currency: string): PreviewRateInfo =>
  currency && currency !== DEMO_CURRENCY
    ? { rate: DEMO_LIVE_RATE, source: "live" }
    : { rate: null, source: "same" }

// Every scenario is a foreign (JPY) expense settling in TWD so the conversion
// preview and rate row render, matching the critique screenshots.
function buildExpense(key: ScenarioKey): DraftExpense {
  const base = {
    currency: "JPY",
    exchangeRate: null,
    rateKind: null,
    rateDate: null,
    category: "food",
    expenseDate: "2026-10-11",
    location: null,
    latitude: null,
    longitude: null,
    image: null,
  }
  switch (key) {
    case "personal":
      // 拉麵晚餐 JPY 3,200；阿明啤酒 600、小婷甜點 400，其餘 2,200 四人分。
      return {
        ...base,
        amount: 3200,
        description: "一蘭拉麵晚餐",
        payers: [{ memberId: "me", amount: 3200 }],
        participants: ALL_IDS.map((id) => ({ memberId: id, shareAmount: 0 })),
        splitDetail: {
          version: 1,
          personalItems: {
            ming: [{ name: "啤酒", amount: 600 }],
            ting: [{ name: "甜點", amount: 400 }],
          },
          customShares: {},
        },
      }
    case "multiPayer":
      // 合計 1,280；我付 800、阿明付 480；四人均分。
      return {
        ...base,
        amount: 1280,
        description: "晚餐 拉麵",
        payers: [
          { memberId: "me", amount: 800 },
          { memberId: "ming", amount: 480 },
        ],
        participants: ALL_IDS.map((id) => ({ memberId: id, shareAmount: 320 })),
        splitDetail: null,
      }
    case "customSplit":
      // 合計 1,280；我 500、阿明 300、阿凱 280、小婷 200（各自固定）。
      return {
        ...base,
        amount: 1280,
        description: "晚餐 拉麵",
        payers: [{ memberId: "me", amount: 1280 }],
        participants: [
          { memberId: "me", shareAmount: 500 },
          { memberId: "ming", shareAmount: 300 },
          { memberId: "kai", shareAmount: 280 },
          { memberId: "ting", shareAmount: 200 },
        ],
        splitDetail: {
          version: 1,
          personalItems: {},
          customShares: { me: 500, ming: 300, kai: 280, ting: 200 },
        },
      }
    case "remainder":
      // 合計 1,285；四人均分 → 321.25，尾差由輪替機制吸收（零頭）。
      return {
        ...base,
        amount: 1285,
        description: "計程車",
        payers: [{ memberId: "me", amount: 1285 }],
        participants: ALL_IDS.map((id) => ({ memberId: id, shareAmount: 321.25 })),
        splitDetail: null,
      }
  }
}

function Scenario({ scenario }: { scenario: ScenarioKey }) {
  const init = useMemo(
    () => ({
      members: DEMO_MEMBERS,
      currency: "JPY",
      projectCurrency: DEMO_CURRENCY,
      paidBy: "me",
      expense: buildExpense(scenario),
    }),
    [scenario],
  )
  const draft = useExpenseDraft(init, previewRateInfo)

  return (
    <ExpenseFormV2View
      mode="create"
      projectId={DEMO_PROJECT_ID}
      members={DEMO_MEMBERS}
      draft={draft}
      canNotifyLine={false}
      submitting={false}
      submitError={null}
      onSubmit={() => {
        /* demo no-op */
      }}
      projectCurrency={DEMO_CURRENCY}
      previewRateInfo={previewRateInfo}
      rateContext={() => ({ liveRate: DEMO_LIVE_RATE, liveTimestamp: null })}
      recentRates={() => []}
    />
  )
}

const SCENARIOS: { key: ScenarioKey; label: string }[] = [
  { key: "personal", label: "個人品項" },
  { key: "multiPayer", label: "多人付款" },
  { key: "customSplit", label: "客製分攤" },
  { key: "remainder", label: "餘額／零頭" },
]

const KEYS = SCENARIOS.map((s) => s.key)
function isKey(value: string | null): value is ScenarioKey {
  return value != null && (KEYS as string[]).includes(value)
}

function ScenarioContent() {
  const params = useSearchParams()
  const fromUrl = params.get("scenario")
  const [scenario, setScenario] = useState<ScenarioKey>(isKey(fromUrl) ? fromUrl : "personal")

  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-wrap gap-2 px-4 pt-5">
        {SCENARIOS.map((s) => {
          const active = scenario === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setScenario(s.key)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold ${
                active ? "bg-v2-lake text-v2-on-lake" : "border border-v2-line bg-v2-surface text-v2-ink"
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      {/* Remount on switch so the draft re-seeds from the scenario fixture. */}
      <Scenario key={scenario} scenario={scenario} />
    </div>
  )
}

export default function ExpenseScenariosDemoPage() {
  return (
    <Suspense>
      <ScenarioContent />
    </Suspense>
  )
}
