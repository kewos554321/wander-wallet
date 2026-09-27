import { ArrowRight, Info, Share2 } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleSettlement } from "@/lib/hooks/useSettlement"

const AVATAR_TONES = [
  "bg-[#D2EAE1] text-v2-lake",
  "bg-v2-gold-soft text-v2-gold",
  "bg-v2-rose-soft text-v2-rose",
  "bg-[#FBE3D2] text-[#C4602F]",
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
  "inline-flex items-center gap-1.5 rounded-lg border border-[#B7D9CB] bg-v2-lake-soft px-3 py-1.5 text-xs font-semibold text-v2-lake"

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
  const tone = (memberId: string) => AVATAR_TONES[Math.max(0, memberIds.indexOf(memberId)) % AVATAR_TONES.length]
  const name = (memberId: string, displayName: string) => (memberId === currentMemberId ? "我" : displayName)

  const person = (memberId: string, displayName: string) => {
    const label = name(memberId, displayName)
    return (
      <>
        <span className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone(memberId)}`} aria-hidden="true">
          {label.charAt(0)}
        </span>
        <span className="text-sm font-medium leading-5 tracking-[.1px]">{label}</span>
      </>
    )
  }

  return (
    <div className="mx-4 mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">轉帳建議</p>
        <div className="flex gap-2">
          <button type="button" onClick={onShowCalc} className={actionButton}>
            <Info className="h-3 w-3" aria-hidden="true" />
            計算說明
          </button>
          <button type="button" onClick={onShare} className={actionButton}>
            <Share2 className="h-3 w-3" aria-hidden="true" />
            分享
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
        {settlements.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-v2-ink-muted">
            {expenseCount === 0 ? "尚無支出記錄" : "所有人都已結清"}
          </p>
        ) : (
          settlements.map((s, i) => (
            <div
              key={`${s.from.memberId}-${s.to.memberId}`}
              data-testid={`settlement-${i}`}
              className={`flex items-center justify-between gap-2.5 px-4 py-3 ${i < settlements.length - 1 ? "border-b border-[#F0EAE0]" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {person(s.from.memberId, s.from.displayName)}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-label="付給" />
                {person(s.to.memberId, s.to.displayName)}
              </div>
              <p className="m-0 shrink-0 font-v2-serif text-base font-bold leading-6 tracking-[.15px] tabular-nums">
                {formatCurrency(Math.round(toDisplay(s.amount)), currencyCode)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
