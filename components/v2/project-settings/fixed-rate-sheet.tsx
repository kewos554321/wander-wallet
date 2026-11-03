"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { V2CurrencyField } from "@/components/v2/ui/currency-field"
import { roundRateForDisplay } from "@/lib/currency-conversion"
import { liveRateHint } from "@/components/v2/currency/format"

export interface FixedRateSheetProps {
  open: boolean
  onClose: () => void
  /** Settlement currency (the "to" side). */
  settlementCurrency: string
  /** Latest live rates, keyed by currency. */
  rates: Record<string, number>
  /** Currencies to hide from the add picker (already listed / the settlement one). */
  takenCurrencies: string[]
  /** Editing this currency's existing fixed rate, or null to add a new one. */
  editingCurrency: string | null
  /** Current value when editing. */
  initialValue: string
  onApply: (currency: string, value: string) => void
  onRemove: (currency: string) => void
}

/**
 * Bottom sheet for editing one project fixed rate. Adding prefills today's live
 * rate; editing keeps the stored value and offers 移除. The value is normalised
 * to 6 significant digits so a full-precision seed can't linger.
 */
export function FixedRateSheet({
  open,
  onClose,
  settlementCurrency,
  rates,
  takenCurrencies,
  editingCurrency,
  initialValue,
  onApply,
  onRemove,
}: FixedRateSheetProps) {
  const [currency, setCurrency] = useState("")
  const [value, setValue] = useState("")

  // Re-seed when the sheet opens.
  useEffect(() => {
    if (!open) return
    setCurrency(editingCurrency ?? "")
    setValue(editingCurrency ? initialValue : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const live = currency ? liveRateHint(rates, currency, settlementCurrency) : null
  const numeric = Number(value)
  const usable = value.trim() !== "" && Number.isFinite(numeric) && numeric > 0

  const pickCurrency = (next: string) => {
    setCurrency(next)
    const hint = liveRateHint(rates, next, settlementCurrency)
    setValue(hint != null ? String(hint) : "")
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-v2-overlay sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={editingCurrency ? "固定匯率" : "新增固定匯率"}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-v2-surface sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 pb-3.5 pt-5">
          <h2 className="m-0 text-[15px] font-bold text-v2-ink">{editingCurrency ? "固定匯率" : "新增固定匯率"}</h2>
          <button
            type="button"
            aria-label="關閉固定匯率"
            onClick={onClose}
            className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-v2-ink-subtle"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="px-5 pb-2">
          {!editingCurrency && (
            <div className="mb-3">
              <V2CurrencyField
                value={currency}
                onChange={pickCurrency}
                placeholder="選擇幣別"
                ariaLabel="幣別"
                exclude={[settlementCurrency, ...takenCurrencies]}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2.5 rounded-[14px] border border-v2-line p-3.5">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-[13px] text-v2-ink-muted">1 {currency || "—"} =</span>
              <input
                aria-label="匯率"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right font-v2-serif text-base font-bold tabular-nums text-v2-ink outline-none"
              />
              <span className="shrink-0 text-[13px] text-v2-ink-muted">{settlementCurrency}</span>
            </label>
          </div>
          {currency && (
            <p className="m-0 mt-2 text-xs text-v2-ink-muted">
              {live != null ? `即時匯率：1 ${currency} = ${live} ${settlementCurrency}` : "即時匯率讀取中…"}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-v2-line-soft px-5 py-3.5">
          {editingCurrency && (
            <button
              type="button"
              aria-label="移除固定匯率"
              onClick={() => onRemove(editingCurrency)}
              className="flex-1 rounded-[13px] border border-v2-line py-3 text-sm font-bold text-v2-ink"
            >
              移除
            </button>
          )}
          <button
            type="button"
            aria-label="完成"
            disabled={!currency || !usable}
            onClick={() => onApply(currency, String(roundRateForDisplay(numeric)))}
            className="flex-[1.4] rounded-[13px] bg-v2-lake py-3 text-sm font-bold text-v2-on-lake disabled:opacity-40"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
