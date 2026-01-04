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
  Filter,
  ChevronDown,
  X,
  Calendar as CalendarIcon,
  DollarSign,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { formatDistanceToNow } from "date-fns"
import { zhTW } from "date-fns/locale"

interface ExpenseMetadata {
  description?: string | null
  amount?: number
  category?: string | null
  payerName?: string
  expenseDate?: string
}

interface ActivityLog {
  id: string
  entityType: string
  entityId: string
  action: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  metadata: ExpenseMetadata | null
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
      return "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
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

const categoryLabels: Record<string, string> = {
  food: "餐飲",
  transport: "交通",
  accommodation: "住宿",
  entertainment: "娛樂",
  shopping: "購物",
  other: "其他",
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

// 格式化類別標籤
function formatCategory(category: string | null | undefined): string {
  if (!category) return ""
  return categoryLabels[category] || category
}

type ActionType = "create" | "update" | "delete"
type EntityType = "expense" | "member" | "project"

const ACTION_CONFIG: Record<ActionType, { label: string; icon: typeof Plus }> = {
  create: { label: "新增", icon: Plus },
  update: { label: "編輯", icon: Pencil },
  delete: { label: "刪除", icon: Trash2 },
}

const _ENTITY_CONFIG: Record<EntityType, { label: string }> = {
  expense: { label: "費用" },
  member: { label: "成員" },
  project: { label: "專案" },
}

export default function ActivityLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [selectedActions, setSelectedActions] = useState<Set<ActionType>>(new Set())
  const [selectedEntities, setSelectedEntities] = useState<Set<EntityType>>(new Set())
  const [selectedPayers, setSelectedPayers] = useState<Set<string>>(new Set())
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 0])
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(undefined)
  const [expenseDateRange, setExpenseDateRange] = useState<DateRange | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const authFetch = useAuthFetch()

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedActions.size > 0 ||
    selectedEntities.size > 0 ||
    selectedPayers.size > 0 ||
    amountRange[0] > 0 || amountRange[1] > 0 ||
    createdDateRange?.from !== undefined ||
    expenseDateRange?.from !== undefined

  const toggleAction = (action: ActionType) => {
    setSelectedActions((prev) => {
      const next = new Set(prev)
      if (next.has(action)) {
        next.delete(action)
      } else {
        next.add(action)
      }
      return next
    })
  }

  const _toggleEntity = (entity: EntityType) => {
    setSelectedEntities((prev) => {
      const next = new Set(prev)
      if (next.has(entity)) {
        next.delete(entity)
      } else {
        next.add(entity)
      }
      return next
    })
  }

  const togglePayer = (payer: string) => {
    setSelectedPayers((prev) => {
      const next = new Set(prev)
      if (next.has(payer)) {
        next.delete(payer)
      } else {
        next.add(payer)
      }
      return next
    })
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedActions(new Set())
    setSelectedEntities(new Set())
    setSelectedPayers(new Set())
    setAmountRange([0, 0])
    setCreatedDateRange(undefined)
    setExpenseDateRange(undefined)
  }

  // 從 logs 中提取唯一的付款人列表
  const uniquePayers = Array.from(
    new Set(
      logs
        .map((log) => log.metadata?.payerName)
        .filter((name): name is string => !!name)
    )
  )

  // 計算最大金額（用於滑桿）
  const maxAmount = Math.max(
    ...logs.filter((log) => log.metadata?.amount).map((log) => log.metadata!.amount!),
    1000
  )

  // 前端篩選
  const filteredLogs = logs.filter((log) => {
    // 搜尋篩選（描述、付款人、操作者）
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchDescription = log.metadata?.description?.toLowerCase().includes(query)
      const matchPayer = log.metadata?.payerName?.toLowerCase().includes(query)
      const matchActor = log.actor?.displayName?.toLowerCase().includes(query)
      if (!matchDescription && !matchPayer && !matchActor) {
        return false
      }
    }
    // 操作類型篩選
    if (selectedActions.size > 0 && !selectedActions.has(log.action as ActionType)) {
      return false
    }
    // 實體類型篩選
    if (selectedEntities.size > 0 && !selectedEntities.has(log.entityType as EntityType)) {
      return false
    }
    // 付款人篩選
    if (selectedPayers.size > 0 && log.metadata?.payerName && !selectedPayers.has(log.metadata.payerName)) {
      return false
    }
    // 金額篩選
    if (log.metadata?.amount !== undefined) {
      if (amountRange[0] > 0 && log.metadata.amount < amountRange[0]) return false
      if (amountRange[1] > 0 && log.metadata.amount > amountRange[1]) return false
    }
    // 創建時間篩選
    if (createdDateRange?.from || createdDateRange?.to) {
      const createdDate = new Date(log.createdAt)
      if (createdDateRange.from && createdDate < createdDateRange.from) return false
      if (createdDateRange.to) {
        const endOfDay = new Date(createdDateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        if (createdDate > endOfDay) return false
      }
    }
    // 支付時間篩選
    if (expenseDateRange?.from || expenseDateRange?.to) {
      if (!log.metadata?.expenseDate) return false
      const expenseDate = new Date(log.metadata.expenseDate)
      if (expenseDateRange.from && expenseDate < expenseDateRange.from) return false
      if (expenseDateRange.to) {
        const endOfDay = new Date(expenseDateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        if (expenseDate > endOfDay) return false
      }
    }
    return true
  })

  const fetchLogs = useCallback(async (offset = 0, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        limit: "50",
        offset: String(offset),
      })

      const res = await authFetch(`/api/projects/${id}/activity-logs?${params}`)
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
    fetchLogs(0, false)
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
        {/* 篩選器 */}
        <div className="mb-4 space-y-2">
          {/* 搜尋框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋描述、付款人、操作者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 第一行：主要篩選 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 操作類型篩選 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="justify-between">
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    操作
                    {selectedActions.size > 0 && (
                      <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {selectedActions.size}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuLabel>操作類型</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(ACTION_CONFIG) as [ActionType, { label: string; icon: typeof Plus }][]).map(
                  ([key, { label, icon: Icon }]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={selectedActions.has(key)}
                      onCheckedChange={() => toggleAction(key)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </DropdownMenuCheckboxItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 付款人篩選 */}
            {uniquePayers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      付款人
                      {selectedPayers.size > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                          {selectedPayers.size}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuLabel>付款人</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {uniquePayers.map((payer) => (
                    <DropdownMenuCheckboxItem
                      key={payer}
                      checked={selectedPayers.has(payer)}
                      onCheckedChange={() => togglePayer(payer)}
                    >
                      {payer}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* 金額篩選 - 範圍滑桿 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    {amountRange[0] > 0 || amountRange[1] > 0
                      ? `$${amountRange[0].toLocaleString()}~${amountRange[1] > 0 ? `$${amountRange[1].toLocaleString()}` : "不限"}`
                      : "金額"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-3">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">${amountRange[0].toLocaleString()}</span>
                    <span className="text-muted-foreground">~</span>
                    <span className="font-medium">
                      {amountRange[1] === 0 ? "不限" : `$${amountRange[1].toLocaleString()}`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">最低金額</label>
                    <input
                      type="range"
                      min={0}
                      max={maxAmount}
                      step={Math.max(1, Math.floor(maxAmount / 50))}
                      value={amountRange[0]}
                      onChange={(e) => setAmountRange([Number(e.target.value), amountRange[1]])}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">最高金額 (0=不限)</label>
                    <input
                      type="range"
                      min={0}
                      max={maxAmount}
                      step={Math.max(1, Math.floor(maxAmount / 50))}
                      value={amountRange[1]}
                      onChange={(e) => setAmountRange([amountRange[0], Number(e.target.value)])}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  {(amountRange[0] > 0 || amountRange[1] > 0) && (
                    <Button variant="ghost" size="sm" className="w-full h-7" onClick={() => setAmountRange([0, 0])}>
                      清除
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 紀錄時間篩選 - 日曆範圍選擇 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {createdDateRange?.from ? (
                      createdDateRange.to ? (
                        <>
                          {format(createdDateRange.from, "MM/dd")} ~ {format(createdDateRange.to, "MM/dd")}
                        </>
                      ) : (
                        format(createdDateRange.from, "MM/dd") + " ~"
                      )
                    ) : (
                      "紀錄時間"
                    )}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">選擇日期範圍</span>
                  {createdDateRange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCreatedDateRange(undefined)}
                    >
                      清除
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="range"
                  selected={createdDateRange}
                  onSelect={setCreatedDateRange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>

            {/* 支付時間篩選 - 日曆範圍選擇 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {expenseDateRange?.from ? (
                      expenseDateRange.to ? (
                        <>
                          {format(expenseDateRange.from, "MM/dd")} ~ {format(expenseDateRange.to, "MM/dd")}
                        </>
                      ) : (
                        format(expenseDateRange.from, "MM/dd") + " ~"
                      )
                    ) : (
                      "支付時間"
                    )}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">選擇日期範圍</span>
                  {expenseDateRange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setExpenseDateRange(undefined)}
                    >
                      清除
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="range"
                  selected={expenseDateRange}
                  onSelect={setExpenseDateRange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 第二行：清除篩選和結果統計 */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground h-7 px-2">
                <X className="h-3.5 w-3.5 mr-1" />
                清除所有篩選
              </Button>
              <span className="text-xs text-muted-foreground">
                顯示 {filteredLogs.length} / {logs.length} 筆
              </span>
            </div>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {hasActiveFilters ? "沒有符合條件的紀錄" : "還沒有操作紀錄"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
                清除所有篩選
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const changes = formatChanges(log.changes)
              const categoryLabel = formatCategory(log.metadata?.category)

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* 標題列：操作類型和時間 */}
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    log.action === "create" ? "bg-emerald-50 dark:bg-emerald-950/50" :
                    log.action === "update" ? "bg-orange-50 dark:bg-orange-950/50" :
                    log.action === "delete" ? "bg-red-50 dark:bg-red-950/50" :
                    "bg-slate-50 dark:bg-slate-800/50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <span className={`font-medium text-sm ${
                        log.action === "create" ? "text-emerald-700 dark:text-emerald-300" :
                        log.action === "update" ? "text-orange-700 dark:text-orange-300" :
                        log.action === "delete" ? "text-red-700 dark:text-red-300" :
                        "text-slate-700 dark:text-slate-300"
                      }`}>
                        {getActionText(log.action, log.entityType)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: zhTW,
                      })}
                    </span>
                  </div>

                  {/* 內容區 */}
                  <div className="p-4 space-y-3">
                    {/* 操作者資訊 */}
                    <div className="flex items-center gap-2">
                      {log.actor ? (
                        <>
                          {log.actor.user?.image ? (
                            <img
                              src={log.actor.user.image}
                              alt=""
                              className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {log.actor.displayName}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <Receipt className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="text-sm text-slate-500">系統</span>
                        </>
                      )}
                    </div>

                    {/* 費用摘要卡片 */}
                    {log.entityType === "expense" && log.metadata && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {log.metadata.description || "無描述"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {log.metadata.payerName && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  付款人：{log.metadata.payerName}
                                </span>
                              )}
                              {log.metadata.expenseDate && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(log.metadata.expenseDate).toLocaleDateString("zh-TW")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {log.metadata.amount !== undefined && (
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                ${log.metadata.amount.toLocaleString("zh-TW")}
                              </p>
                            )}
                            {categoryLabel && (
                              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {categoryLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 顯示變更內容 - 緊湊標籤樣式 */}
                    {changes && changes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {changes.map((change, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-1"
                          >
                            <span className="text-slate-500 dark:text-slate-400">{change.field}</span>
                            <span className="text-red-500 dark:text-red-400 line-through">{change.from}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{change.to}</span>
                          </span>
                        ))}
                      </div>
                    )}
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
