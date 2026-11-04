"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useLiff } from "@/components/auth/liff-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuickActions } from "@/components/v2/project/quick-actions"
import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"
import { primaryPayerName } from "@/lib/expense-payers"
import { useCurrencyConversion, useExpenseFilters, useProjectData } from "@/lib/hooks"
import { useProjectExpenses, type ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { summarizeExpenses } from "@/lib/expense-list"
import { formatTripDateRange } from "@/lib/trip"
import { DeleteExpenseSheet } from "./delete-expense-sheet"
import { ExpenseFilterBar } from "./expense-filter-bar"
import { ExpensesV2View } from "./expenses-v2-view"
import { loadFilters, saveFilters } from "./filter-storage"

export function ExpensesV2({ projectId }: { projectId: string }) {
  const { user } = useLiff()
  const { project, members, loading: projectLoading, projectCurrency, precision } = useProjectData(projectId)
  const { expenses, loading, deleting, canNotifyLine, deleteExpense, refetch } =
    useProjectExpenses(projectId, { projectName: project?.name || "" })
  const { convert } = useCurrencyConversion({ projectCurrency, precision })
  const f = useExpenseFilters(expenses, { convertAmount: convert })

  // Restore filters saved for this project when returning to the list (e.g.
  // pressing back from a card), then keep them persisted until cleared.
  const restoredRef = useRef(false)
  const skipPersistRef = useRef(false)
  const {
    filters,
    setSearchQuery,
    setCategories,
    setPayers,
    setParticipants,
    setCurrencies,
    setAmountRange,
    setCreatedDateRange,
    setExpenseDateRange,
  } = f
  useEffect(() => {
    const saved = loadFilters(projectId)
    if (saved) {
      skipPersistRef.current = true
      if (saved.searchQuery !== undefined) setSearchQuery(saved.searchQuery)
      if (saved.selectedCategories) setCategories(saved.selectedCategories)
      if (saved.selectedPayers) setPayers(saved.selectedPayers)
      if (saved.selectedParticipants) setParticipants(saved.selectedParticipants)
      if (saved.selectedCurrencies) setCurrencies(saved.selectedCurrencies)
      if (saved.amountRange) setAmountRange(saved.amountRange)
      if (saved.createdDateRange) setCreatedDateRange(saved.createdDateRange)
      if (saved.expenseDateRange) setExpenseDateRange(saved.expenseDateRange)
    }
    restoredRef.current = true
  }, [projectId, setSearchQuery, setCategories, setPayers, setParticipants, setCurrencies, setAmountRange, setCreatedDateRange, setExpenseDateRange])

  useEffect(() => {
    if (!restoredRef.current) return
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    saveFilters(projectId, filters)
  }, [projectId, filters])

  const [deleteTarget, setDeleteTarget] = useState<ProjectExpense | null>(null)
  const [notifyLine, setNotifyLine] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false)

  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? null
  const dateRange = project ? formatTripDateRange(project.startDate, project.endDate) : null
  const deleteExpenseSummary = deleteTarget
    ? {
        description: deleteTarget.description,
        amount: Number(deleteTarget.amount),
        currency: deleteTarget.currency || projectCurrency,
        category: deleteTarget.category,
        expenseDate: deleteTarget.expenseDate,
        payerName: primaryPayerName(deleteTarget.payers),
        participantCount: deleteTarget.participants.length,
      }
    : null
  const memberMeta = new Map(
    members.map((m) => [m.id, { image: m.user?.image ?? null, isPlaceholder: !m.user, userId: m.user?.id ?? null }]),
  )
  const withImage = <T extends { id: string }>(list: T[]) =>
    list.map((m) => ({
      ...m,
      ...(memberMeta.get(m.id) ?? { image: null, isPlaceholder: false, userId: null }),
    }))

  async function confirmDelete() {
    if (!deleteTarget) return
    if (await deleteExpense(deleteTarget.id, { notifyLine })) setDeleteTarget(null)
  }

  return (
    <>
      <div className="mx-auto max-w-md">
        {loading || projectLoading ? (
          <div data-testid="v2-expenses-skeleton" className="space-y-3 p-4">
            <div className="h-32 animate-pulse rounded-v2-lg bg-v2-sand" />
            <div className="h-24 animate-pulse rounded-2xl bg-v2-sand" />
            <div className="h-24 animate-pulse rounded-2xl bg-v2-sand" />
          </div>
        ) : (
          <>
            <ExpensesV2View
              projectId={projectId}
              currency={projectCurrency}
              dateRangeLabel={dateRange && dateRange !== "尚未設定日期" ? dateRange : null}
              allCount={expenses.length}
              expenses={f.filteredExpenses}
              summary={summarizeExpenses(f.filteredExpenses, convert, projectCurrency)}
              currentMemberId={currentMemberId}
              now={new Date()}
              filterBar={
                <ExpenseFilterBar
                  filters={f.filters}
                  currency={projectCurrency}
                  maxAmount={f.maxAmount}
                  payers={withImage(f.uniquePayers)}
                  participants={withImage(f.uniqueParticipants)}
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
            <QuickActions projectId={projectId} onVoice={() => setQuickExpenseOpen(true)} />
            <QuickExpenseV2
              open={quickExpenseOpen}
              onOpenChange={setQuickExpenseOpen}
              projectId={projectId}
              projectName={project?.name ?? ""}
              members={members.map((m) => ({
                id: m.id,
                displayName: m.displayName,
                image: m.user?.image ?? null,
                userId: m.userId,
                isCurrentUser: m.id === currentMemberId,
                isPlaceholder: !m.userId,
                remainderDiscrepancy: m.remainderDiscrepancy ?? 0,
              }))}
              currentUserMemberId={currentMemberId ?? ""}
              currency={projectCurrency}
              onSuccess={() => {
                refetch()
              }}
            />
          </>
        )}
      </div>

      <DeleteExpenseSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        expense={deleteExpenseSummary}
        canNotifyLine={canNotifyLine}
        notifyLine={notifyLine}
        onNotifyLineChange={setNotifyLine}
      />

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
    </>
  )
}
