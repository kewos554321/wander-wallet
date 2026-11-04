"use client"

// Brand-styled personal items editor. The UX is borrowed from Material lists
// (one add entry, inline errors, 48dp targets), but the inputs, colors,
// type and button shapes stay on the app's v2 theme.

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { moneyPrefix } from "@/components/v2/ui/currency-field"
import type { SplitDraftItem } from "@/lib/split-draft"
import { amountLimitNote, sanitizeAmountInput } from "../split-guardrails"
import { isIncompleteItem } from "../personal-item-state"

const itemInput = "min-w-0 rounded-xl border border-v2-line bg-v2-surface px-3 py-2.5 text-[13px] outline-none focus:border-v2-lake"
const itemInputError = "border-v2-danger"
const addButton = "inline-flex min-h-12 items-center gap-1 rounded-lg px-3 text-[13px] font-bold text-v2-lake hover:bg-v2-lake-tint"

function errorText(nameMissing: boolean, amountMissing: boolean): string {
  if (nameMissing && amountMissing) return "請填寫名稱與金額"
  if (nameMissing) return "請填寫名稱"
  return "請填寫金額"
}

export function PersonalItemsEditor({
  items,
  currency,
  onAdd,
  onName,
  onAmount,
  onRemove,
  onLimitNote,
  limitNoteId,
}: {
  items: SplitDraftItem[]
  currency: string
  onAdd: () => void
  onName: (id: string, value: string) => void
  onAmount: (id: string, value: string) => void
  onRemove: (id: string) => void
  onLimitNote: (text: string | null) => void
  /** id of the parent-owned live region that announces a clamped amount. */
  limitNoteId?: string
}) {
  const [limit, setLimit] = useState<{ itemId: string; text: string } | null>(null)
  const setAmount = (id: string, raw: string) => {
    const { value, limited } = sanitizeAmountInput(raw, currency)
    const text = amountLimitNote(limited, currency)
    onAmount(id, value)
    setLimit(text ? { itemId: id, text } : null)
    onLimitNote(text)
  }

  return (
    <div className="my-2 rounded-xl bg-v2-sand px-3 py-2">
      {items.length === 0 ? (
        <div className="flex min-h-12 items-center justify-between gap-3">
          <span className="text-[13px] text-v2-ink-muted">尚未新增品項</span>
          <button type="button" onClick={onAdd} className={addButton}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增品項
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-v2-line-soft">
            {items.map((item, idx) => {
              const nameMissing = !item.name.trim()
              const amountMissing = item.amount.trim() === "" || Number(item.amount) <= 0
              const incomplete = isIncompleteItem(item)
              const errorId = `${item.id}-item-error`
              return (
                <div key={item.id} className="py-2">
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`品項名稱 ${idx + 1}`}
                      placeholder="品項名稱"
                      maxLength={30}
                      value={item.name}
                      onChange={(e) => onName(item.id, e.target.value)}
                      aria-invalid={nameMissing && incomplete ? "true" : undefined}
                      aria-describedby={nameMissing && incomplete ? errorId : undefined}
                      className={`${itemInput} flex-[2] ${nameMissing && incomplete ? itemInputError : ""}`}
                    />
                    <label className={`${itemInput} flex flex-1 items-center gap-1 ${amountMissing && incomplete ? itemInputError : ""}`}>
                      <span className="text-v2-ink-muted" aria-hidden="true">{moneyPrefix()}</span>
                      <input
                        aria-label={`品項金額 ${idx + 1}`}
                        placeholder="金額"
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(e) => setAmount(item.id, e.target.value)}
                        aria-invalid={amountMissing && incomplete ? "true" : limit?.itemId === item.id ? "true" : undefined}
                        aria-describedby={amountMissing && incomplete ? errorId : limit?.itemId === item.id ? limitNoteId : undefined}
                        className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      aria-label="刪除項目"
                      onClick={() => onRemove(item.id)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-v2-ink-subtle hover:bg-v2-lake-tint hover:text-v2-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {incomplete && (
                    <p id={errorId} className="m-0 mt-1 text-[11px] font-semibold text-v2-danger">
                      {errorText(nameMissing, amountMissing)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <button type="button" onClick={onAdd} className={`${addButton} mt-1`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增品項
          </button>
        </>
      )}
    </div>
  )
}
