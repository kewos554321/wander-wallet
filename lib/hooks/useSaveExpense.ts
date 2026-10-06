"use client"

// Extracted from v1's `handleSubmit`/`handleDelete` in
// components/expense/expense-form.tsx so both the v1 and v2 expense forms
// can share the same save/delete + LINE-notification flow.
import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { uploadImageToR2 } from "@/lib/image-utils"
import { sendDeleteNotificationToChat, sendExpenseNotificationToChat, type ExpenseChange } from "@/lib/liff"
import type { ParticipantShare, SplitDetail } from "@/lib/expense-split"
import type { PayerShare } from "@/lib/expense-payers"
import { mergePreferences } from "@/types/user-preferences"

export interface ExpensePayload {
  payers: PayerShare[]
  amount: number
  currency: string
  description: string | null
  category: string
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  participants: ParticipantShare[]
  splitDetail: SplitDetail | null
}

interface SaveRequest {
  mode: "create" | "edit"
  expenseId?: string
  payload: ExpensePayload
  image: { url: string | null; pendingFile: File | null; pendingDeleteUrl: string | null }
  notification: { requested: boolean; projectName: string; payerName: string; changes: ExpenseChange[] }
}

interface RemoveRequest {
  expenseId: string
  notification: {
    requested: boolean
    projectName: string
    payerName: string
    amount: number
    description: string | null
    category: string | null
    participantCount: number
  }
}

type Result = { ok: true } | { ok: false; error: string }

export function useSaveExpense(projectId: string) {
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canNotifyLine = canSendMessages && !isDevMode
  const prefs = mergePreferences(user?.preferences).notifications

  const save = useCallback(
    async (req: SaveRequest): Promise<Result> => {
      const fallback = req.mode === "create" ? "新增失敗" : "更新失敗"
      setSaving(true)
      try {
        let imageUrl = req.image.url
        if (req.image.pendingFile) {
          setUploadingImage(true)
          try {
            imageUrl = (await uploadImageToR2(req.image.pendingFile, projectId, authFetch)).url
          } catch (error) {
            console.error("圖片上傳失敗:", error)
            return { ok: false, error: "圖片上傳失敗，請重試" }
          } finally {
            setUploadingImage(false)
          }
        }

        const url =
          req.mode === "create"
            ? `/api/projects/${projectId}/expenses`
            : `/api/projects/${projectId}/expenses/${req.expenseId}`
        const res = await authFetch(url, {
          method: req.mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...req.payload, image: imageUrl || null }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          return { ok: false, error: data.error || fallback }
        }

        if (req.image.pendingDeleteUrl && req.image.pendingDeleteUrl !== imageUrl) {
          authFetch(`/api/upload?url=${encodeURIComponent(req.image.pendingDeleteUrl)}`, { method: "DELETE" }).catch(
            (error) => console.error("刪除舊圖片失敗:", error)
          )
        }

        const enabled = req.mode === "create" ? prefs.expenseCreated : prefs.expenseUpdated
        if (req.notification.requested && canNotifyLine && enabled) {
          sendExpenseNotificationToChat({
            operationType: req.mode === "create" ? "create" : "update",
            projectName: req.notification.projectName,
            projectId,
            payerName: req.notification.payerName,
            amount: req.payload.amount,
            description: req.payload.description || undefined,
            category: req.payload.category || undefined,
            participantCount: req.payload.participants.length,
            changes: req.notification.changes.length > 0 ? req.notification.changes : undefined,
          }).catch(() => {
            // Notification failures must not affect the save.
          })
        }
        return { ok: true }
      } catch (error) {
        console.error(req.mode === "create" ? "新增支出錯誤:" : "更新支出錯誤:", error)
        return { ok: false, error: fallback }
      } finally {
        setSaving(false)
      }
    },
    [authFetch, projectId, canNotifyLine, prefs.expenseCreated, prefs.expenseUpdated]
  )

  const remove = useCallback(
    async (req: RemoveRequest): Promise<Result> => {
      setDeleting(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/${req.expenseId}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          return { ok: false, error: data.error || "刪除失敗" }
        }
        const n = req.notification
        if (n.requested && canNotifyLine && prefs.expenseDeleted) {
          sendDeleteNotificationToChat({
            projectName: n.projectName,
            projectId,
            payerName: n.payerName,
            amount: n.amount,
            description: n.description || undefined,
            category: n.category || undefined,
            participantCount: n.participantCount,
          }).catch(() => {
            // Notification failures must not affect the delete.
          })
        }
        return { ok: true }
      } catch (error) {
        console.error("刪除支出錯誤:", error)
        return { ok: false, error: "刪除失敗" }
      } finally {
        setDeleting(false)
      }
    },
    [authFetch, projectId, canNotifyLine, prefs.expenseDeleted]
  )

  return { save, remove, saving, uploadingImage, deleting, canNotifyLine }
}
