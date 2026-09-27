import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleBalance } from "@/lib/hooks/useSettlement"

interface MemberBalancesProps {
  balances: SettleBalance[]
  currentMemberId: string | null
  currencyCode: string
  toDisplay: (amount: number) => number
}

export function MemberBalances({ balances, currentMemberId, currencyCode, toDisplay }: MemberBalancesProps) {
  if (balances.length === 0) return null
  const fmt = (value: number) => formatCurrency(Math.round(toDisplay(value)), currencyCode)

  return (
    <section aria-label="各人收支" className="mx-4 mt-4">
      <p className="mb-1.5 text-sm font-medium leading-5 tracking-[.1px]">各人收支</p>
      <div className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
        {balances.map((b, i) => {
          const rounded = Math.round(toDisplay(b.balance))
          const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
          return (
            <div key={b.memberId} className={`flex items-center justify-between gap-3 px-4 py-3 ${i < balances.length - 1 ? "border-b border-[#F0EAE0]" : ""}`}>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-medium">{b.memberId === currentMemberId ? "我" : b.displayName}</p>
                <p className="mt-0.5 text-xs text-v2-ink-muted">
                  已付 {fmt(b.totalPaid)} · 應付 {fmt(b.totalShare)}
                </p>
              </div>
              <p className={`m-0 shrink-0 font-v2-serif text-base font-bold tabular-nums ${rounded < 0 ? "text-v2-danger" : "text-v2-lake"}`}>
                {sign}
                {formatCurrency(Math.abs(rounded), currencyCode)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
