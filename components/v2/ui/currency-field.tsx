"use client"

import { ChevronDown } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/constants/currencies"

// A9b shows the short name (台幣); A13/A14 show the full name (新台幣) (D22).
const SHORT_NAMES: Record<string, string> = { TWD: "台幣" }
// D10: budget prefix is the settlement currency symbol, no thousand separators.
const SYMBOLS: Record<string, string> = { TWD: "NT$", JPY: "¥", USD: "$" }

export function currencyLabel(code: string, short = false): string {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  if (!info) return code
  if (short) return `${info.code} ${SHORT_NAMES[info.code] ?? info.name}`
  return `${info.code} ${info.name}`
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

// v2-styled select trigger over the shared CurrencySelect (v1 component untouched).
export function V2CurrencyField({
  value,
  onChange,
  disabled,
  short = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  short?: boolean
}) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="flex w-full items-center justify-between rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] font-semibold text-v2-ink"
      >
        <span>{currencyLabel(value, short)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-v2-ink-subtle" />
      </div>
      <CurrencySelect
        value={value as CurrencyCode}
        onChange={(next) => onChange(next)}
        disabled={disabled}
        className="absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  )
}
