"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { useProjectData } from "@/lib/hooks"
import { useCurrencyConversion } from "@/lib/hooks/useCurrencyConversion"
import { previewRate } from "@/lib/currency-conversion"
import { useSaveExpense } from "@/lib/hooks/useSaveExpense"
import { buildExpenseChanges, type ExpenseSnapshot } from "@/lib/expense-changes"
import { primaryPayerId } from "@/lib/expense-payers"
import { getCurrentLocation } from "@/lib/geolocation"
import type { SplitDetail } from "@/lib/expense-split"
import { ExpenseFormV2View } from "./expense-form-v2-view"
import { useExpenseDraft, type DraftInit } from "./use-expense-draft"

interface LoadedExpense {
  amount: number
  currency: string | null
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  payers: { memberId: string; amount: number }[]
  participants: { memberId?: string; shareAmount: number; member?: { id: string } }[]
  splitDetail?: SplitDetail | null
}

interface Props {
  projectId: string
  expenseId?: string
  mode: "create" | "edit"
}

export function ExpenseFormV2({ projectId, expenseId, mode }: Props) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const { project, members, loading: projectLoading, projectCurrency } = useProjectData(projectId)
  const [expense, setExpense] = useState<LoadedExpense | null>(null)
  const [expenseLoading, setExpenseLoading] = useState(mode === "edit")

  useEffect(() => {
    if (mode !== "edit" || !expenseId) return
    let cancelled = false
    async function load() {
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/${expenseId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setExpense(data)
        } else {
          // Match v1's fetchExpenseData error handling exactly
          // (components/expense/expense-form.tsx): surface the failure with an
          // alert and bounce back to the expenses list.
          const errorData = await res.json().catch(() => ({}))
          const errorMsg = errorData.error || `載入失敗 (${res.status})`
          console.error("載入支出失敗:", res.status, errorData)
          alert(`無法載入支出資料：${errorMsg}`)
          router.push(`/projects/${projectId}/expenses`)
        }
      } catch (error) {
        console.error("獲取資料錯誤:", error)
        alert(`載入失敗：${error instanceof Error ? error.message : "未知錯誤"}`)
        router.push(`/projects/${projectId}/expenses`)
      } finally {
        if (!cancelled) setExpenseLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, expenseId, mode])

  const title = mode === "create" ? "新增支出" : "編輯支出"
  if (projectLoading || expenseLoading) {
    return (
      <UiV2Scope>
        <div className="mx-auto max-w-md">
          <V2TopBar title={title} backHref={`/projects/${projectId}`} />
          <div data-testid="v2-expense-form-skeleton" className="space-y-3 p-4">
            <div className="h-28 animate-pulse rounded-[20px] bg-v2-sand" />
            <div className="h-40 animate-pulse rounded-2xl bg-v2-sand" />
          </div>
        </div>
      </UiV2Scope>
    )
  }
  if (mode === "edit" && !expense) {
    return (
      <UiV2Scope>
        <div className="mx-auto max-w-md">
          <V2TopBar title={title} backHref={`/projects/${projectId}`} />
          <p className="py-8 text-center text-v2-ink-muted">找不到這筆支出</p>
        </div>
      </UiV2Scope>
    )
  }

  const draftMembers = members.map((m) => ({ id: m.id, displayName: m.displayName }))
  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? draftMembers[0]?.id ?? ""
  const init: DraftInit = {
    members: draftMembers,
    currency: projectCurrency,
    paidBy: currentMemberId,
    expense: expense
      ? {
          amount: Number(expense.amount),
          currency: expense.currency || projectCurrency,
          description: expense.description,
          category: expense.category,
          payers: expense.payers.map((p) => ({ memberId: p.memberId, amount: Number(p.amount) })),
          expenseDate: expense.expenseDate,
          location: expense.location,
          latitude: expense.latitude,
          longitude: expense.longitude,
          image: expense.image,
          participants: expense.participants.map((p) => ({
            memberId: p.member?.id ?? p.memberId ?? "",
            shareAmount: Number(p.shareAmount),
          })),
          splitDetail: expense.splitDetail ?? null,
        }
      : undefined,
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <LoadedForm
          key={expenseId ?? "new"}
          projectId={projectId}
          expenseId={expenseId}
          mode={mode}
          projectName={project?.name ?? ""}
          init={init}
          original={expense}
          projectCurrency={projectCurrency}
          customRates={project?.customRates ?? null}
        />
      </div>
    </UiV2Scope>
  )
}

