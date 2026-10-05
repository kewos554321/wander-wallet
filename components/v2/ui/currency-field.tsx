"use client"

import { ChevronDown } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/constants/currencies"

// A9b shows the short name (台幣); A13/A14 show the full name (新台幣) (D22).
const SHORT_NAMES: Record<string, string> = { TWD: "台幣" }

export function currencyLabel(code: string, short = false): string {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  if (!info) return code
  if (short) return `${info.code} ${SHORT_NAMES[info.code] ?? info.name}`
  return `${info.code} ${info.name}`
}

// Amounts are labelled with the ISO 4217 3-letter code (TWD, JPY, USD…), never a
// symbol such as "NT$".
export function currencySymbol(code: string): string {
  return code
}

// Money prefixes (settlement budget, amount-range filter) use a plain "$" for
// TWD; every other currency uses its code.
export function moneySymbol(code: string): string {
  return code === "TWD" ? "$" : currencySymbol(code)
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
        className="flex w-full items-center justify-between rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] text-v2-ink"
      >
        <span className={short ? "font-bold" : "font-semibold"}>{currencyLabel(value, short)}</span>
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
