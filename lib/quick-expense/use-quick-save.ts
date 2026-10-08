"use client"

import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { buildSplitDetail } from "@/lib/expense-split"
import { primaryPayerId } from "@/lib/expense-payers"
import { deriveSplit, type SplitState } from "@/lib/split-draft"
import { uploadImageToR2 } from "@/lib/image-utils"
import { sendBatchExpenseNotificationToChat, sendExpenseNotificationToChat } from "@/lib/liff"
import { mergePreferences } from "@/types/user-preferences"
import { itemDerivedPayers, type QuickItem } from "./draft"

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
  const displayName = useCallback((id: string) => members.find((m) => m.id === id)?.displayName || "未知", [members])

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
          const splitState: SplitState = {
            pool: item.participantIds,
            personalMode: item.personalMode,
            personalItems: item.personalItems,
            personalMembers: item.personalMembers,
            customShares: item.customShares,
          }
          const derived = deriveSplit(amount, members.map((m) => m.id), splitState)
          const res = await authFetch(`/api/projects/${projectId}/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payers: itemDerivedPayers(item).payers,
              amount,
              currency: item.currency,
              exchangeRate:
                item.ratePinned && item.exchangeRate?.trim() && Number(item.exchangeRate) > 0
                  ? Number(item.exchangeRate)
                  : undefined,
              description: item.description.trim() || null,
              category: item.category,
              image,
              location: item.location,
              latitude: item.latitude,
              longitude: item.longitude,
              expenseDate: item.expenseDate.toISOString(),
              participants: derived.shares,
              splitDetail: buildSplitDetail(derived.splitInput),
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
        const summary = (e: QuickItem) => {
          const state: SplitState = {
            pool: e.participantIds,
            personalMode: e.personalMode,
            personalItems: e.personalItems,
            personalMembers: e.personalMembers,
            customShares: e.customShares,
          }
          const derived = deriveSplit(Number(e.amount), members.map((m) => m.id), state)
          const primaryId = primaryPayerId(itemDerivedPayers(e).payers)
          return {
            amount: Number(e.amount),
            description: e.description || undefined,
            category: e.category || undefined,
            payerName: primaryId ? displayName(primaryId) : "未知",
            participantCount: derived.shares.length,
          }
        }
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
    [authFetch, canNotifyLine, displayName, projectId, projectName, members, user?.preferences]
  )

  return { save, progress, canNotifyLine }
}
