"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { useProjectData } from "@/lib/hooks"
import { useSaveExpense } from "@/lib/hooks/useSaveExpense"
import { buildExpenseChanges, type ExpenseSnapshot } from "@/lib/expense-changes"
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
  paidByMemberId?: string
  payer: { id: string; displayName: string }
  participants: { memberId?: string; shareAmount: number; member?: { id: string } }[]
  splitDetail?: SplitDetail | null
}

interface Props {
  projectId: string
  expenseId?: string
  mode: "create" | "edit"
}

export function ExpenseFormV2({ projectId, expenseId, mode }: Props) {
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const { project, members, loading: projectLoading, projectCurrency } = useProjectData(projectId)
  const [expense, setExpense] = useState<LoadedExpense | null>(null)
  const [expenseLoading, setExpenseLoading] = useState(mode === "edit")

  useEffect(() => {
    if (mode !== "edit" || !expenseId) return
    authFetch(`/api/projects/${projectId}/expenses/${expenseId}`)
      .then(async (res) => (res.ok ? setExpense(await res.json()) : null))
      .catch((error) => console.error("載入支出失敗:", error))
      .finally(() => setExpenseLoading(false))
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
          paidByMemberId: expense.paidByMemberId ?? expense.payer.id,
          expenseDate: expense.expenseDate,
          location: expense.location,
          latitude: expense.latitude,
          longitude: expense.longitude,
          image: expense.image,
          participants: expense.participants.map((p) => ({ memberId: p.member?.id ?? p.memberId ?? "" })),
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
}: Props & { projectName: string; init: DraftInit; original: LoadedExpense | null }) {
  const router = useRouter()
  const draft = useExpenseDraft(init)
  const { save, remove, saving, uploadingImage, deleting, canNotifyLine } = useSaveExpense(projectId)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const nameOf = (id: string) => init.members.find((m) => m.id === id)?.displayName ?? "未知"

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
      paidByMemberId: state.paidBy,
      payerName: nameOf(state.paidBy),
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
              paidByMemberId: original.paidByMemberId ?? original.payer.id,
              payerName: original.payer.displayName,
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
        paidByMemberId: state.paidBy,
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
      notification: { requested: state.notifyLine, projectName, payerName: nameOf(state.paidBy), changes },
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
        payerName: original.payer.displayName,
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
