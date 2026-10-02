"use client"

import { useState } from "react"
import Image from "next/image"
import { useLiff } from "@/components/auth/liff-provider"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"
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
  const { expenses, loading, deleting, canNotifyLine, refetch, deleteExpense, batchDeleteExpenses } =
    useProjectExpenses(projectId, { projectName: project?.name || "" })
  const f = useExpenseFilters(expenses)
  const { convert } = useCurrencyConversion({ projectCurrency, customRates, precision })

  const [deleteTarget, setDeleteTarget] = useState<ProjectExpense | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [notifyLine, setNotifyLine] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showVoice, setShowVoice] = useState(false)

  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? null
  const dateRange = project ? formatTripDateRange(project.startDate, project.endDate) : null

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (await deleteExpense(deleteTarget.id, { notifyLine })) setDeleteTarget(null)
  }

  async function confirmBatchDelete() {
    if (await batchDeleteExpenses(Array.from(selectedIds), { notifyLine })) {
      setSelectedIds(new Set())
      setSelectMode(false)
      setShowBatchDelete(false)
    }
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
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelectMode={() => {
              setSelectMode((v) => !v)
              setSelectedIds(new Set())
            }}
            onToggleSelect={toggleSelect}
            onRequestDelete={setDeleteTarget}
            onRequestBatchDelete={() => setShowBatchDelete(true)}
            onViewImage={setViewingImage}
            onVoice={() => setShowVoice(true)}
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

      <ConfirmDeleteDialog
        open={showBatchDelete}
        onOpenChange={setShowBatchDelete}
        title="確認批量刪除"
        description={`確定要刪除選取的 ${selectedIds.size} 筆支出嗎？此操作無法復原。`}
        onConfirm={confirmBatchDelete}
        loading={deleting}
        confirmText={`刪除 ${selectedIds.size} 筆`}
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

      <QuickExpenseV2
        open={showVoice}
        onOpenChange={setShowVoice}
        projectId={projectId}
        projectName={project?.name || ""}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName, userId: m.userId, user: m.user }))}
        currentUserMemberId={currentMemberId || ""}
        currency={projectCurrency}
        onSuccess={() => {
          refetch()
        }}
      />
    </UiV2Scope>
  )
}
