"use client"

import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/constants/currencies"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CurrencySelectProps {
  value: CurrencyCode
  onChange: (value: CurrencyCode) => void
  disabled?: boolean
  showName?: boolean
  className?: string
  ariaLabel?: string
  exclude?: string[]
}

export function CurrencySelect({
  value,
  onChange,
  disabled,
  showName = true,
  className,
  ariaLabel,
  exclude,
}: CurrencySelectProps) {
  const selectedCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === value)
  const options = exclude && exclude.length > 0 ? SUPPORTED_CURRENCIES.filter((c) => !exclude.includes(c.code)) : SUPPORTED_CURRENCIES

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as CurrencyCode)}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue>
          {selectedCurrency && (
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-inherit">{selectedCurrency.code}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="flex items-center gap-2">
              <span className="font-mono w-12 text-base">{currency.code}</span>
              {showName && (
                <span className="text-muted-foreground text-sm">
                  {currency.name}
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
