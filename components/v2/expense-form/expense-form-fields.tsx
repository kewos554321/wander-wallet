"use client"

// Shared body of the expense form: amount + rate sheet, required description,
// category, split panel, optional date/location/receipt section, and the LINE
// notification checkbox. The add-expense page and the AI result page render
// this same component so their fields cannot drift apart.
//
// Chevron rule (keep every row on this screen on the same logic):
//   ▼ ChevronDown  = expands content in place; rotate 180° while open.
//   › ChevronRight = opens another layer (bottom sheet / new page); never rotates.
// Rows that take effect immediately (chips, toggles, segments) carry no chevron.

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Camera, Check, ChevronDown, Image as ImageIcon, Paperclip } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AmountCard } from "@/components/v2/expense-form/amount-card"
import { CalculatorPad } from "@/components/v2/expense-form/calculator-pad"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"
import { LocationPickerV2 } from "@/components/v2/expense-form/location-picker-v2"
import { RateSheet } from "@/components/v2/expense-form/rate-sheet"
import { useImageSource } from "@/components/v2/expense-form/use-image-source"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"
import { SplitPanel } from "@/components/v2/expense-form/split-panel"
import { amountLimitNote, normalizeAmountForCurrency, sanitizeAmountInput } from "@/components/v2/expense-form/split-guardrails"
import { rateChip } from "@/components/v2/currency/format"
import type { Draft, DraftMember } from "@/lib/expense-draft"
import type { RecentRate } from "@/lib/recent-rates"

export interface ExpenseFormFieldsProps {
  draft: Draft
  members: DraftMember[]
  projectCurrency?: string
  /** Settlement preview currency for SplitPanel; omit to show the expense currency. */
  displayCurrency?: string
  rateContext?: (currency: string) => { liveRate: number | null; liveTimestamp: number | null }
  recentRates?: (currency: string) => RecentRate[]
  /** Pass false to hide the built-in LINE checkbox (AI batch footer owns it). */
  showNotifyLine?: boolean
  notifyLineLabel?: string
  mode?: "create" | "edit" | "quick"
  /** "ledger" is demo-only; production always uses "platform". */
  variant?: "ledger" | "platform"
}

export function ExpenseFormFields({
  draft,
  members,
  projectCurrency,
  displayCurrency,
  rateContext,
  recentRates,
  showNotifyLine = false,
  notifyLineLabel,
  mode = "create",
  variant = "platform",
}: ExpenseFormFieldsProps) {
  const { state, actions, derived } = draft
  const [showCalculator, setShowCalculator] = useState(false)
  const [optionalOpen, setOptionalOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [amountNote, setAmountNote] = useState<string | null>(null)
  const [descTouched, setDescTouched] = useState(false)

  const descMissing = state.description.trim() === ""
  const { rate, customRate, rateEditable: isForeign, rateKind, rateDate } = derived
  const chip = isForeign
    ? rateChip({ kind: rateKind, date: rateDate ?? (rateKind === "market" ? new Date() : null), now: new Date() })
    : null
  const previewProjectAmount = rate != null ? derived.splitInput.amount * rate : null
  const rateCtx =
    rateContext && projectCurrency && state.currency !== projectCurrency
      ? rateContext(state.currency)
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
  const lineLabel =
    notifyLineLabel ??
    (mode === "edit" ? "變更後自動發送通知到群組" : mode === "quick" ? "新增後自動發送通知到群組" : "儲存後自動發送通知到群組")

  return (
    <>
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
        projectCurrency={projectCurrency}
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

      {projectCurrency && isForeign && (
        <RateSheet
          open={rateOpen}
          onClose={() => setRateOpen(false)}
          fromCurrency={state.currency}
          toCurrency={projectCurrency}
          rate={rate}
          customRate={customRate}
          appliedKind={rateKind}
          liveRate={rateCtx.liveRate}
          liveTimestamp={rateCtx.liveTimestamp}
          recentRates={recentRates?.(state.currency) ?? []}
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
        {descMissing && descTouched && (
          <p role="alert" className="mt-1.5 text-[11px] font-semibold text-v2-danger">
            請填寫描述，讓大家知道這筆是什麼
          </p>
        )}
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
                    className="group flex min-h-[56px] w-full items-center gap-3 px-1 text-left transition-colors hover:bg-v2-lake-tint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
                  >
                    <CalendarIcon className="h-[18px] w-[18px] shrink-0 text-v2-ink-muted" aria-hidden="true" />
                    <span className="flex-1 text-[13px] font-medium text-v2-ink">支出日期</span>
                    <span className="truncate text-[13px] text-v2-ink-muted">
                      {format(state.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-v2-ink-subtle transition-transform group-data-[state=open]:rotate-180"
                      aria-hidden="true"
                    />
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

      {showNotifyLine && (
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
            <span className="mt-px block text-xs text-v2-ink-muted">{lineLabel}</span>
          </span>
        </label>
      )}
    </>
  )
}
