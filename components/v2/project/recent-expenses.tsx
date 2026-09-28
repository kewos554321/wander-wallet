import Link from "next/link"
import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { getRecentExpenses, type OverviewExpense } from "@/lib/project-overview"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"

interface RecentExpensesProps {
  projectId: string
  expenses: OverviewExpense[]
  currentMemberId: string | null
}

export function RecentExpenses({ projectId, expenses, currentMemberId }: RecentExpensesProps) {
  const recent = getRecentExpenses(expenses)

  return (
    <section className="px-4 pb-44 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">最近支出</p>
        <Link href={`/projects/${projectId}/expenses`} className="text-xs font-medium tracking-[.5px] text-v2-link">
          查看全部
        </Link>
      </div>
      <div className="overflow-hidden rounded-[18px] border border-v2-line bg-v2-surface">
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-v2-ink-muted">還沒有支出，點右下角開始記帳</p>
        ) : (
          recent.map((expense, i) => {
            const key = categoryKey(expense.category)
            const Icon = CATEGORY_ICONS[key]
            const payer = expense.payer.id === currentMemberId ? "我" : expense.payer.displayName
            return (
              <Link
                key={expense.id}
                href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                className={`flex items-center gap-3 px-3.5 py-3 ${i < recent.length - 1 ? "border-b border-v2-line-soft" : ""}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_TONES[key]}`} aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5 tracking-[.1px]">
                    {expense.description || getCategoryLabel(key)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
                    {payer} 付款 · {expense.participants.length} 人分攤
                  </span>
                </span>
                <span className="text-sm font-bold leading-5 tracking-[.1px] tabular-nums">
                  {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
