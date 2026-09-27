"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { sendBatchDeleteNotificationToChat, sendDeleteNotificationToChat } from "@/lib/liff"
import { mergePreferences } from "@/types/user-preferences"

export interface ExpenseMember {
  id: string
  displayName: string
  userId: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface ProjectExpense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  createdAt: string
  payer: ExpenseMember
  participants: { id: string; shareAmount: number; member: ExpenseMember }[]
}

export function useProjectExpenses(projectId: string, options: { projectName: string }) {
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()
  const [expenses, setExpenses] = useState<ProjectExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const canNotifyLine = canSendMessages && !isDevMode
  const deleteNotificationsEnabled = mergePreferences(user?.preferences).notifications.expenseDeleted

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}/expenses`)
      if (res.ok) {
        setExpenses(await res.json())
      }
    } catch (error) {
      console.error("獲取支出列表錯誤:", error)
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId])

  // Keyed on projectId only, like the original page: a session-token refresh
  // must not reload the list.
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const deleteExpense = useCallback(
    async (expenseId: string, opts: { notifyLine: boolean }) => {
      const target = expenses.find((e) => e.id === expenseId)
      setDeleting(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/${expenseId}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "刪除失敗")
          return false
        }
        if (opts.notifyLine && canNotifyLine && deleteNotificationsEnabled && target) {
          sendDeleteNotificationToChat({
            projectName: options.projectName,
            projectId,
            payerName: target.payer.displayName,
            amount: target.amount,
            description: target.description || undefined,
            category: target.category || undefined,
            participantCount: target.participants.length,
          }).catch(() => {
            // Notification failures must not affect the delete.
          })
        }
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
        return true
      } catch (error) {
        console.error("刪除支出錯誤:", error)
        alert("刪除失敗")
        return false
      } finally {
        setDeleting(false)
      }
    },
    [authFetch, projectId, expenses, canNotifyLine, deleteNotificationsEnabled, options.projectName]
  )

  const batchDeleteExpenses = useCallback(
    async (expenseIds: string[], opts: { notifyLine: boolean }) => {
      if (expenseIds.length === 0) return false
      const ids = new Set(expenseIds)
      const targets = expenses.filter((e) => ids.has(e.id))
      setDeleting(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/batch`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expenseIds }),
        })
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "刪除失敗")
          return false
        }
        if (opts.notifyLine && canNotifyLine && deleteNotificationsEnabled && targets.length > 0) {
          sendBatchDeleteNotificationToChat({
            projectName: options.projectName,
            projectId,
            expenses: targets.map((e) => ({
              amount: e.amount,
              description: e.description || undefined,
              category: e.category || undefined,
              payerName: e.payer.displayName,
              participantCount: e.participants.length,
            })),
          }).catch(() => {
            // Notification failures must not affect the delete.
          })
        }
        setExpenses((prev) => prev.filter((e) => !ids.has(e.id)))
        return true
      } catch (error) {
        console.error("批量刪除支出錯誤:", error)
        alert("刪除失敗")
        return false
      } finally {
        setDeleting(false)
      }
    },
    [authFetch, projectId, expenses, canNotifyLine, deleteNotificationsEnabled, options.projectName]
  )

  return { expenses, loading, deleting, canNotifyLine, refetch, deleteExpense, batchDeleteExpenses }
}
