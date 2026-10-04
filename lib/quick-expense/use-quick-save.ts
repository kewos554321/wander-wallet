"use client"

import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { computeShares } from "@/lib/expense-split"
import { uploadImageToR2 } from "@/lib/image-utils"
import { sendBatchExpenseNotificationToChat, sendExpenseNotificationToChat } from "@/lib/liff"
import { mergePreferences } from "@/types/user-preferences"
import type { QuickItem } from "./draft"

export interface SaveResult {
  savedIds: string[]
  failed: { index: number; message: string } | null
}

// Saves quick-expense items one by one. Stops at the first failure so the
// caller can keep only the unsaved items and retry without duplicates.
export function useQuickSave({ projectId, projectName, members }: { projectId: string; projectName: string; members: { id: string; displayName: string }[] }) {
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const canNotifyLine = canSendMessages && !isDevMode
  const payerName = useCallback((id: string) => members.find((m) => m.id === id)?.displayName || "未知", [members])

  const save = useCallback(
    async (items: QuickItem[], { notifyLine }: { notifyLine: boolean }): Promise<SaveResult> => {
      const saved: QuickItem[] = []
      let failed: SaveResult["failed"] = null
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        setProgress({ current: i + 1, total: items.length })
        try {
          let image = item.image.image
          if (item.image.pendingFile) {
            try {
              image = (await uploadImageToR2(item.image.pendingFile, projectId, authFetch)).url
            } catch {
              // An image upload failure must not block saving the expense.
              image = null
            }
          }
          const amount = Number(item.amount)
          const participants = computeShares({ amount, participantIds: item.participantIds, personalItems: {}, customShares: {} })
          const res = await authFetch(`/api/projects/${projectId}/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paidByMemberId: item.payerId,
              amount,
              currency: item.currency,
              description: item.description.trim() || null,
              category: item.category,
              image,
              location: item.location,
              latitude: item.latitude,
              longitude: item.longitude,
              expenseDate: item.expenseDate.toISOString(),
              participants,
            }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.error || `儲存第 ${i + 1} 筆失敗`)
          }
          saved.push(item)
        } catch (err) {
          failed = { index: i, message: err instanceof Error ? err.message : `儲存第 ${i + 1} 筆失敗` }
          break
        }
      }
      setProgress(null)

      if (saved.length > 0 && notifyLine && canNotifyLine && mergePreferences(user?.preferences).notifications.expenseCreated) {
        const summary = (e: QuickItem) => ({
          amount: Number(e.amount),
          description: e.description || undefined,
          category: e.category || undefined,
          payerName: payerName(e.payerId),
          participantCount: e.participantIds.length,
        })
        const send =
          saved.length === 1
            ? sendExpenseNotificationToChat({ operationType: "create", projectName, projectId, ...summary(saved[0]) })
            : sendBatchExpenseNotificationToChat({ projectName, projectId, expenses: saved.map(summary) })
        send.catch(() => {
          // Notification failures are silent.
        })
      }
      return { savedIds: saved.map((s) => s.id), failed }
    },
    [authFetch, canNotifyLine, payerName, projectId, projectName, user?.preferences]
  )

  return { save, progress, canNotifyLine }
}
