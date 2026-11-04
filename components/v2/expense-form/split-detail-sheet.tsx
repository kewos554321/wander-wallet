"use client"

// One shared sheet for BOTH parts of a member's split (product + demo).
// The two summary rows are brand-styled accordions with Material-like UX
// behavior: one value, supporting text, aria wiring, focus management.
// Editors keep the app's v2 theme; only the interaction patterns are borrowed.

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { V2Avatar, avatarSeed } from "@/components/v2/ui/v2-avatar"
import { formatAmount } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import { countIncompleteItems, isTouchedItem } from "./personal-item-state"
import { PersonalItemsEditor } from "./split-detail/personal-items-editor"
import { ShareAmountEditor } from "./split-detail/share-amount-editor"
import { SheetSectionRow } from "./split-detail/sheet-section-row"

type Draft = ReturnType<typeof useExpenseDraft>

export function SplitDetailSheet({
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
  const { state, actions, derived } = draft
  const [section, setSection] = useState<"personal" | "share" | null>(null)
  const [note, setNote] = useState<{ section: "personal"; text: string } | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<() => void>(() => {})
  const previousFocus = useRef<HTMLElement | null>(null)

  const close = () => {
    if (memberId) {
      // "No items" should really mean no items: drop untouched placeholder rows.
      const items = state.personalItems[memberId] ?? []
      for (const item of items) {
        if (!isTouchedItem(item)) actions.removeItem(memberId, item.id)
      }
    }
    onClose()
  }
  useEffect(() => {
    closeRef.current = close
  })

  // Focus enters the sheet, Tab stays inside, Escape closes, and closing
  // returns focus to the row that opened it.
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== "Tab") return
      const root = sheetRef.current
      if (!root) return
      const focusable = [...root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previousFocus.current?.focus?.()
    }
  }, [open])

  if (!open || !memberId) return null

  const member = members.find((m) => m.id === memberId)
  const name = member?.displayName ?? ""
  const money = (n: number) => `${n < 0 ? "−" : ""}$${formatAmount(Math.abs(n), state.currency)}`

  const items = state.personalItems[memberId] ?? []
  const personal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const total = derived.shares.find((share) => share.memberId === memberId)?.shareAmount ?? 0
  const common = Math.round((total - personal) * 100) / 100
  const commonPinned = (state.customShares[memberId] ?? "").trim() !== ""
  const hasInvalidItems = countIncompleteItems(items) > 0

  const addItem = () => {
    if (!state.personalMode) actions.setPersonalMode(true)
    if (state.personalMembers.includes(memberId)) actions.addItem(memberId)
    else actions.togglePersonalMember(memberId)
  }

  const openSection = (next: "personal" | "share") => {
    setSection((current) => (current === next ? null : next))
    setNote(null)
  }

  const personalSupporting = hasInvalidItems ? "尚未填完" : personal > 0 ? "個人項目先扣" : undefined
  // A fixed share is communicated by the pin beside the value, not a second
  // status sentence; auto still gets a short supporting line.
  const hasAnyPersonal =
    state.personalMode &&
    Object.values(state.personalItems).some((items) =>
      items.some((item) => item.name.trim() !== "" || item.amount.trim() !== ""),
    )
  const shareLabel = commonPinned ? "固定金額" : hasAnyPersonal ? "剩餘均分" : "均分"

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-v2-ink/40" onClick={close} aria-hidden="true" />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-detail-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92vh] max-w-md flex-col rounded-t-v2-lg bg-v2-paper shadow-2xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-v2-check" aria-hidden="true" />
        <div className="flex items-center gap-3 border-b border-v2-line px-4 pb-3 pt-2">
          <V2Avatar image={member?.image ?? null} name={name} seed={avatarSeed(member?.userId, memberId)} variant={member?.isCurrentUser ? "brand" : undefined} placeholder={member?.isPlaceholder} className="h-8 w-8 shrink-0 rounded-full" fallbackClassName="text-[12px] font-bold" />
          <div className="min-w-0 flex-1">
            <h2 id="split-detail-title" className="m-0 font-v2-serif text-[16px] font-bold leading-tight text-v2-ink">{name} 的分帳明細</h2>
            <p className="m-0 text-[11px] text-v2-ink-muted">個人項目先扣，剩下的再均分</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="關閉"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-v2-sand text-v2-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] flex-1 overflow-y-auto px-4 py-2">
          <SheetSectionRow
            id="personal"
            label="個人項目"
            value={<span className={personal > 0 ? "text-v2-lake" : "text-v2-ink-subtle"}>{personal > 0 ? money(personal) : "—"}</span>}
            supporting={personalSupporting}
            expanded={section === "personal"}
            onToggle={() => openSection("personal")}
          >
            <PersonalItemsEditor
              items={items}
              currency={state.currency}
              onAdd={addItem}
              onName={(id, value) => actions.updateItem(memberId, id, "name", value)}
              onAmount={(id, value) => actions.updateItem(memberId, id, "amount", value)}
              onRemove={(id) => actions.removeItem(memberId, id)}
              onLimitNote={(text) => setNote(text ? { section: "personal", text } : null)}
              limitNoteId="personal-limit-note"
            />
            {note?.section === "personal" && (
              <p id="personal-limit-note" role="status" aria-live="polite" className="m-0 px-1 pb-2 text-[11px] font-semibold text-v2-danger">
                {note.text}
              </p>
            )}
          </SheetSectionRow>

          <SheetSectionRow
            id="share"
            label={shareLabel}
            value={
              <span className={`inline-flex items-center gap-1 ${common < 0 ? "text-v2-danger" : ""}`}>
                {money(common)}
              </span>
            }
            expanded={section === "share"}
            onToggle={() => openSection("share")}
          >
            <ShareAmountEditor
              currency={state.currency}
              value={commonPinned ? state.customShares[memberId] : String(common)}
              auto={common}
              pinned={commonPinned}
              onChange={(value) => actions.setCustomShare(memberId, value)}
              onReset={() => actions.clearCustomShare(memberId)}
              autoLabel={shareLabel}
              autoFocus
            />
          </SheetSectionRow>

          <div className="flex items-center justify-between gap-3 border-t border-v2-line-soft pt-3">
            <span className="text-[13px] font-bold text-v2-ink">小計</span>
            <span className={`text-[16px] font-bold tabular-nums ${total < 0 ? "text-v2-danger" : "text-v2-ink"}`}>{money(total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-v2-line bg-v2-surface px-4 py-3.5">
          <span className="text-[11px] font-semibold text-v2-danger" role={hasInvalidItems ? "alert" : undefined}>
            {hasInvalidItems ? "個人項目尚未填完" : ""}
          </span>
          <button
            type="button"
            onClick={close}
            disabled={hasInvalidItems}
            className="min-h-12 rounded-v2-md bg-v2-lake px-8 text-[15px] font-bold text-v2-on-lake disabled:opacity-40"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