function LoadedForm({
  projectId,
  expenseId,
  mode,
  projectName,
  init,
  original,
  projectCurrency,
  customRates,
}: Props & {
  projectName: string
  init: DraftInit
  original: LoadedExpense | null
  projectCurrency: string
  customRates: Record<string, number> | null
}) {
  const router = useRouter()
  const draft = useExpenseDraft(init)
  const { save, remove, saving, uploadingImage, deleting, canNotifyLine } = useSaveExpense(projectId)
  const { exchangeRates, refetch: refetchRates } = useCurrencyConversion({
    projectCurrency,
    customRates,
    autoFetch: false,
  })
  const selectedCurrency = draft.state.currency
  useEffect(() => {
    if (selectedCurrency && selectedCurrency !== projectCurrency && !exchangeRates) {
      refetchRates()
    }
  }, [selectedCurrency, projectCurrency, exchangeRates, refetchRates])
  const previewRateFor = (currency: string) =>
    previewRate(currency, projectCurrency, customRates, exchangeRates)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    // Match v1 (components/expense/expense-form.tsx): auto-fill the current
    // location on mount, create mode only, via the shared silent-failure helper.
    if (mode !== "create") return
    let cancelled = false
    getCurrentLocation().then((loc) => {
      if (loc && !cancelled) draft.actions.setLocation(loc)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  const nameOf = (id: string) => init.members.find((m) => m.id === id)?.displayName ?? "未知"
  const payerLabel = (payers: { memberId: string; amount: number }[]) =>
    payers.map((p) => nameOf(p.memberId)).join("、") || "無"
  const primaryPayerNameOf = (payers: { memberId: string; amount: number }[]) =>
    nameOf(primaryPayerId(payers.map((p) => ({ memberId: p.memberId, amount: Number(p.amount) }))))

  async function handleSubmit() {
    const { state, derived } = draft
    if (derived.error) return
    setSubmitError(null)
    const category = state.category || "other"
    const description = state.description.trim() || null
    const next: ExpenseSnapshot = {
      amount: derived.splitInput.amount,
      currency: state.currency,
      description,
      category,
      payers: derived.payers,
      payerLabel: payerLabel(derived.payers),
      expenseDate: state.expenseDate,
      location: state.location.location,
      image: state.image.pendingFile ? "pending" : state.image.image,
      participantIds: derived.splitInput.participantIds,
    }
    const changes =
      mode === "edit" && original
        ? buildExpenseChanges(
            {
              amount: Number(original.amount),
              currency: original.currency ?? state.currency,
              description: original.description,
              category: original.category,
              payers: original.payers,
              payerLabel: payerLabel(original.payers),
              expenseDate: new Date(original.expenseDate),
              location: original.location,
              image: original.image,
              participantIds: original.participants.map((p) => p.member?.id ?? p.memberId ?? ""),
            },
            next,
            { imageReplaced: state.image.pendingFile !== null }
          )
        : []
    const result = await save({
      mode,
      expenseId,
      payload: {
        payers: derived.payers,
        amount: derived.splitInput.amount,
        currency: state.currency,
        description,
        category,
        location: state.location.location,
        latitude: state.location.latitude,
        longitude: state.location.longitude,
        expenseDate: state.expenseDate.toISOString(),
        participants: derived.shares,
        splitDetail: derived.splitDetail,
      },
      image: {
        url: state.image.image,
        pendingFile: state.image.pendingFile,
        // v1 semantics (components/expense/expense-form.tsx `handleRemoveImage`):
        // an image gets queued for R2 deletion only when the final image URL
        // differs from the one the expense was loaded with (removed or replaced).
        pendingDeleteUrl: original?.image && original.image !== state.image.image ? original.image : null,
      },
      notification: { requested: state.notifyLine, projectName, payerName: primaryPayerNameOf(derived.payers), changes },
    })
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
  }

  async function handleDelete() {
    if (!expenseId || !original) return
    const result = await remove({
      expenseId,
      notification: {
        requested: draft.state.notifyLine,
        projectName,
        payerName: primaryPayerNameOf(original.payers),
        amount: Number(original.amount),
        description: original.description,
        category: original.category,
        participantCount: original.participants.length,
      },
    })
    if (!result.ok) {
      setShowDelete(false)
      setSubmitError(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
  }

  return (
    <>
      <ExpenseFormV2View
        mode={mode}
        projectId={projectId}
        members={init.members}
        draft={draft}
        canNotifyLine={canNotifyLine}
        submitting={saving || uploadingImage}
        submitError={submitError}
        onSubmit={handleSubmit}
        onRequestDelete={mode === "edit" ? () => setShowDelete(true) : undefined}
        projectCurrency={projectCurrency}
        previewRateFor={previewRateFor}
      />
      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        description="確定要刪除這筆支出嗎？此操作無法復原。"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {canNotifyLine && <NotifyLineCheckbox checked={draft.state.notifyLine} onChange={draft.actions.setNotifyLine} />}
      </ConfirmDeleteDialog>
    </>
  )
}
