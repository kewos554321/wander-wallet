"use client"

import { ChevronDown } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_SHORT_NAMES,
  type CurrencyCode,
} from "@/lib/constants/currencies"

export function currencyLabel(code: string, short = false): string {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  if (!info) return code
  if (short) return `${info.code} ${CURRENCY_SHORT_NAMES[info.code] ?? info.name}`
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

// Prefix for narrow money fields (split tables, per-person inputs). The section
// title names the real currency, so every currency uses the compact "$" here to
// keep numbers from wrapping at 320px.
export function moneyPrefix(): string {
  return "$"
}

// v2-styled select trigger over the shared CurrencySelect.
export function V2CurrencyField({
  value,
  onChange,
  disabled,
  short = false,
  placeholder,
  ariaLabel,
  exclude,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  short?: boolean
  placeholder?: string
  ariaLabel?: string
  exclude?: string[]
}) {
  return (
    <div className="group relative">
      <div
        aria-hidden="true"
        className="flex w-full items-center justify-between rounded-v2-md border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] text-v2-ink transition group-focus-within:border-v2-lake group-focus-within:ring-2 group-focus-within:ring-v2-lake/30"
      >
        <span className={`${short ? "font-bold" : "font-semibold"} ${value ? "" : "font-normal text-v2-ink-muted"}`}>
          {value ? currencyLabel(value, short) : placeholder ?? ""}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-v2-ink-muted" />
      </div>
      <CurrencySelect
        value={value as CurrencyCode}
        onChange={(next) => onChange(next)}
        disabled={disabled}
        ariaLabel={ariaLabel}
        exclude={exclude}
        className="absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  )
}
