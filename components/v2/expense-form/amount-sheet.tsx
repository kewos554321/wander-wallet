"use client"

// PROTOTYPE (demo-only) — tapping a member's 共同分攤 amount opens this bottom
// sheet and focuses a numeric input, instead of editing inline. Mirrors the
// personal-items sheet's pattern (drag handle, member header, 完成 footer).

import { useEffect, useRef, useState } from "react"
import { RotateCcw, X } from "lucide-react"
import { memberTone } from "@/components/v2/expense-form/payer-picker"
import { MemberAvatar } from "@/components/v2/ui/member-avatar"
import { formatAmount } from "@/lib/constants/currencies"
import { derivePayerShares } from "@/lib/expense-payers"
import type { DraftMember, useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import { amountLimitNote, sanitizeAmountInput } from "./split-guardrails"

type Draft = ReturnType<typeof useExpenseDraft>

export function AmountSheet({
  open,
  onClose,
  members,
  draft,
  memberId,
  mode = "share",
}: {
  open: boolean
  onClose: () => void
  members: DraftMember[]
  draft: Draft
  memberId: string | null
  /** "share" = 共同分攤, "payer" = 誰付了多少. Same sheet, same interaction. */
  mode?: "share" | "payer"
}) {
  const { state, actions, derived } = draft
  const inputRef = useRef<HTMLInputElement>(null)
  // Scoped to a member so reopening the sheet for someone else never shows the
  // previous person's warning.
  const [note, setNote] = useState<{ memberId: string; text: string } | null>(null)
  const noteText = note?.memberId === memberId ? note.text : null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Focus + select the amount so the user can type straight over it.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.select(), 60)
    return () => clearTimeout(t)
  }, [open, memberId])

  if (!open || !memberId) return null

  const member = members.find((m) => m.id === memberId)
  const name = member?.displayName ?? ""
  const tone = memberTone(members.findIndex((m) => m.id === memberId))
  const money = (n: number) => `${n < 0 ? "−" : ""}$${formatAmount(Math.abs(n), state.currency)}`

  const isPayer = mode === "payer"
  const share = derived.shares.find((s) => s.memberId === memberId)?.shareAmount ?? 0
  const personal = state.personalMode
    ? (state.personalItems[memberId] ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0)
    : 0

  // Payer mode: what would this person pay if they weren't pinned? Drop only
  // their pin and re-derive, so the helper reflects the real auto split.
  const autoPayer = (() => {
    if (!isPayer) return 0
    const otherPins: Record<string, number> = {}
    for (const [id, raw] of Object.entries(state.pinnedPayerAmounts)) {
      if (id !== memberId && raw.trim() !== "") otherPins[id] = Number(raw) || 0
    }
    const result = derivePayerShares({
      amount: derived.splitInput.amount,
      payerIds: state.payerIds,
      pinned: otherPins,
      currency: state.currency,
    })
    return result.shares.find((s) => s.memberId === memberId)?.amount ?? 0
  })()

  const auto = isPayer ? autoPayer : Math.round((share - personal) * 100) / 100
  // An emptied input keeps its key but counts as auto, matching the table pin.
  const pinned = isPayer
    ? (state.pinnedPayerAmounts[memberId] ?? "").trim() !== ""
    : (state.customShares[memberId] ?? "").trim() !== ""
  const value = pinned
    ? isPayer
      ? state.pinnedPayerAmounts[memberId]
      : state.customShares[memberId]
    : String(auto)
  const setValue = (next: string) => (isPayer ? actions.setPayerAmount(memberId, next) : actions.setCustomShare(memberId, next))
  const reset = () => (isPayer ? actions.clearPayerAmount(memberId) : actions.clearCustomShare(memberId))

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isPayer ? `${name}的付款金額` : `${name}的共同分攤`}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col rounded-t-[20px] bg-v2-paper shadow-2xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-v2-check" aria-hidden="true" />
        <div className="flex items-center gap-3 border-b border-v2-line px-4 pb-3 pt-2">
          <MemberAvatar image={member?.image ?? null} name={name} placeholder={member?.isPlaceholder} className="h-8 w-8 shrink-0 rounded-full" fallbackClassName={`text-[12px] font-bold ${tone}`} iconClassName="h-4 w-4" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-v2-serif text-[16px] font-bold leading-tight text-v2-ink">{isPayer ? `${name} 付了多少` : `${name} 的共同分攤`}</h2>
            <p className="m-0 text-[11px] text-v2-ink-muted">{isPayer ? "輸入金額就會固定這一位，其他付款人自動平分剩下的" : "輸入金額就會固定這一位，其他人自動平分剩下的"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-v2-sand text-v2-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-5">
          <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-v2-lake bg-v2-surface px-3.5 py-3">
            <span className="text-[18px] font-bold text-v2-ink-muted">$</span>
            <input
              ref={inputRef}
              autoFocus
              inputMode="decimal"
              aria-label={isPayer ? `${name}的付款金額` : `${name}的共同分攤金額`}
              value={value}
              placeholder={String(auto)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const { value: next, limited } = sanitizeAmountInput(e.target.value, state.currency)
                setValue(next)
                const text = amountLimitNote(limited, state.currency)
                setNote(text ? { memberId, text } : null)
              }}
              className={`w-full min-w-0 bg-transparent text-right text-[24px] font-bold outline-none ${auto < -0.001 ? "text-v2-danger" : "text-v2-ink"}`}
            />
          </label>
          {noteText && <p className="m-0 mt-2 text-[11px] font-semibold text-v2-danger">{noteText}</p>}
          <p className={`m-0 mt-2 text-[11px] ${auto < -0.001 ? "font-semibold text-v2-danger" : "text-v2-ink-muted"}`}>
            自動平分會是 {money(auto)}
            {auto < -0.001 ? "（已超過支出總額）" : ""}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-v2-line bg-v2-surface px-4 py-3.5">
          {pinned ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-v2-lake"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              還原自動平分
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="rounded-[14px] bg-v2-lake px-8 py-[13px] text-[15px] font-bold text-v2-on-lake">
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
