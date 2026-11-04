import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/constants/currencies"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"

const monthDay = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export interface DeleteExpenseSummaryProps {
  description: string | null
  amount: number
  currency: string
  category: string | null
  expenseDate: string
  payerName: string
  participantCount: number
}

/**
 * The one thing the delete confirmation was missing: what exactly is being
 * deleted. Shared by the list and the edit form so both name the target.
 */
export function DeleteExpenseSummary({
  description,
  amount,
  currency,
  category,
  expenseDate,
  payerName,
  participantCount,
}: DeleteExpenseSummaryProps) {
  const key = categoryKey(category)
  const Icon = CATEGORY_ICONS[key]
  const title = description?.trim() || getCategoryLabel(key)

  return (
    <div className="mt-4 flex items-center gap-3 rounded-v2-md border border-v2-line bg-v2-paper p-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md ${CATEGORY_TONES[key]}`}
        aria-hidden="true"
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[13px] font-bold text-v2-ink">{title}</p>
        <p className="m-0 mt-0.5 text-[11px] text-v2-ink-muted">
          {payerName} · {monthDay(expenseDate)} · 共 {participantCount} 人分攤
        </p>
      </div>
      <span className="shrink-0 text-[14px] font-bold tabular-nums text-v2-ink">
        {formatCurrency(amount, currency || DEFAULT_CURRENCY)}
      </span>
    </div>
  )
}
