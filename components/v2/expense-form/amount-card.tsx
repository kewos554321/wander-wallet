"use client"

import { Calculator as CalculatorIcon, Pin, PinOff } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import { formatCurrency, type CurrencyCode } from "@/lib/constants/currencies"
import { roundRateForDisplay } from "@/lib/currency-conversion"

interface AmountCardProps {
  amount: string
  currency: string
  onAmount: (value: string) => void
  onCurrency: (code: string) => void
  /** Settlement currency; when it differs, a converted preview + rate row show. */
  projectCurrency?: string
  /** Approximate settlement amount for the current input (server value wins on save). */
  previewProjectAmount?: number | null
  /** The bound rate for this expense. */
  rate?: number | null
  /** Controlled text for the rate input (kept while typing, may be invalid/empty). */
  rateInput?: string
  /** Whether the rate can be edited for this expense. */
  rateEditable?: boolean
  onRate?: (value: string) => void
  /** True when the bound rate differs from the project's fixed rate. */
  customRate?: boolean
  /** Where the rate came from (for the label). */
  rateSource?: "same" | "fixed" | "live" | "none" | "custom"
  /** Toggle between the automatic rate and a custom one. */
  onToggleCustomRate?: () => void
  /**
   * When provided, the whole rate row becomes a button that opens the rate
   * editor sheet instead of the inline input + pin (used by the expense form).
   */
  onOpenRate?: () => void
  /** Whether the in-card calculator slot is open. Defaults to closed. */
  calculatorOpen?: boolean
  /** Toggles the in-card calculator slot. */
  onToggleCalculator?: () => void
  /** Rendered inside the card, between the header and the value row, when open. */
  calculator?: React.ReactNode
}

export function AmountCard({
  amount,
  currency,
  onAmount,
  onCurrency,
  projectCurrency,
  previewProjectAmount,
  rate,
  rateInput,
  rateEditable = false,
  onRate,
  customRate = false,
  rateSource,
  onToggleCustomRate,
  onOpenRate,
  calculatorOpen = false,
  onToggleCalculator,
  calculator,
}: AmountCardProps) {
  const open = calculatorOpen
  const showConversion = !open && !!projectCurrency && currency !== projectCurrency
  const rateSourceLabel = customRate
    ? "自訂匯率"
    : rateSource === "fixed"
      ? "專案固定匯率"
      : rateSource === "live"
        ? "即時匯率"
        : ""
  return (
    // The amount card shares the calculator's dark lake face in both states so
    // opening the calculator reads as a continuation of the same surface.
    <div
      data-testid="amount-card"
      className="mx-4 mt-4 rounded-[20px] border border-v2-lake bg-v2-lake px-5 py-[18px] shadow-[0_2px_8px_rgba(27,88,71,.07)]"
    >
      <div className="mb-3 flex items-center justify-between">
        {open ? (
          <span className="text-[13px] font-bold text-v2-paper opacity-85">輸入金額</span>
        ) : (
          <label htmlFor="v2-amount" className="text-[13px] font-bold text-v2-paper">
            輸入金額
          </label>
        )}
        <button
          type="button"
          onClick={onToggleCalculator}
          aria-label={open ? "關閉計算機" : "開啟計算機"}
          className="inline-flex items-center gap-1 rounded-full bg-v2-paper px-3.5 py-1.5 text-xs font-bold text-v2-lake shadow-[0_1px_2px_rgba(27,24,21,.06)]"
        >
          <CalculatorIcon className="h-3.5 w-3.5" aria-hidden="true" />
          計算機
        </button>
      </div>
      {open && calculator}
      {!open && (
        <div className="flex items-center gap-2.5">
          <div className="shrink-0">
            <CurrencySelect
              value={currency as CurrencyCode}
              onChange={(v) => onCurrency(v)}
              className="border-v2-paper bg-v2-paper text-v2-lake [&_svg:not([class*='text-'])]:text-v2-lake"
            />
          </div>
          <input
            id="v2-amount"
            aria-label="金額"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent font-v2-serif text-[36px] font-bold leading-[44px] tabular-nums text-v2-paper outline-none placeholder:text-v2-paper/50"
          />
        </div>
      )}
      {showConversion && (
        <div data-testid="conversion-row" className="mt-2 flex flex-col gap-1 text-[12px] text-v2-paper/85">
          <span data-testid="amount-conversion">
            {previewProjectAmount != null ? `≈ ${formatCurrency(previewProjectAmount, projectCurrency!)}` : "≈ —"}
          </span>
          {onOpenRate ? (
            <button
              type="button"
              data-testid="rate-row"
              onClick={onOpenRate}
              className="-my-1 inline-flex w-full flex-wrap items-center gap-1 rounded-lg px-1.5 py-1 text-left transition hover:bg-v2-paper/10"
            >
              <span className="text-[10px] opacity-80" data-testid="rate-source">
                {rateSourceLabel}
              </span>
              <span>1 {currency} =</span>
              <span className="tabular-nums">{rate != null ? roundRateForDisplay(rate) : "—"}</span>
              <span>{projectCurrency}</span>
              <span className="ml-auto text-[11px] font-bold opacity-90">調整</span>
            </button>
          ) : (
            <span data-testid="rate-row" className="inline-flex flex-wrap items-center gap-1">
              <span className="text-[10px] opacity-80" data-testid="rate-source">
                {rateSourceLabel}
              </span>
              <span>1 {currency} =</span>
              {customRate && rateEditable ? (
                <input
                  aria-label="匯率"
                  inputMode="decimal"
                  value={rateInput ?? ""}
                  onChange={(e) => onRate?.(e.target.value)}
                  className="w-20 rounded bg-v2-paper/10 px-1.5 py-0.5 text-right tabular-nums text-v2-paper outline-none"
                />
              ) : (
                <span className="tabular-nums">{rate != null ? roundRateForDisplay(rate) : "—"}</span>
              )}
              <span>{projectCurrency}</span>
              {rateEditable && (
                <button
                  type="button"
                  onClick={onToggleCustomRate}
                  aria-label={customRate ? "匯率使用自訂，點擊還原自動" : "匯率自動，點擊自訂匯率"}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded ${
                    customRate ? "bg-v2-paper text-v2-lake" : "border border-v2-paper/50 text-v2-paper/80"
                  }`}
                >
                  {customRate ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                </button>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
