import { CheckCircle2, Pin, PinOff, UserMinus } from "lucide-react"
import { formatAmount, formatCurrency } from "@/lib/constants/currencies"
import { roundMajorToMinor } from "@/lib/currency-conversion"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"
import type { PayerShare } from "@/lib/expense-payers"
import type { DraftMember } from "./use-expense-draft"
import { CurrencyToggle } from "./currency-toggle"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"

const AVATAR_TONES = ["bg-v2-lake-tint text-v2-lake", "bg-v2-coral-soft text-v2-coral-strong", "bg-v2-plum-soft text-v2-plum", "bg-v2-rose-soft text-v2-rose"]

// Shared member pill look for the payer, personal-item and shared-pool pickers.
export function memberPillClass(selected: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
    selected ? "border border-v2-lake bg-v2-lake text-v2-on-lake" : "border border-v2-lake-border bg-v2-lake-soft text-v2-ink opacity-50"
  }`
}

export function memberTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length]
}

export function PayerPicker({
  members,
  payerIds,
  pinned,
  payers,
  matches,
  amount,
  currency,
  projectCurrency,
  rate,
  displayCurrency,
  onDisplayCurrencyChange,
  onTogglePayer,
  onSetAll,
  onSetAmount,
  onClearAmount,
}: {
  members: DraftMember[]
  payerIds: string[]
  pinned: Record<string, string>
  payers: PayerShare[]
  matches: boolean
  amount: number
  currency: string
  projectCurrency?: string
  rate?: number | null
  /** When set, the section renders in this currency (see `onDisplayCurrencyChange`). */
  displayCurrency?: string
  /** When set, a currency toggle is shown; selecting the settlement currency flips the section. */
  onDisplayCurrencyChange?: (currency: string) => void
  onTogglePayer: (id: string) => void
  onSetAll: (selectAll: boolean) => void
  onSetAmount: (id: string, value: string) => void
  onClearAmount: (id: string) => void
}) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  const derivedAmount = (id: string) => payers.find((p) => p.memberId === id)?.amount ?? 0
  const allSelected = members.length > 0 && payerIds.length === members.length
  const payerTotal = payers.reduce((sum, p) => sum + p.amount, 0)
  // A set `displayCurrency` means the section is a glance view: amounts show in
  // that currency and every field becomes read-only (edits stay in the expense
  // currency, reached by flipping back).
  const viewCurrency = displayCurrency ?? currency
  const settleView = displayCurrency != null && displayCurrency !== currency && rate != null
  const convert = (n: number) => (settleView ? roundMajorToMinor((n ?? 0) * rate!, viewCurrency) : n)
  const money = (n: number) => `$${formatAmount(convert(n), viewCurrency)}`
  const showCurrencyToggle =
    onDisplayCurrencyChange != null && !!projectCurrency && rate != null && currency !== projectCurrency
  const showLegacyEstimate = displayCurrency == null && !!projectCurrency && rate != null && currency !== projectCurrency

  return (
    <div role="group" aria-label="付款成員" className={SECTION_CARD}>
      <p className={`mb-2.5 flex items-center gap-2 ${SECTION_TITLE}`}>
        付款成員
        {showCurrencyToggle && (
          <CurrencyToggle
            currency={currency}
            projectCurrency={projectCurrency!}
            displayCurrency={viewCurrency}
            onChange={onDisplayCurrencyChange!}
          />
        )}
      </p>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">付款明細</p>
        {!settleView && members.length > 1 && (
          <button
            type="button"
            onClick={() => onSetAll(!allSelected)}
            className="shrink-0 text-xs font-bold text-v2-lake"
          >
            {allSelected ? "取消全選" : "全選"}
          </button>
        )}
      </div>

      {!settleView && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {members.map((m, i) => {
            const checked = payerIds.includes(m.id)
            return (
              <label key={m.id} className={`cursor-pointer ${memberPillClass(checked)}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => onTogglePayer(m.id)}
                  aria-label={m.displayName}
                />
                <V2Avatar
                  image={m.image ?? null}
                  name={m.displayName}
                  className="h-5 w-5 rounded-full"
                  fallbackClassName={`text-[9px] font-bold ${memberTone(i)}`}
                />
                <span className="text-xs font-semibold">{m.displayName}</span>
              </label>
            )
          })}
        </div>
      )}

      {payerIds.length > 0 && (
        <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {payers.map((p, idx) => {
            const isPinned = Object.prototype.hasOwnProperty.call(pinned, p.memberId)
            const editable = isPinned && !settleView
            const value = isPinned ? pinned[p.memberId] : String(derivedAmount(p.memberId))
            return (
              <div
                key={p.memberId}
                className={`bg-v2-lake-soft px-3.5 py-3 ${
                  idx < payers.length - 1 ? "border-b border-v2-line-soft" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <V2Avatar
                    image={members.find((m) => m.id === p.memberId)?.image ?? null}
                    name={nameOf(p.memberId)}
                    className="h-7 w-7 shrink-0 rounded-full"
                    fallbackClassName={`text-[11px] font-bold ${memberTone(members.findIndex((m) => m.id === p.memberId))}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{nameOf(p.memberId)}</span>
                  {editable ? (
                    <label className="flex w-24 shrink-0 items-center rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-[13px] font-bold">
                      <span aria-hidden="true">$</span>
                      <input
                        aria-label={`${nameOf(p.memberId)}的付款金額`}
                        value={value}
                        inputMode="decimal"
                        onChange={(e) => onSetAmount(p.memberId, e.target.value)}
                        className="w-full min-w-0 bg-transparent text-right outline-none"
                      />
                    </label>
                  ) : (
                    <span
                      aria-label={`${nameOf(p.memberId)}的付款金額`}
                      className="shrink-0 text-right text-[13px] font-bold"
                    >
                      {money(derivedAmount(p.memberId))}
                    </span>
                  )}
                  {!settleView && (
                    <button
                      type="button"
                      aria-label={isPinned ? `${nameOf(p.memberId)}的付款金額已自訂，點擊還原均分` : `${nameOf(p.memberId)}的付款金額均分，點擊自訂`}
                      onClick={() => (isPinned ? onClearAmount(p.memberId) : onSetAmount(p.memberId, String(derivedAmount(p.memberId))))}
                      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md ${
                        isPinned ? "bg-v2-lake text-v2-on-lake" : "border-[1.5px] border-v2-check text-v2-ink-muted"
                      }`}
                    >
                      {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                    </button>
                  )}
                  {!settleView && (
                    <button
                      type="button"
                      aria-label={`移除${nameOf(p.memberId)}`}
                      onClick={() => onTogglePayer(p.memberId)}
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-v2-danger-soft text-v2-danger-strong"
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {showLegacyEstimate && (
                  <p
                    data-testid="payer-project-estimate"
                    className="mt-1 break-words pl-[38px] text-[10px] text-v2-ink-muted"
                  >
                    ≈ {formatCurrency(p.amount * rate, projectCurrency!)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-v2-ink-muted">已選 {payers.length} 人</span>
          {matches ? (
            <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              金額相符
            </span>
          ) : (
            <span className="text-xs font-bold text-v2-danger">金額不符</span>
          )}
        </div>
        <p className="mt-[3px] break-words text-xs leading-normal text-v2-ink-muted">
          {payers.length > 0 ? `${payers.map((p) => money(p.amount)).join(" + ")} = ` : ""}
          {money(payerTotal)} / {money(amount)}
        </p>
      </div>
    </div>
  )
}
