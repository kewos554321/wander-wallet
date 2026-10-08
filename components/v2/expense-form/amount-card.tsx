"use client"

import { Calculator as CalculatorIcon } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import { formatCurrency, type CurrencyCode } from "@/lib/constants/currencies"

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
  /** Whether the rate can be edited for this expense. */
  rateEditable?: boolean
  onRate?: (value: string) => void
  /** True when the bound rate differs from the project's fixed rate. */
  customRate?: boolean
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
  rateEditable = false,
  onRate,
  customRate = false,
  calculatorOpen = false,
  onToggleCalculator,
  calculator,
}: AmountCardProps) {
  const open = calculatorOpen
  const showConversion = !open && !!projectCurrency && currency !== projectCurrency
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
              showName={false}
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
      {showConversion && previewProjectAmount != null && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-v2-paper/85">
          <span data-testid="amount-conversion">≈ {formatCurrency(previewProjectAmount, projectCurrency!)}</span>
          {rate != null && (
            <span className="inline-flex items-center gap-1">
              {customRate && (
                <span className="rounded-full bg-v2-paper/15 px-2 py-0.5 text-[10px] font-bold">自訂</span>
              )}
              <span>1 {currency} =</span>
              <input
                aria-label="匯率"
                inputMode="decimal"
                value={String(rate)}
                readOnly={!rateEditable}
                onChange={(e) => onRate?.(e.target.value)}
                className="w-24 rounded bg-v2-paper/10 px-1.5 py-0.5 text-right tabular-nums text-v2-paper outline-none"
              />
              <span>{projectCurrency}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
