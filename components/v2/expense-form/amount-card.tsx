"use client"

import { Calculator as CalculatorIcon } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import type { CurrencyCode } from "@/lib/constants/currencies"

interface AmountCardProps {
  amount: string
  currency: string
  onAmount: (value: string) => void
  onCurrency: (code: string) => void
  onOpenCalculator: () => void
}

export function AmountCard({ amount, currency, onAmount, onCurrency, onOpenCalculator }: AmountCardProps) {
  return (
    <div className="mx-4 mt-4 rounded-[20px] border border-[#DCEAE3] bg-gradient-to-br from-v2-lake-soft to-v2-paper px-5 py-[18px] shadow-[0_2px_8px_rgba(27,88,71,.07)]">
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor="v2-amount" className="text-sm font-medium leading-5 tracking-[.1px]">
          輸入金額
        </label>
        <button
          type="button"
          onClick={onOpenCalculator}
          aria-label="開啟計算機"
          className="inline-flex items-center gap-1 rounded-full bg-v2-surface px-3.5 py-1.5 text-xs font-bold text-v2-lake shadow-[0_1px_2px_rgba(27,24,21,.06)]"
        >
          <CalculatorIcon className="h-3.5 w-3.5" aria-hidden="true" />
          計算機
        </button>
      </div>
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
    </div>
  )
}
