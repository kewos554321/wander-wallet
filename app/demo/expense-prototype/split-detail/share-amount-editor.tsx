"use client"

// Brand-styled share amount editor. Borrows the UX (single amount field,
// auto/pinned helper, reset text button) but keeps the v2 amount field look.

import { useEffect, useRef, useState } from "react"
import { Pin, RotateCcw } from "lucide-react"
import { formatAmount } from "@/lib/constants/currencies"
import { amountLimitNote, sanitizeAmountInput } from "../guardrails"

export function ShareAmountEditor({
  currency,
  value,
  auto,
  pinned,
  onChange,
  onReset,
  autoFocus = false,
}: {
  currency: string
  value: string
  auto: number
  pinned: boolean
  onChange: (value: string) => void
  onReset: () => void
  autoFocus?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<string | null>(null)
  const money = (n: number) => `${n < 0 ? "−" : ""}$${formatAmount(Math.abs(n), currency)}`

  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => inputRef.current?.select(), 60)
    return () => clearTimeout(t)
  }, [autoFocus])

  return (
    <div className="my-2 rounded-xl bg-v2-sand px-3 py-3">
      <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-v2-lake bg-v2-surface px-3.5 py-2.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-v2-lake">
        <span className="text-[16px] font-bold text-v2-ink-muted" aria-hidden="true">$</span>
        {pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-v2-lake" aria-hidden="true" />}
        <input
          ref={inputRef}
          inputMode="decimal"
          aria-label="共同分攤金額"
          value={value}
          placeholder={String(auto)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const { value: next, limited } = sanitizeAmountInput(e.target.value, currency)
            onChange(next)
            setNote(amountLimitNote(limited, currency))
          }}
          className="w-full min-w-0 bg-transparent text-right text-[22px] font-bold tabular-nums text-v2-ink outline-none"
        />
      </label>
      {note && <p className="m-0 mt-2 text-[11px] font-semibold text-v2-danger">{note}</p>}
      <p className="m-0 mt-2 text-[11px] text-v2-ink-muted">
        {pinned ? "目前是固定金額；還原後會重新自動平分。" : `自動平分會是 ${money(auto)}`}
      </p>
      {pinned && (
        <button type="button" onClick={onReset} className="mt-2 inline-flex min-h-12 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-v2-lake hover:bg-v2-lake-tint">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          還原自動平分
        </button>
      )}
    </div>
  )
}
