import type { ReactNode } from "react"
import { Sparkles } from "lucide-react"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { groupExpensesByDay } from "@/lib/expense-list"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { ExpenseSummaryCard } from "./expense-summary-card"
import { ExpenseCard } from "./expense-card"

export interface ExpensesV2ViewProps {
  projectId: string
  currency: string
  dateRangeLabel: string | null
  allCount: number
  expenses: ProjectExpense[]
  summary: { total: number; count: number; average: number }
  currentMemberId: string | null
  now: Date
  filterBar: ReactNode
  onRequestDelete: (expense: ProjectExpense) => void
  onViewImage: (url: string) => void
  onVoice: () => void
}

export function ExpensesV2View(props: ExpensesV2ViewProps) {
  const groups = groupExpensesByDay(props.expenses, props.now)

  return (
    <>
      <V2TopBar title="全部支出" backHref={`/projects/${props.projectId}`} />
      <ExpenseSummaryCard currency={props.currency} dateRangeLabel={props.dateRangeLabel} summary={props.summary} />
      {props.filterBar}
      <div className="mx-4 mt-2.5 flex items-center justify-between">
        <span className="text-xs text-v2-ink-muted">
          顯示 <b className="text-v2-ink">{props.expenses.length}</b> / {props.allCount} 筆
        </span>
      </div>

      <div className="px-4 pb-44 pt-3.5">
        {props.allCount === 0 ? (
          <p className="py-12 text-center text-[13px] text-v2-ink-muted">尚無支出記錄</p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-v2-ink-muted">找不到符合的支出</p>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <p className="mb-1.5 text-[11px] font-bold text-v2-ink-subtle">{group.label}</p>
              {group.expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  projectId={props.projectId}
                  expense={expense}
                  currentMemberId={props.currentMemberId}
                  onRequestDelete={props.onRequestDelete}
                  onViewImage={props.onViewImage}
                />
              ))}
            </section>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={props.onVoice}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2"
      >
        <span className="rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium shadow-[0_2px_6px_rgba(27,24,21,.08)]">
          AI 快速記帳
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-v2-on-lake shadow-[0_4px_10px_rgba(232,130,90,.35)]">
          <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
      </button>
    </>
  )
}
