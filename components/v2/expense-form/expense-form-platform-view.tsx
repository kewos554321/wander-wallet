"use client"

// The production platform layout (Apple/Google-style list rows + detail sheet).
//
// The split model lives in one dedicated component, SplitPanel, rendered INLINE
// on the main screen (no sheet, no expand, no little links). The rest of the
// screen stays lean: amount → description → 分帳 panel → 選填（類別／日期／
// 地點／收據）→ save.
//
// Driven by the SAME `useExpenseDraft` as the rest of the form; the amount card
// + rate sheet are the untouched originals. The field body lives in
// ExpenseFormFields so the AI result page can reuse it.

import { useEffect, useRef, useState } from "react"
import { Trash2, AlertCircle } from "lucide-react"
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
  const { blockingError, descMissing, amountIssue, splitIssue } = expenseFormIssues(draft, members)
  // submitError is display-only: a failed save must leave the button enabled
  // so the user can retry without losing the draft.
  // The footer shows the first blocker (amount → split → draft error →
  // description) and lets the user jump to it. Split errors still render
  // inline too, but the footer is where the disabled action lives.
  const footerError = blockingError ?? (descMissing ? "請填寫描述" : null) ?? props.submitError
  const footerTarget: "amount" | "split" | "payer" | "description" | null = amountIssue
    ? "amount"
    : splitIssue
      ? "split"
      : blockingError
        ? "payer"
        : descMissing
          ? "description"
          : null
  const focusFooterTarget = () => {
    if (!footerTarget) return
    const id =
      footerTarget === "amount"
        ? "v2-amount"
        : footerTarget === "split"
          ? "expense-split-result"
          : footerTarget === "description"
            ? "after-desc"
            : "expense-payer-section"
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    if (el instanceof HTMLElement) el.focus({ preventScroll: true })
  }
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
          {footerError && (
            <div className="mb-2 flex items-start gap-2 rounded-v2-sm bg-v2-danger-wash px-2.5 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-v2-danger" aria-hidden="true" />
              <p role="alert" className="m-0 min-w-0 flex-1 text-[12px] font-semibold leading-4 text-v2-danger">
                {footerError}
              </p>
              {footerTarget && (
                <button
                  type="button"
                  onClick={focusFooterTarget}
                  className="min-h-[44px] shrink-0 self-center px-1 text-[12px] font-bold text-v2-danger underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-danger"
                >
                  查看
                </button>
              )}
            </div>
          )}
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
