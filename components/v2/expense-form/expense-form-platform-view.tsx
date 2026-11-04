"use client"

// The production platform layout (Apple/Google-style list rows + detail sheet).
//
// The split model lives in one dedicated component, SplitPanel, rendered INLINE
// on the main screen (no sheet, no expand, no little links). The rest of the
// screen stays lean: amount → description → 分帳 panel → 類別 → 選填 → save.
//
// Driven by the SAME `useExpenseDraft` as the rest of the form; the amount card
// + rate sheet are the untouched originals.

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Camera, Check, ChevronDown, ChevronRight, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { AmountCard } from "@/components/v2/expense-form/amount-card"
import { CalculatorPad } from "@/components/v2/expense-form/calculator-pad"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"
import { LocationPickerV2 } from "@/components/v2/expense-form/location-picker-v2"
import { RateSheet } from "@/components/v2/expense-form/rate-sheet"
import { useImageSource } from "@/components/v2/expense-form/use-image-source"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"
import { formatCurrency } from "@/lib/constants/currencies"
import { rateChip } from "@/components/v2/currency/format"
import type { DraftMember, useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import type { RecentRate } from "@/lib/recent-rates"
import { amountLimitNote, describeSplitIssue, maxAmountFor, normalizeAmountForCurrency, sanitizeAmountInput } from "@/components/v2/expense-form/split-guardrails"
import { SplitPanel } from "@/components/v2/expense-form/split-panel"

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
  const { state, actions, derived } = draft
  const [showCalculator, setShowCalculator] = useState(false)
  const [showSettlement, setShowSettlement] = useState(false)
  const [optionalOpen, setOptionalOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [amountNote, setAmountNote] = useState<string | null>(null)
  const [descTouched, setDescTouched] = useState(false)
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

  // Amount guardrails: never show a raw "abc" or an over-limit number, and say
  // why the field refused a key instead of silently dropping it.
  const amountNum = Number(state.amount)
  const amountIssue =
    state.amount.trim() === ""
      ? "請輸入金額"
      : !Number.isFinite(amountNum)
        ? "請輸入有效金額"
        : amountNum <= 0
          ? "金額必須大於 0"
          : amountNum > maxAmountFor(state.currency)
            ? `金額不可超過 ${formatCurrency(maxAmountFor(state.currency), state.currency)}`
            : null
  // The split panel gets the specific "who is over" message, not just
  // "分攤金額與支出金額不符".
  const splitIssue = describeSplitIssue(draft, members)
  // submitError is display-only: a failed save must leave the button enabled
  // so the user can retry without losing the draft.
  const blockingError = amountIssue ?? splitIssue ?? derived.error
  // Split/payer issues already render inline in SplitPanel, next to the rows
  // that need fixing. Repeating them in the fixed footer both duplicated the
  // warning and let the taller bar cover the last section.
  const footerError = amountIssue ?? props.submitError
  const descMissing = state.description.trim() === ""
  const amountLabel = formatCurrency(derived.splitInput.amount, state.currency)
  const submitLabel = props.mode === "create" ? `新增支出 · ${amountLabel}` : `儲存變更 · ${amountLabel}`

  const { rate, customRate, rateEditable: isForeign, rateKind, rateDate } = derived
  const canConvert = props.projectCurrency != null && rate != null && state.currency !== props.projectCurrency
  const displayCurrency = canConvert && showSettlement ? props.projectCurrency! : state.currency
  const chip = isForeign
    ? rateChip({ kind: rateKind, date: rateDate ?? (rateKind === "market" ? new Date() : null), now: new Date() })
    : null
  const previewProjectAmount = rate != null ? derived.splitInput.amount * rate : null
  const rateCtx =
    props.rateContext && props.projectCurrency && state.currency !== props.projectCurrency
      ? props.rateContext(state.currency)
      : { liveRate: null, liveTimestamp: null }

  // 收合時的可讀摘要：日期一定顯示，地點接在後面；收據另以 badge 呈現，
  // 不會被長地址截掉。
  const receiptImage = state.image.preview ?? state.image.image
  // Direct camera/gallery shortcuts on the receipt row: the sheet stays for
  // preview/removal, but the common actions skip it.
  const receiptSource = useImageSource({
    onChange: (file) => {
      if (state.image.preview) URL.revokeObjectURL(state.image.preview)
      actions.setImage({ image: null, pendingFile: file, preview: URL.createObjectURL(file) })
    },
  })
  const optParts = [format(state.expenseDate, "MM/dd"), state.location.location].filter((v): v is string =>
    Boolean(v),
  )
  const optSummary = optParts.join(" · ")

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

      {/* 金額 — 原版金額卡（含真實匯率面板），外層加上防呆 */}
      <AmountCard
        amount={state.amount}
        currency={state.currency}
        onAmount={(raw) => {
          const { value, limited } = sanitizeAmountInput(raw, state.currency)
          actions.setAmount(value)
          setAmountNote(amountLimitNote(limited, state.currency))
        }}
        onCurrency={(code) => {
          const { value, note } = normalizeAmountForCurrency(state.amount, code)
          actions.setAmount(value)
          actions.setCurrency(code)
          setAmountNote(note)
        }}
        projectCurrency={props.projectCurrency}
        previewProjectAmount={previewProjectAmount}
        rate={rate}
        rateEditable={isForeign}
        customRate={customRate}
        rateChip={chip}
        onOpenRate={isForeign ? () => setRateOpen(true) : undefined}
        calculatorOpen={showCalculator}
        onToggleCalculator={() => setShowCalculator((v) => !v)}
        calculator={
          <CalculatorPad
            initialValue={state.amount}
            onApply={(value: number) => {
              const { value: next, limited } = sanitizeAmountInput(String(value), state.currency)
              actions.setAmount(next)
              setAmountNote(amountLimitNote(limited, state.currency))
              setShowCalculator(false)
            }}
            onClose={() => setShowCalculator(false)}
          />
        }
      />
      {amountNote && (
        <p role="status" className="mx-4 mt-2 text-[11px] font-semibold text-v2-ink-muted">
          {amountNote}
        </p>
      )}

      {props.projectCurrency && isForeign && (
        <RateSheet
          open={rateOpen}
          onClose={() => setRateOpen(false)}
          fromCurrency={state.currency}
          toCurrency={props.projectCurrency}
          rate={rate}
          customRate={customRate}
          appliedKind={rateKind}
          liveRate={rateCtx.liveRate}
          liveTimestamp={rateCtx.liveTimestamp}
          recentRates={props.recentRates?.(state.currency) ?? []}
          onUseRate={(value, kind, date) => {
            actions.setExchangeRate(String(value))
            actions.setRatePinned(true)
            actions.setRateKind(kind)
            actions.setRateDate(kind === "market" ? date ?? null : null)
          }}
          onReset={() => {
            actions.setExchangeRate("")
            actions.setRatePinned(false)
            actions.setRateKind(null)
            actions.setRateDate(null)
          }}
        />
      )}

      {/* 描述 — 必填 */}
      <div className={`${SECTION_CARD} mt-4`}>
        <label htmlFor="after-desc" className={`block ${SECTION_TITLE} mb-1.5`}>
          描述 <span className="text-v2-danger">*</span>
        </label>
        <input
          id="after-desc"
          value={state.description}
          onChange={(e) => actions.setDescription(e.target.value)}
          onBlur={() => setDescTouched(true)}
          placeholder="這筆是什麼？例如：一蘭拉麵晚餐"
          className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] outline-none focus-visible:border-v2-lake"
        />
        {descMissing && descTouched && <p role="alert" className="mt-1.5 text-[11px] font-semibold text-v2-danger">請填寫描述，讓大家知道這筆是什麼</p>}
      </div>

      <CategoryPicker value={state.category} onChange={actions.setCategory} />

      {/* 分帳 — 專屬元件，直接內嵌。原/結算顯示只由底部那顆切換驅動 */}
      <SplitPanel members={members} draft={draft} displayCurrency={displayCurrency} variant={variant} />

      {/* 選填 — Material list: one row per field, whole row is the target */}
      <div className={SECTION_CARD}>
        <button
          type="button"
          onClick={() => setOptionalOpen((v) => !v)}
          aria-expanded={optionalOpen}
          className="flex min-h-[44px] w-full items-start gap-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[13px] font-bold text-v2-ink">日期 · 地點 · 收據圖片</span>
              {receiptImage && (
                <span
                  aria-label="已附加 1 張收據"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-v2-lake-tint px-2 py-0.5 text-[10px] font-bold text-v2-lake"
                >
                  <Paperclip className="h-3 w-3" aria-hidden="true" />1
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-normal text-v2-ink-muted">{optSummary}</span>
          </span>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-v2-ink-subtle transition-transform ${optionalOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {optionalOpen && (
          <div className="mt-3 border-t border-v2-line-soft">
            <div className="border-b border-v2-line-soft">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-[56px] w-full items-center gap-3 px-1 text-left transition-colors hover:bg-v2-lake-tint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
                  >
                    <CalendarIcon className="h-[18px] w-[18px] shrink-0 text-v2-ink-muted" aria-hidden="true" />
                    <span className="flex-1 text-[13px] font-medium text-v2-ink">支出日期</span>
                    <span className="truncate text-[13px] text-v2-ink-muted">
                      {format(state.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={state.expenseDate} onSelect={(d) => d && actions.setExpenseDate(d)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="border-b border-v2-line-soft">
              <LocationPickerV2 variant="row" value={state.location} onChange={actions.setLocation} />
            </div>

            <div className="flex min-h-[56px] items-center gap-2 px-1">
              <Paperclip className="h-[18px] w-[18px] shrink-0 text-v2-ink-muted" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 items-center gap-3 py-2">
                <span className="shrink-0 text-[13px] font-medium text-v2-ink">收據／照片</span>
                <span className="ml-auto text-[13px] text-v2-ink-muted">{receiptImage ? "1 張" : "未附加"}</span>
                {receiptImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={receiptImage} alt="收據照片" className="h-9 w-9 shrink-0 rounded-lg border border-v2-line object-cover" />
                )}
              </div>
              <button
                type="button"
                onClick={receiptSource.openCamera}
                aria-label="拍照"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-v2-ink-muted transition-colors hover:bg-v2-lake-tint hover:text-v2-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
              >
                <Camera className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={receiptSource.openGallery}
                aria-label="從相簿選擇"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-v2-ink-muted transition-colors hover:bg-v2-lake-tint hover:text-v2-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
              >
                <ImageIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>
            {receiptImage && (
              <div className="flex justify-end pb-1 pr-1">
                <button
                  type="button"
                  onClick={() => {
                    if (state.image.preview) URL.revokeObjectURL(state.image.preview)
                    actions.setImage({ image: null, pendingFile: null, preview: null })
                  }}
                  className="min-h-9 rounded-lg px-2 text-[11px] font-semibold text-v2-danger transition-colors hover:bg-v2-danger/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-danger"
                >
                  移除照片
                </button>
              </div>
            )}
            {receiptSource.error && (
              <p role="alert" className="px-1 pb-2 text-[11px] font-semibold text-v2-danger">
                {receiptSource.error}
              </p>
            )}
            {receiptSource.galleryInput}
            {receiptSource.camera}
          </div>
        )}
      </div>

      {props.canNotifyLine && (
        <label className="mx-4 mb-4 flex items-center gap-[10px] rounded-v2-md border border-v2-line bg-v2-surface px-[14px] py-3">
          <input
            type="checkbox"
            checked={state.notifyLine}
            onChange={(e) => actions.setNotifyLine(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-v2-check bg-v2-surface text-transparent peer-checked:border-v2-lake peer-checked:bg-v2-lake peer-checked:text-v2-on-lake"
          >
            <Check className="h-3 w-3" />
          </span>
          <span>
            <span className="block text-xs font-bold">通知 LINE 群組</span>
            <span className="mt-px block text-xs text-v2-ink-muted">
              {props.mode === "edit" ? "變更後自動發送通知到群組" : "儲存後自動發送通知到群組"}
            </span>
          </span>
        </label>
      )}

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
