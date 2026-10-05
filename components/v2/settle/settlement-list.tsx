import { ArrowRight, Info, Share2 } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleSettlement } from "@/lib/hooks/useSettlement"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"

const AVATAR_TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-gold-soft text-v2-gold",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-coral-soft text-v2-coral-strong",
  "bg-v2-plum-soft text-v2-plum",
]

interface SettlementListProps {
  settlements: SettleSettlement[]
  memberIds: string[]
  currentMemberId: string | null
  currencyCode: string
  toDisplay: (amount: number) => number
  onShowCalc: () => void
  onShare: () => void
  /** Total expense count, used to distinguish "no expenses yet" from "all settled". */
  expenseCount: number
}

const actionButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-v2-lake-edge bg-v2-lake-soft px-3 py-1.5 text-xs font-semibold text-v2-lake"

export function SettlementList({
  settlements,
  memberIds,
  currentMemberId,
  currencyCode,
  toDisplay,
  onShowCalc,
  onShare,
  expenseCount,
}: SettlementListProps) {
  const tone = (memberId: string) =>
    memberId === currentMemberId
      ? "bg-v2-gold-soft text-v2-gold"
      : AVATAR_TONES[Math.max(0, memberIds.indexOf(memberId)) % AVATAR_TONES.length]
  const name = (memberId: string, displayName: string) => (memberId === currentMemberId ? "我" : displayName)

  const person = (memberId: string, displayName: string, image: string | null) => {
    const label = name(memberId, displayName)
    return (
      <>
        <span
          data-testid={`settlement-avatar-${memberId}`}
          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full ${tone(memberId)}`}
        >
          <V2Avatar image={image} name={label} className="h-full w-full rounded-full" fallbackClassName="text-[11px] font-bold" />
        </span>
        <span data-testid={`settlement-name-${memberId}`} className="text-sm font-medium leading-5 tracking-[.1px]">
          {label}
        </span>
      </>
    )
  }

  return (
    <div data-testid="settlement-list" className="mx-4 mt-4 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-[13px] font-bold text-v2-lake">轉帳建議</p>
        <div className="flex gap-2">
          <button type="button" onClick={onShowCalc} className={actionButton}>
            <Info className="h-[13px] w-[13px]" strokeWidth={1.7} aria-hidden="true" />
            計算說明
          </button>
          <button type="button" onClick={onShare} className={actionButton}>
            <Share2 className="h-[13px] w-[13px]" strokeWidth={1.7} aria-hidden="true" />
            分享
          </button>
        </div>
      </div>
      {settlements.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-v2-ink-muted">
          {expenseCount === 0 ? "尚無支出記錄" : "所有人都已結清"}
        </p>
      ) : (
        settlements.map((s, i) => (
          <div
            key={`${s.from.memberId}-${s.to.memberId}`}
            data-testid={`settlement-${i}`}
            className={`flex items-center justify-between gap-2.5 ${i < settlements.length - 1 ? "border-b border-v2-line-soft py-3" : "pt-3"}`}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {person(s.from.memberId, s.from.displayName, s.from.userImage)}
              <ArrowRight className="h-[13px] w-[13px] shrink-0 text-v2-ink-subtle" strokeWidth={2.2} aria-label="付給" />
              {person(s.to.memberId, s.to.displayName, s.to.userImage)}
            </div>
            <p className="m-0 shrink-0 font-v2-serif text-base font-bold leading-6 tracking-[.15px] tabular-nums">
              {formatCurrency(Math.round(toDisplay(s.amount)), currencyCode)}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
