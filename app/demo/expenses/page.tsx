"use client"

import { ExpensesV2View } from "@/components/v2/expenses/expenses-v2-view"
import { ExpenseFilterBar } from "@/components/v2/expenses/expense-filter-bar"
import { useExpenseFilters } from "@/lib/hooks/useExpenseFilters"
import {
  DEMO_CURRENCY,
  DEMO_CURRENT_MEMBER_ID,
  DEMO_EXPENSE_SUMMARY,
  DEMO_EXPENSES,
  DEMO_PROJECT_ID,
} from "@/app/demo/_data/fixtures"

// The real list view + the real filter bar, fed by the shared fixtures. The
// summary is the shared fixture total so it matches the overview screen
// (the demo does not run cross-currency conversion — see the plan's Review Focus 5).
export default function DemoExpensesPage() {
  const f = useExpenseFilters(DEMO_EXPENSES)

  return (
    <div className="mx-auto max-w-md">
      <ExpensesV2View
        projectId={DEMO_PROJECT_ID}
        currency={DEMO_CURRENCY}
        dateRangeLabel="10/08 – 10/12"
        allCount={DEMO_EXPENSES.length}
        expenses={f.filteredExpenses}
        summary={DEMO_EXPENSE_SUMMARY}
        currentMemberId={DEMO_CURRENT_MEMBER_ID}
        now={new Date(2026, 9, 11)}
        filterBar={
          <ExpenseFilterBar
            filters={f.filters}
            currency={DEMO_CURRENCY}
            maxAmount={f.maxAmount}
            payers={f.uniquePayers}
            participants={f.uniqueParticipants}
            currencies={f.uniqueCurrencies}
            hasActiveFilters={f.hasActiveFilters}
            currentMemberId={DEMO_CURRENT_MEMBER_ID}
            onSearch={f.setSearchQuery}
            onToggleCategory={f.toggleCategory}
            onClearCategories={() => f.setCategories(new Set())}
            onSetPayers={f.setPayers}
            onClearPayers={() => f.setPayers(new Set())}
            onToggleParticipant={f.toggleParticipant}
            onClearParticipants={() => f.setParticipants(new Set())}
            onToggleCurrency={f.toggleCurrency}
            onClearCurrencies={() => f.setCurrencies(new Set())}
            onAmountRange={f.setAmountRange}
            onExpenseRange={f.setExpenseDateRange}
            onClearFilters={f.clearFilters}
          />
        }
        onRequestDelete={(e) => alert(`（demo）刪除 ${e.description ?? "支出"}`)}
        onViewImage={() => alert("（demo）檢視圖片")}
      />
    </div>
  )
}
