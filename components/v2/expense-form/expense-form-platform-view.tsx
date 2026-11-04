"use client"

// The production platform layout (Apple/Google-style list rows + detail sheet).
//
// The split model lives in one dedicated component, SplitPanel, rendered INLINE
// on the main screen (no sheet, no expand, no little links). The rest of the
// screen stays lean: amount → description → 分帳 panel → 類別 → 選填 → save.
//
// Driven by the SAME `useExpenseDraft` as the rest of the form; the amount card
// + rate sheet are the untouched originals. The field body lives in
// ExpenseFormFields so the AI result page can reuse it.

import { useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { ExpenseFormFields } from "@/components/v2/expense-form/expense-form-fields"
import { expenseFormIssues } from "@/components/v2/expense-form/split-guardrails"
import { formatCurrency } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import type { RecentRate } from "@/lib/recent-rates"

type Draft = ReturnType<typeof useExpenseDraft>

export interface ExpenseFormPlatformViewProps {
  mode: "create" | "edit"
  projectId: string
  members: DraftMember[]
  draft: Draft
  canNotifyLine: boolean
  submitting: boolean
  submitError: string | null
  onSubmit: () => void
  onRequestDelete?: () => void
  projectCurrency?: string
  previewRateInfo?: (currency: string) => { rate: number | null; source: "same" | "live" | "none" }
  rateContext?: (currency: string) => { liveRate: number | null; liveTimestamp: number | null }
  recentRates?: (currency: string) => RecentRate[]
  /** "ledger" = centered table (current after view); "platform" = Apple/Google list + detail sheet. */
  variant?: "ledger" | "platform"
}

export function ExpenseFormPlatformView(props: ExpenseFormPlatformViewProps) {
  const { draft, members, variant = "platform" } = props
  const { state, derived } = draft
  const [showSettlement, setShowSettlement] = useState(false)
  // The save bar is fixed, so the form needs matching bottom space or its last
  // section sits underneath it. Measure instead of guessing: the bar grows
  // when an amount error or the currency toggle appears.
  const footerRef = useRef<HTMLDivElement>(null)
  const [footerHeight, setFooterHeight] = useState(0)
  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const measure = () => {
      const next = el.getBoundingClientRect().height
      setFooterHeight((prev) => (Math.abs(prev - next) > 0.5 ? next : prev))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  })

  // The split panel gets the specific "who is over" message, not just
  // "分攤金額與支出金額不符".
  const { blockingError, descMissing, amountIssue } = expenseFormIssues(draft, members)
  // submitError is display-only: a failed save must leave the button enabled
  // so the user can retry without losing the draft.
  // Split/payer issues already render inline in SplitPanel, next to the rows
  // that need fixing. Repeating them in the fixed footer both duplicated the
  // warning and let the taller bar cover the last section.
  const footerError = amountIssue ?? props.submitError
  const amountLabel = formatCurrency(derived.splitInput.amount, state.currency)
  const submitLabel = props.mode === "create" ? `新增支出 · ${amountLabel}` : `儲存變更 · ${amountLabel}`

  const canConvert = props.projectCurrency != null && derived.rate != null && state.currency !== props.projectCurrency
  const displayCurrency = canConvert && showSettlement ? props.projectCurrency! : state.currency

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!blockingError && !descMissing) props.onSubmit()
      }}
    >
      <V2TopBar
        title={props.mode === "create" ? "新增支出" : "編輯支出"}
        backHref={`/projects/${props.projectId}`}
        actions={
          props.mode === "edit" && props.onRequestDelete ? (
            <button type="button" onClick={props.onRequestDelete} aria-label="刪除此筆" className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-v2-coral-soft text-v2-danger">
              <Trash2 className="h-[15px] w-[15px]" />
            </button>
          ) : undefined
        }
      />

      <ExpenseFormFields
        draft={draft}
        members={members}
        projectCurrency={props.projectCurrency}
        displayCurrency={displayCurrency}
        rateContext={props.rateContext}
        recentRates={props.recentRates}
        showNotifyLine={props.canNotifyLine}
        mode={props.mode}
        variant={variant}
      />

      <div style={{ height: footerHeight || 112 }} aria-hidden="true" />

      <div ref={footerRef} className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {footerError && <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">{footerError}</p>}
          {canConvert && (
            <div className="mb-2.5 flex items-center justify-between text-[12px] font-bold text-v2-ink-muted">
              <span>顯示幣別</span>
              <span role="group" aria-label="顯示幣別" className="inline-flex h-6 items-center rounded-full bg-v2-lake-tint p-0.5 text-[11px] font-bold">
                {[state.currency, props.projectCurrency!].map((code) => {
                  const active = code === displayCurrency
                  return (
                    <button key={code} type="button" aria-pressed={active} onClick={() => setShowSettlement(code === props.projectCurrency)} className={`flex h-full items-center rounded-full px-2.5 leading-none ${active ? "bg-v2-lake text-v2-on-lake" : "text-v2-lake"}`}>
                      {code}
                    </button>
                  )
                })}
              </span>
            </div>
          )}
          <button type="submit" disabled={!!blockingError || descMissing || props.submitting} className="w-full rounded-v2-md bg-v2-lake py-[15px] text-[15px] font-bold text-v2-on-lake disabled:opacity-40">
            {props.submitting ? "儲存中..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
