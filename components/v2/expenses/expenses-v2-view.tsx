import type { ReactNode } from "react"
import { CheckSquare, Sparkles, X } from "lucide-react"
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
  hasActiveFilters: boolean
  onClearFilters: () => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelectMode: () => void
  onToggleSelect: (id: string) => void
  onRequestDelete: (expense: ProjectExpense) => void
  onRequestBatchDelete: () => void
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
        <div className="flex items-center gap-2.5">
          {props.hasActiveFilters && (
            <button type="button" onClick={props.onClearFilters} className="text-xs font-bold text-v2-ink-muted">
              清除
            </button>
          )}
          <button
            type="button"
            onClick={props.onToggleSelectMode}
            className="inline-flex items-center gap-1 rounded-full border border-v2-line bg-v2-surface px-3 py-1.5 text-xs font-bold"
          >
            {props.selectMode ? <X className="h-3 w-3" aria-hidden="true" /> : <CheckSquare className="h-3 w-3" aria-hidden="true" />}
            {props.selectMode ? "取消" : "批次"}
          </button>
        </div>
      </div>

      <div className="px-4 pb-44 pt-3.5">
        {props.allCount === 0 ? (
          <p className="py-12 text-center text-[13px] text-v2-ink-muted">尚無支出記錄</p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-v2-ink-muted">找不到符合的支出</p>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <p className="mb-2 text-xs font-semibold text-v2-ink-subtle">{group.label}</p>
              {group.expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  projectId={props.projectId}
                  expense={expense}
                  currentMemberId={props.currentMemberId}
                  selectMode={props.selectMode}
                  selected={props.selectedIds.has(expense.id)}
                  onToggleSelect={props.onToggleSelect}
                  onRequestDelete={props.onRequestDelete}
                  onViewImage={props.onViewImage}
                />
              ))}
            </section>
          ))
        )}
      </div>

      {props.selectMode ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-v2-line bg-v2-surface px-4 py-3">
          <button
            type="button"
            disabled={props.selectedIds.size === 0}
            onClick={props.onRequestBatchDelete}
            className="mx-auto block w-full max-w-md rounded-full bg-v2-danger py-3 text-[15px] font-bold text-white disabled:opacity-40"
          >
            刪除 {props.selectedIds.size} 筆
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={props.onVoice}
          className="fixed bottom-6 right-4 z-50 flex items-center gap-2"
        >
          <span className="rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium shadow-[0_2px_6px_rgba(27,24,21,.08)]">
            AI 快速記帳
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-white shadow-[0_4px_10px_rgba(232,130,90,.35)]">
            <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
          </span>
        </button>
      )}
    </>
  )
}
