"use client"

import { useState } from "react"
import Image from "next/image"
import { useLiff } from "@/components/auth/liff-provider"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { useCurrencyConversion, useExpenseFilters, useProjectData } from "@/lib/hooks"
import { useProjectExpenses, type ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { summarizeExpenses } from "@/lib/expense-list"
import { formatTripDateRange } from "@/lib/trip"
import { ExpenseFilterBar } from "./expense-filter-bar"
import { ExpensesV2View } from "./expenses-v2-view"

export function ExpensesV2({ projectId }: { projectId: string }) {
  const { user } = useLiff()
  const { project, members, loading: projectLoading, projectCurrency, customRates, precision } = useProjectData(projectId)
  const { expenses, loading, deleting, canNotifyLine, deleteExpense } =
    useProjectExpenses(projectId, { projectName: project?.name || "" })
  const f = useExpenseFilters(expenses)
  const { convert } = useCurrencyConversion({ projectCurrency, customRates, precision })

  const [deleteTarget, setDeleteTarget] = useState<ProjectExpense | null>(null)
  const [notifyLine, setNotifyLine] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? null
  const dateRange = project ? formatTripDateRange(project.startDate, project.endDate) : null

  async function confirmDelete() {
    if (!deleteTarget) return
    if (await deleteExpense(deleteTarget.id, { notifyLine })) setDeleteTarget(null)
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        {loading || projectLoading ? (
          <div data-testid="v2-expenses-skeleton" className="space-y-3 p-4">
            <div className="h-32 animate-pulse rounded-[18px] bg-v2-sand" />
            <div className="h-24 animate-pulse rounded-2xl bg-v2-sand" />
            <div className="h-24 animate-pulse rounded-2xl bg-v2-sand" />
          </div>
        ) : (
          <ExpensesV2View
            projectId={projectId}
            currency={projectCurrency}
            dateRangeLabel={dateRange && dateRange !== "尚未設定日期" ? dateRange : null}
            allCount={expenses.length}
            expenses={f.filteredExpenses}
            summary={summarizeExpenses(f.filteredExpenses, convert)}
            currentMemberId={currentMemberId}
            now={new Date()}
            filterBar={
              <ExpenseFilterBar
                filters={f.filters}
                currency={projectCurrency}
                maxAmount={f.maxAmount}
                payers={f.uniquePayers}
                participants={f.uniqueParticipants}
                currencies={f.uniqueCurrencies}
                hasActiveFilters={f.hasActiveFilters}
                currentMemberId={currentMemberId}
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
            onRequestDelete={setDeleteTarget}
            onViewImage={setViewingImage}
          />
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description="確定要刪除這筆支出嗎？此操作無法復原。"
        onConfirm={confirmDelete}
        loading={deleting}
      >
        {canNotifyLine && <NotifyLineCheckbox checked={notifyLine} onChange={setNotifyLine} />}
      </ConfirmDeleteDialog>

      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>消費圖片</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <Image src={viewingImage} alt="消費圖片" width={800} height={600} className="h-auto max-h-[80vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </UiV2Scope>
  )
}
