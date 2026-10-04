"use client"

import { Calculator as CalculatorIcon } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import type { CurrencyCode } from "@/lib/constants/currencies"
import { SECTION_TITLE } from "./section-card"

interface AmountCardProps {
  amount: string
  currency: string
  onAmount: (value: string) => void
  onCurrency: (code: string) => void
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
  calculatorOpen = false,
  onToggleCalculator,
  calculator,
}: AmountCardProps) {
  const open = calculatorOpen
  return (
    <div
      className={`mx-4 mt-4 rounded-[20px] border px-5 py-[18px] shadow-[0_2px_8px_rgba(27,88,71,.07)] ${
        open ? "border-v2-lake bg-v2-lake" : "border-v2-lake-edge bg-v2-lake-tint"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <label
          htmlFor={open ? undefined : "v2-amount"}
          className={open ? "text-[13px] font-bold text-v2-paper opacity-85" : SECTION_TITLE}
        >
          輸入金額
        </label>
        <button
          type="button"
          onClick={onToggleCalculator}
          aria-label="開啟計算機"
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
            <CurrencySelect value={currency as CurrencyCode} onChange={(v) => onCurrency(v)} showName={false} />
          </div>
          <input
            id="v2-amount"
            aria-label="金額"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent font-v2-serif text-[36px] font-bold leading-[44px] tabular-nums outline-none"
          />
        </div>
      )}
    </div>
  )
}
