"use client"

// PROTOTYPE (demo-only) — ONE person's personal items, in a bottom sheet (like
// the rate panel): opened from that member's row. The main card only shows the
// person's sum; the detail lives here.

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { memberTone } from "@/components/v2/expense-form/payer-picker"
import { MemberAvatar } from "@/components/v2/ui/member-avatar"
import { formatAmount } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import { isTouchedItem } from "./personal-item-state"
import { PersonalItemsEditor } from "./split-detail/personal-items-editor"

type Draft = ReturnType<typeof useExpenseDraft>

export function PersonalItemsSheet({
  open,
  onClose,
  members,
  draft,
  memberId,
}: {
  open: boolean
  onClose: () => void
  members: DraftMember[]
  draft: Draft
  memberId: string | null
}) {
  const { state, actions } = draft
  const [note, setNote] = useState<{ memberId: string; text: string } | null>(null)
  const noteText = note?.memberId === memberId ? note.text : null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      // Escape must run the same cleanup as X/backdrop: drop blank placeholders
      // so a dismissed sheet cannot leave a form-blocking ghost row.
      if (memberId) {
        const items = state.personalItems[memberId] ?? []
        for (const item of items) {
          if (!isTouchedItem(item)) actions.removeItem(memberId, item.id)
        }
      }
      onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, memberId, state.personalItems, actions])

  if (!open || !memberId) return null

  const member = members.find((m) => m.id === memberId)
  const name = member?.displayName ?? ""
  const tone = memberTone(members.findIndex((m) => m.id === memberId))
  const items = state.personalItems[memberId] ?? []
  // Blank rows are placeholders: drop them on close so "no items" really means none.
  const close = () => {
    for (const item of items) {
      if (!isTouchedItem(item)) actions.removeItem(memberId, item.id)
    }
    onClose()
  }
  const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const money = (n: number) => `$${formatAmount(n, state.currency)}`

  const addItem = () => {
    if (!state.personalMode) actions.setPersonalMode(true)
    if (state.personalMembers.includes(memberId)) actions.addItem(memberId)
    else actions.togglePersonalMember(memberId)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${name}的個人項目`}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col rounded-t-[20px] bg-v2-paper shadow-2xl"
        style={{ maxHeight: "85vh" }}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-v2-check" aria-hidden="true" />
        <div className="flex items-center gap-3 border-b border-v2-line px-4 pb-3 pt-2">
          <MemberAvatar image={member?.image ?? null} name={name} placeholder={member?.isPlaceholder} className="h-8 w-8 shrink-0 rounded-full" fallbackClassName={`text-[12px] font-bold ${tone}`} iconClassName="h-4 w-4" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-v2-serif text-[16px] font-bold leading-tight text-v2-ink">{name} 的個人項目</h2>
            <p className="m-0 text-[11px] text-v2-ink-muted">先記下來，剩下的再由大家共同分攤</p>
          </div>
          <button type="button" onClick={close} aria-label="關閉" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-v2-sand text-v2-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <PersonalItemsEditor
            items={items}
            currency={state.currency}
            onAdd={addItem}
            onName={(id, value) => actions.updateItem(memberId, id, "name", value)}
            onAmount={(id, value) => actions.updateItem(memberId, id, "amount", value)}
            onRemove={(id) => actions.removeItem(memberId, id)}
            onLimitNote={(text) => setNote(text ? { memberId, text } : null)}
            limitNoteId="personal-limit-note"
          />
          {noteText && (
            <p id="personal-limit-note" role="status" aria-live="polite" className="m-0 mt-2 text-[11px] font-semibold text-v2-danger">
              {noteText}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-v2-line bg-v2-surface px-4 py-3.5">
          <span className="text-[13px] font-semibold text-v2-ink-muted">
            小計 <span className="font-bold text-v2-ink">{money(sum)}</span>
          </span>
          <button type="button" onClick={close} className="min-h-12 rounded-[14px] bg-v2-lake px-8 text-[15px] font-bold text-v2-on-lake">
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
