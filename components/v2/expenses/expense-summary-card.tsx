import { CalendarDays, Receipt, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"

interface ExpenseSummaryCardProps {
  currency: string
  dateRangeLabel: string | null
  summary: { total: number; count: number; average: number }
}

export function ExpenseSummaryCard({ currency, dateRangeLabel, summary }: ExpenseSummaryCardProps) {
  return (
    <div className="mx-4 mt-3.5 rounded-[18px] border border-v2-lake-border bg-gradient-to-br from-v2-lake-soft to-v2-paper px-[18px] py-4 shadow-[0_2px_8px_rgba(27,88,71,.06)]">
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">總支出</p>
        {dateRangeLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-v2-lake-border bg-v2-surface px-[9px] py-[3px] text-xs font-semibold text-v2-lake">
            <CalendarDays className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
            {dateRangeLabel}
          </span>
        )}
      </div>
      <p className="mt-1 font-v2-serif text-2xl font-bold leading-8 tabular-nums text-v2-lake">
        {formatCurrency(Math.round(summary.total), currency)}
      </p>
      <div className="mt-3 flex items-center gap-3 border-t border-v2-lake-border pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-[9px]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-v2-surface text-v2-lake" aria-hidden="true">
            <Receipt className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{summary.count} 筆</span>
            <span className="block text-xs text-v2-ink-subtle">支出紀錄</span>
          </span>
        </div>
        <div className="h-[30px] w-px shrink-0 bg-v2-lake-border" />
        <div className="flex min-w-0 flex-1 items-center gap-[9px]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-v2-surface text-v2-coral" aria-hidden="true">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{formatCurrency(Math.round(summary.average), currency)}</span>
            <span className="block text-xs text-v2-ink-subtle">平均每筆</span>
          </span>
        </div>
      </div>
    </div>
  )
}
