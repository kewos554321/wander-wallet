"use client"

// PROTOTYPE (demo-only) — the dedicated 分帳 component, INLINE (method B).
//
// One member list holds everything: who splits, how much each owes, and a sum of
// each person's own items. Reading order = the real maths (個人項目 deducted
// first, remainder split):
//   誰付這筆 [多人付款] → 共同分攤(剩餘) [全選][個人項目] → 每位成員一列
//   → 結果
//
//   · 多人付款 switch: off = one payer; on = multi payer with amount rows.
//   · 個人項目 switch: opt-in. On → each row's `›` opens a bottom sheet (like the
//     rate panel) to edit THAT person's items; the card only shows the sum.
//   · The ONLY 原/結算 switch is the footer toggle (see the after-view): when it
//     is set to the settlement currency, this card renders a read-only ≈ preview.

import { useEffect, useState } from "react"
import { CheckCircle2, ChevronRight, Pin } from "lucide-react"
import { memberPillClass, memberTone } from "@/components/v2/expense-form/payer-picker"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"
import { MemberAvatar } from "@/components/v2/ui/member-avatar"
import { formatAmount } from "@/lib/constants/currencies"
import { fromMinorUnits, roundMajorToMinor } from "@/lib/currency-conversion"
import type { DraftMember, useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import { describeSplitIssue } from "./guardrails"
import { PersonalItemsSheet } from "./personal-items-sheet"
import { AmountSheet } from "./amount-sheet"
import { SplitDetailSheet } from "./split-detail-sheet"

type Draft = ReturnType<typeof useExpenseDraft>

const rowsBox = "overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper"
// Per-cell outline helper. Empty = off (was used as a temporary inspection aid).
const cellOutline = ""
// Both ledgers (誰付這筆 / 誰一起分) share the same header, row and money styling.
const simpleGridCols = "grid-cols-[1.5rem_3.5rem_5.5rem]"
const centeredSimple = `${simpleGridCols} mx-auto w-fit`
const payerGridCols = centeredSimple
const amountButton = "flex min-w-0 items-center whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-bold tabular-nums leading-tight underline decoration-v2-check underline-offset-4 hover:bg-v2-lake-tint"
const nameCell = "min-w-0 truncate text-[13px] font-semibold"
const personalCell = "min-w-0 whitespace-nowrap pr-2 text-right"
const amountCell = "flex min-w-0 items-center justify-end gap-1"
const totalCell = "min-w-0 whitespace-nowrap text-right text-[12px] font-bold tabular-nums leading-tight"
// Platform style (Apple/Google list): label left, one value + chevron right.
const platformGrid = "grid-cols-[1.5rem_minmax(0,1fr)_7rem]"
const platformDetail = "inline-flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap text-[12px] font-bold tabular-nums leading-tight"

export function SplitPanel({
  members,
  draft,
  displayCurrency,
  variant = "ledger",
}: {
  members: DraftMember[]
  draft: Draft
  /** When set to the settlement currency, this card shows a read-only ≈ preview. */
  displayCurrency?: string
  /** "ledger" = centered multi-column table; "platform" = list row + detail sheet. */
  variant?: "ledger" | "platform"
}) {
  const { state, actions, derived } = draft
  const platform = variant === "platform"
  const [amountSheetId, setAmountSheetId] = useState<string | null>(null)
  const [payerAmountSheetId, setPayerAmountSheetId] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [confirmPersonalOff, setConfirmPersonalOff] = useState(false)

  // Platform mode has no global 個人項目 switch: items are added per member in
  // the detail sheet, so the split must count them as soon as they exist.
  useEffect(() => {
    if (platform && !state.personalMode) actions.setPersonalMode(true)
  }, [platform, state.personalMode, actions])

  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  const tone = (id: string) => memberTone(members.findIndex((m) => m.id === id))
  const memberOf = (id: string) => members.find((m) => m.id === id)

  // Settlement preview: the ONLY switch is the footer toggle; it drives this.
  const rate = derived.rate
  const viewCurrency = displayCurrency ?? state.currency
  const settleView = displayCurrency != null && displayCurrency !== state.currency && rate != null
  const view = (n: number) => (settleView ? roundMajorToMinor(n * (rate as number), viewCurrency) : n)
  // Money never wraps mid-number: a split "$-50," / "565" reads as two numbers.
  // Inside the table the currency symbol is dropped (the card title and the
  // footer already name the currency), which buys each cell ~7px — enough for a
  // 7-digit amount at 320px without shrinking the type or wrapping.
  const money = (n: number) => {
    const v = view(n)
    return `${settleView ? "≈" : ""}${v < 0 ? "−" : ""}$${formatAmount(Math.abs(v), viewCurrency)}`
  }
  const cellAmount = (n: number) => {
    const v = view(n)
    return `${v < 0 ? "−" : ""}${formatAmount(Math.abs(v), viewCurrency)}`
  }

  const pool = state.pool
  // CSS grid keeps the column header and every row on identical columns.
  // Avatars stay (they're quicker to recognise than names); the money columns
  // borrow width from each other so a 6-digit total still fits on one line at
  // 320px. 小計 gets the widest flexible share because it's the longest number.
  // Name takes the slack; money columns size to their content and right-align,
  // so numbers line up like a receipt instead of floating in wide empty cells.
  const gridCols = state.personalMode
    ? "grid-cols-[1.5rem_minmax(2.25rem,4rem)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)_minmax(3.25rem,1fr)]"
    : centeredSimple
  const hasPersonal = state.personalMode && state.personalMembers.some((id) => (state.personalItems[id]?.length ?? 0) > 0)
  // The common share is a remainder after ALL members' personal items, so the
  // method label is global: 剩餘均分 for everyone once anyone has items.
  const hasAnyPersonal =
    state.personalMode &&
    Object.values(state.personalItems).some((items) =>
      items.some((item) => item.name.trim() !== "" || item.amount.trim() !== ""),
    )
  const remaining = derived.splitInput.amount - derived.personalTotal

  // Pool portion per member (their share minus their own personal items). Auto
  // members update live when someone else is fixed.
  // Only counted while 個人項目 is on — otherwise the items are hidden and must
  // not keep subtracting, or the visible columns stop summing. [P1-c]
  const personalOf = (id: string) =>
    (state.personalMode ? state.personalItems[id] ?? [] : []).reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const itemsOf = (id: string) => state.personalItems[id] ?? []
  const poolShareOf = (id: string) =>
    Math.round(((derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0) - personalOf(id)) * 100) / 100
  const totalOf = (id: string) => derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0

  // 個人項目 is opt-in; turning it off keeps the items but asks first when any
  // exist (mirrors the 多人付款 confirm). [P2-c]
  const personalItemCount = state.personalMembers.reduce((n, id) => n + (state.personalItems[id]?.length ?? 0), 0)
  const togglePersonalMode = () => {
    if (state.personalMode && personalItemCount > 0) {
      setConfirmPersonalOff(true)
      return
    }
    actions.setPersonalMode(!state.personalMode)
    if (state.personalMode) setSheetId(null)
  }
  const confirmTurnOffPersonal = () => {
    actions.setPersonalMode(false)
    setSheetId(null)
    setConfirmPersonalOff(false)
  }

  // Say who is over and by how much; the generic "分攤金額與支出金額不符"
  // hides the row the user needs to fix.
  const splitIssue = describeSplitIssue(draft, members)
  let result: { ok: boolean; text: string }
  if (splitIssue) result = { ok: false, text: splitIssue }
  else if (derived.error) result = { ok: false, text: derived.error }
  else {
    let text = "金額相符"
    if (!settleView && derived.remainderMinor > 0 && derived.remainderMembers.length > 0) {
      text += ` · 零頭 ${money(fromMinorUnits(derived.remainderMinor, state.currency))} 由 ${derived.remainderMembers.map(nameOf).join("、")} 吸收`
    }
    result = { ok: true, text }
  }

  const pill = (m: DraftMember, on: boolean, onClick: () => void) => (
    <button key={m.id} type="button" aria-pressed={on} onClick={onClick} className={memberPillClass(on)}>
      <MemberAvatar
        image={m.image ?? null}
        name={m.displayName}
        placeholder={m.isPlaceholder}
        className={`h-4 w-4 rounded-full ${on ? "" : "opacity-40"}`}
        fallbackClassName={`text-[8px] font-bold ${tone(m.id)}`}
      />
      <span className="max-w-[5.5em] truncate text-[11px] font-semibold">{m.displayName}</span>
    </button>
  )

  return (
    <>
      {/* 誰付這筆 — 獨立卡片（跟舊版一樣） */}
      <div className={SECTION_CARD}>
      <div className="mb-3 flex items-center gap-2">
        <p className={`m-0 ${SECTION_TITLE}`}>誰付這筆</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => pill(m, state.payerIds.includes(m.id), () => actions.togglePayer(m.id)))}
      </div>
      {derived.payers.length > 0 && (
        platform ? (
          <div className={`${rowsBox} mt-4`}>
            <div className="border-b border-v2-line-soft bg-v2-surface px-3 py-2 text-[11px] text-v2-ink-subtle">
              <div className={`grid ${platformGrid} items-center gap-2`}>
                <span className="flex h-6 items-center justify-center" aria-hidden="true" />
                <span className="text-left">成員</span>
                <span className="text-right">付款金額</span>
              </div>
            </div>
            {derived.payers.map((p) => {
              const payerPinned = (state.pinnedPayerAmounts[p.memberId] ?? "").trim() !== ""
              // With one payer the amount is obviously the full expense; a
              // second "全額" line adds no information.
              const showPayerMethod = state.payerIds.length > 1
              const payerLabel = payerPinned ? "固定金額" : "均分"
              return (
                <div key={p.memberId} className="border-b border-v2-line-soft bg-v2-lake-soft px-3 py-3 last:border-b-0">
                  <div className={`grid ${platformGrid} items-center gap-2`}>
                    <span className="flex h-6 items-center justify-center">
                      <MemberAvatar image={memberOf(p.memberId)?.image ?? null} name={nameOf(p.memberId)} placeholder={memberOf(p.memberId)?.isPlaceholder} className="h-6 w-6 shrink-0 rounded-full" fallbackClassName={`text-[10px] font-bold ${tone(p.memberId)}`} iconClassName="h-3 w-3" />
                    </span>
                    <span className={nameCell}>{nameOf(p.memberId)}</span>
                    {settleView ? (
                      <span className={`${platformDetail} ${showPayerMethod ? "flex-col items-end gap-0.5" : ""}`}>
                        <span className="inline-flex items-center gap-1">
                          {cellAmount(p.amount)}
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
                        </span>
                        {showPayerMethod && (
                          <span className={`text-[11px] ${payerPinned ? "font-semibold text-v2-lake" : "font-normal text-v2-ink-muted"}`}>{payerLabel}</span>
                        )}
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`調整${nameOf(p.memberId)}的付款金額（目前 $${formatAmount(p.amount, state.currency)}${showPayerMethod ? (payerPinned ? "，已固定" : `，${payerLabel}`) : ""}）`}
                        onClick={() => setPayerAmountSheetId(p.memberId)}
                        className={`${platformDetail} ${showPayerMethod ? "flex-col items-end gap-0.5" : ""} text-v2-ink`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {cellAmount(p.amount)}
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
                        </span>
                        {showPayerMethod && (
                          <span className={`text-[11px] ${payerPinned ? "font-semibold text-v2-lake" : "font-normal text-v2-ink-muted"}`}>{payerLabel}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`${rowsBox} mt-4`}>
            <div className="border-b border-v2-line-soft bg-v2-surface px-1.5 py-2 text-[11px] text-v2-ink-subtle">
              <div className={`grid ${payerGridCols} items-center gap-1`}>
                <span className="flex h-6 items-center justify-center" aria-hidden="true" />
                <span className="text-left">成員</span>
                <span className="text-right">付款金額</span>
              </div>
            </div>
            {derived.payers.map((p) => {
              const pinned = (state.pinnedPayerAmounts[p.memberId] ?? "").trim() !== ""
              return (
                <div key={p.memberId} className="border-b border-v2-line-soft bg-v2-lake-soft px-1.5 py-3 last:border-b-0">
                  <div className={`grid ${payerGridCols} items-center gap-1`}>
                    <span className="flex h-6 items-center justify-center">
                      <MemberAvatar image={memberOf(p.memberId)?.image ?? null} name={nameOf(p.memberId)} placeholder={memberOf(p.memberId)?.isPlaceholder} className="h-6 w-6 shrink-0 rounded-full" fallbackClassName={`text-[10px] font-bold ${tone(p.memberId)}`} iconClassName="h-3 w-3" />
                    </span>
                    <span className={nameCell}>{nameOf(p.memberId)}</span>
                    {settleView ? (
                      <span className="inline-flex items-center justify-center gap-1 text-[12px] font-bold tabular-nums">
                        {pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-v2-lake" aria-hidden="true" />}
                        {cellAmount(p.amount)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`調整${nameOf(p.memberId)}的付款金額（目前 $${formatAmount(p.amount, state.currency)}${pinned ? "，已固定" : "，自動平分"}）`}
                        onClick={() => setPayerAmountSheetId(p.memberId)}
                        className={`${amountButton} justify-center text-v2-ink ${pinned ? "decoration-solid" : "decoration-dotted"}`}
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          {pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-v2-lake" aria-hidden="true" />}
                          {cellAmount(p.amount)}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* 共同分攤 — 獨立卡片（跟舊版一樣） */}
      </div>
      <div className={SECTION_CARD}>
      <div className="mb-2 flex items-center gap-2">
        <p className={`m-0 ${SECTION_TITLE}`}>
          誰一起分<span className="text-v2-ink">（{!platform && hasPersonal ? `剩餘 ${money(remaining)}` : `${money(derived.splitInput.amount)}`}）</span>
        </p>
        {!settleView && (
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => members.forEach((m) => { if (pool.length !== members.length ? !pool.includes(m.id) : pool.includes(m.id)) actions.togglePool(m.id) })}
              className="min-h-[44px] text-xs font-bold text-v2-lake focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
            >
              {pool.length === members.length ? "取消全選" : "全選"}
            </button>
            {!platform && (
              <button
                type="button"
                role="switch"
                aria-checked={state.personalMode}
                aria-label="個人項目"
                onClick={togglePersonalMode}
                className="-my-3 flex min-h-[44px] shrink-0 items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
              >
                <span className="text-[12px] font-bold text-v2-ink">個人項目</span>
                <span className={`relative inline-block h-[14px] w-6 shrink-0 rounded-full ${state.personalMode ? "bg-v2-link" : "bg-v2-check"}`}>
                  <span className={`absolute top-0.5 h-[10px] w-[10px] rounded-full bg-v2-knob transition-[left] ${state.personalMode ? "left-[12px]" : "left-0.5"}`} />
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {confirmPersonalOff && (
        <div className="mb-2 rounded-xl border border-v2-coral bg-v2-coral-soft px-3 py-2.5">
          <p className="m-0 text-[12px] text-v2-ink">關閉個人項目會忽略已記錄的 {personalItemCount} 筆品項（資料保留，重新開啟可復原）。</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={confirmTurnOffPersonal} className="rounded-full bg-v2-danger px-3 py-1 text-[12px] font-bold text-white">確定關閉</button>
            <button type="button" onClick={() => setConfirmPersonalOff(false)} className="rounded-full border border-v2-line bg-v2-surface px-3 py-1 text-[12px] font-bold text-v2-ink">取消</button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">{members.map((m) => pill(m, pool.includes(m.id), () => actions.togglePool(m.id)))}</div>

      <p className="m-0 mt-2.5 text-[12px] text-v2-ink-muted">
        {settleView
          ? "結算幣別預覽，僅供參考；切回原幣別即可調整金額。"
          : platform
            ? "點分攤金額看每個人的明細；個人項目與分攤方式都在明細裡調整。"
            : "點金額就能固定，其他人自動平分剩下的；有綠色釘子表示已固定。開啟「個人項目」後，點「加入」記錄個人項目"}
      </p>

      {pool.length > 0 && (platform ? (
        <div className={`${rowsBox} mt-4`}>
          <div className="border-b border-v2-line-soft bg-v2-surface px-3 py-2 text-[11px] text-v2-ink-subtle">
            <div className={`grid ${platformGrid} items-center gap-2`}>
              <span className="flex h-6 items-center justify-center" aria-hidden="true" />
              <span className="text-left">成員</span>
              <span className="text-right">分攤金額</span>
            </div>
          </div>
          {pool.map((id) => {
            const total = totalOf(id)
            const negative = total < -0.001
            const commonAmount = poolShareOf(id)
            const personalAmount = personalOf(id)
            const personalCount = itemsOf(id).filter((i) => i.name.trim() !== "" || i.amount.trim() !== "").length
            const sharePinned = (state.customShares[id] ?? "").trim() !== ""
            const shareLabel = sharePinned ? "固定金額" : hasAnyPersonal ? "剩餘均分" : "均分"
            // Only show the secondary common amount when it differs from the
            // total. No personal items + equal split = one number, not two.
            const showCommonAmount = Math.abs(commonAmount - total) > 0.005
            // Show the personal total so the row explains itself: personal +
            // common = total. The detail sheet still holds the item breakdown.
            const personalLabel = personalCount > 0 ? `個人項目 ${money(personalAmount)}（${personalCount} 項）` : ""
            const supporting = personalLabel
            return (
              <div key={id} className="border-b border-v2-line-soft bg-v2-lake-soft px-3 py-3 last:border-b-0">
                <div className={`grid ${platformGrid} items-center gap-2`}>
                  <span className="flex h-6 items-center justify-center">
                    <MemberAvatar image={memberOf(id)?.image ?? null} name={nameOf(id)} placeholder={memberOf(id)?.isPlaceholder} className="h-6 w-6 shrink-0 rounded-full" fallbackClassName={`text-[10px] font-bold ${tone(id)}`} iconClassName="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <span className={`${nameCell} block`}>{nameOf(id)}</span>
                    {supporting && <span className="block truncate text-[11px] font-normal text-v2-ink-muted">{supporting}</span>}
                  </div>
                  {settleView ? (
                    <span className={`${platformDetail} flex-col items-end gap-0.5 ${negative ? "text-v2-danger" : "text-v2-ink"}`}>
                      <span className="inline-flex items-center gap-1">
                        {cellAmount(total)}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] ${sharePinned ? "font-semibold text-v2-lake" : "font-normal text-v2-ink-muted"}`}>
                        {shareLabel}{showCommonAmount ? ` ${money(commonAmount)}` : ""}
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDetailId(id)}
                      aria-label={`查看${nameOf(id)}的分帳明細（分攤金額 ${formatAmount(total, state.currency)} ${state.currency}，${shareLabel}${showCommonAmount ? ` ${formatAmount(commonAmount, state.currency)} ${state.currency}` : ""}${personalLabel ? `，${personalLabel}` : ""}${sharePinned ? "，已固定" : ""}）`}
                      className={`${platformDetail} flex-col items-end gap-0.5 ${negative ? "text-v2-danger" : "text-v2-ink"}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {cellAmount(total)}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] ${sharePinned ? "font-semibold text-v2-lake" : "font-normal text-v2-ink-muted"}`}>
                        {shareLabel}{showCommonAmount ? ` ${money(commonAmount)}` : ""}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`${rowsBox} mt-4`}>
          <div className="border-b border-v2-line-soft bg-v2-surface px-1.5 py-2 text-[11px] text-v2-ink-subtle">
            <div className={`grid ${gridCols} items-center gap-1`}>
              <span className={`flex h-6 items-center justify-center ${cellOutline}`} aria-hidden="true" />
              <span className={`text-left ${cellOutline}`}>成員</span>
              {state.personalMode && <span className={`${personalCell} ${cellOutline}`}>個人項目</span>}
              <span className={`text-right ${cellOutline}`}>共同分攤</span>
              {state.personalMode && <span className={`text-right ${cellOutline}`}>小計</span>}
            </div>
          </div>
            {pool.map((id) => {
              const items = itemsOf(id)
              const share = poolShareOf(id)
              const total = totalOf(id)
              const negative = share < -0.001 || total < -0.001
              const pinned = (state.customShares[id] ?? "").trim() !== ""
              return (
                <div key={id} className="border-b border-v2-line-soft bg-v2-lake-soft px-1.5 py-3 last:border-b-0">
                  <div className={`grid ${gridCols} items-center gap-1`}>
                  <span className={`flex h-6 items-center justify-center ${cellOutline}`}>
                    <MemberAvatar image={memberOf(id)?.image ?? null} name={nameOf(id)} placeholder={memberOf(id)?.isPlaceholder} className="h-6 w-6 shrink-0 rounded-full" fallbackClassName={`text-[10px] font-bold ${tone(id)}`} iconClassName="h-3 w-3" />
                  </span>
                  <span className={`${nameCell} ${cellOutline}`}>{nameOf(id)}</span>
                  {state.personalMode && (
                    <span className={`${personalCell} ${cellOutline}`}>
                      {items.length > 0 ? (
                        <button type="button" onClick={() => setSheetId(id)} aria-label={`編輯${nameOf(id)}的個人項目（${formatAmount(personalOf(id), state.currency)} ${state.currency}）`} className="whitespace-nowrap text-[12px] font-bold tabular-nums leading-tight text-v2-lake">
                          {cellAmount(personalOf(id))}
                        </button>
                      ) : !settleView ? (
                        <button type="button" onClick={() => setSheetId(id)} aria-label={`為${nameOf(id)}加入個人項目`} className="whitespace-nowrap text-[12px] font-bold text-v2-lake underline decoration-dotted decoration-v2-check underline-offset-4">
                          ＋ 加入
                        </button>
                      ) : null}
                    </span>
                  )}
                  <div className={`${amountCell} ${cellOutline}`}>
                    {settleView ? (
                      <span className={`inline-flex min-w-0 flex-1 items-center gap-1 whitespace-nowrap text-[12px] font-bold tabular-nums leading-tight ${state.personalMode ? "justify-end" : "justify-center"} ${negative ? "text-v2-danger" : "text-v2-ink"}`}>
                        {pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-v2-lake" aria-hidden="true" />}
                        {cellAmount(share)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`調整${nameOf(id)}的共同分攤金額（目前 $${formatAmount(share, state.currency)}${pinned ? "，已固定" : "，自動平分"}）`}
                        onClick={() => setAmountSheetId(id)}
                        className={`${amountButton} ${state.personalMode ? "w-full justify-end" : "justify-center"} ${pinned ? "decoration-solid" : "decoration-dotted"} ${negative ? "text-v2-danger" : "text-v2-ink"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-v2-lake" aria-hidden="true" />}
                          {cellAmount(share)}
                        </span>
                      </button>
                    )}
                  </div>
                  {state.personalMode && <span className={`${totalCell} ${negative ? "text-v2-danger" : "text-v2-ink"}`}>{cellAmount(total)}</span>}
                  </div>
                </div>
              )
            })}
        </div>
      ))}

      {/* 即時結果 */}
      <div className={`mt-3 flex items-center justify-end gap-1 text-right text-xs font-bold ${result.ok ? "text-v2-link" : "text-v2-danger"}`} role={result.ok ? undefined : "alert"}>
        {result.ok && <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />}
        {result.text}
      </div>

      </div>

      <PersonalItemsSheet open={sheetId != null} onClose={() => setSheetId(null)} members={members} draft={draft} memberId={sheetId} />
      <AmountSheet open={amountSheetId != null} onClose={() => setAmountSheetId(null)} members={members} draft={draft} memberId={amountSheetId} />
      <AmountSheet open={payerAmountSheetId != null} onClose={() => setPayerAmountSheetId(null)} mode="payer" members={members} draft={draft} memberId={payerAmountSheetId} />
      <SplitDetailSheet
        key={detailId ?? "none"}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        members={members}
        draft={draft}
        memberId={detailId}
      />
    </>
  )
}
