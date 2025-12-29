"use client"

import { use, useEffect, useState, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Clock,
  User,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhTW } from "date-fns/locale"

interface ActivityLog {
  id: string
  entityType: string
  entityId: string
  action: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  createdAt: string
  actor: {
    id: string
    displayName: string
    user: {
      image: string | null
    } | null
  } | null
}

interface ActivityLogsResponse {
  logs: ActivityLog[]
  total: number
  hasMore: boolean
}

function getActionIcon(action: string) {
  switch (action) {
    case "create":
      return <Plus className="h-4 w-4" />
    case "update":
      return <Pencil className="h-4 w-4" />
    case "delete":
      return <Trash2 className="h-4 w-4" />
    default:
      return <Receipt className="h-4 w-4" />
  }
}

function getActionColor(action: string) {
  switch (action) {
    case "create":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
    case "update":
      return "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
    case "delete":
      return "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
    default:
      return "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  }
}

function getActionText(action: string, entityType: string) {
  const entityName = entityType === "expense" ? "費用" : entityType === "member" ? "成員" : "項目"
  switch (action) {
    case "create":
      return `新增${entityName}`
    case "update":
      return `編輯${entityName}`
    case "delete":
      return `刪除${entityName}`
    default:
      return `操作${entityName}`
  }
}

function formatChanges(changes: Record<string, { from: unknown; to: unknown }> | null) {
  if (!changes) return null

  const fieldLabels: Record<string, string> = {
    amount: "金額",
    description: "描述",
    category: "類別",
    paidByMemberId: "付款人",
    expenseDate: "日期",
    location: "地點",
  }

  const categoryLabels: Record<string, string> = {
    food: "餐飲",
    transport: "交通",
    accommodation: "住宿",
    entertainment: "娛樂",
    shopping: "購物",
    other: "其他",
  }

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return "無"
    if (field === "category") return categoryLabels[value as string] || String(value)
    if (field === "amount") return `$${Number(value).toLocaleString("zh-TW")}`
    if (field === "expenseDate") {
      const date = new Date(value as string)
      return date.toLocaleDateString("zh-TW")
    }
    return String(value)
  }

  return Object.entries(changes).map(([field, { from, to }]) => ({
    field: fieldLabels[field] || field,
    from: formatValue(field, from),
    to: formatValue(field, to),
  }))
}

export default function ActivityLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const authFetch = useAuthFetch()

  const fetchLogs = useCallback(async (offset = 0, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const res = await authFetch(`/api/projects/${id}/activity-logs?limit=20&offset=${offset}`)
      if (!res.ok) return

      const data: ActivityLogsResponse = await res.json()

      if (append) {
        setLogs((prev) => [...prev, ...data.logs])
      } else {
        setLogs(data.logs)
      }
      setHasMore(data.hasMore)
    } catch (error) {
      console.error("獲取歷史紀錄錯誤:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [authFetch, id])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchLogs(logs.length, true)
    }
  }

  if (loading) {
    return (
      <AppLayout title="歷史紀錄" showBack backHref={`/projects/${id}`}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="歷史紀錄" showBack backHref={`/projects/${id}`}>
      <div className="pb-6 px-3 sm:px-4">
        {logs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">還沒有操作紀錄</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const changes = formatChanges(log.changes)

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${getActionColor(log.action)}`}
                    >
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {getActionText(log.action, log.entityType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {log.actor ? (
                          <span className="flex items-center gap-1">
                            {log.actor.user?.image ? (
                              <img
                                src={log.actor.user.image}
                                alt=""
                                className="h-4 w-4 rounded-full"
                              />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                            {log.actor.displayName}
                          </span>
                        ) : (
                          <span>系統</span>
                        )}
                        <span>·</span>
                        <span>
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: zhTW,
                          })}
                        </span>
                      </div>

                      {/* 顯示變更內容 */}
                      {changes && changes.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {changes.map((change, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2"
                            >
                              <span className="text-slate-500 dark:text-slate-400">
                                {change.field}：
                              </span>
                              <span className="text-red-500 line-through mr-1">
                                {change.from}
                              </span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {change.to}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {loadingMore ? "載入中..." : "載入更多"}
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
