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
  Users,
  Filter,
  ChevronDown,
  X,
  Calendar as CalendarIcon,
  DollarSign,
  Tag,
  Coins,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SearchInput } from "@/components/ui/search-input"
import { FilterDropdown } from "@/components/ui/filter-dropdown"
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
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"

interface ExpenseMetadata {
  description?: string | null
  amount?: number
  category?: string | null
  payerName?: string
  expenseDate?: string
  currency?: string
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
      return "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
    case "delete":
      return "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
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

interface ParticipantsChange {
  count: number
  added?: string[]
  removed?: string[]
}

function formatChanges(changes: Record<string, { from: unknown; to: unknown }> | null, currency: string) {
  if (!changes) return null

  const fieldLabels: Record<string, string> = {
    amount: "金額",
    currency: "幣別",
    description: "描述",
    category: "類別",
    paidByMemberId: "付款人",
    expenseDate: "日期",
    location: "地點",
    participants: "分攤者",
  }

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return "無"
    if (field === "category") return categoryLabels[value as string] || String(value)
    if (field === "amount") return formatCurrency(Number(value), currency)
    if (field === "expenseDate") {
      const date = new Date(value as string)
      return date.toLocaleDateString("zh-TW")
    }
    return String(value)
  }

  // 處理 participants 的特殊格式
  const formatParticipantsChange = (from: ParticipantsChange, to: ParticipantsChange): { from: string; to: string } => {
    const parts: string[] = []

    // 顯示移除的成員
    if (from.removed && from.removed.length > 0) {
      parts.push(`移除：${from.removed.join("、")}`)
    }

    // 顯示加入的成員
    if (to.added && to.added.length > 0) {
      parts.push(`加入：${to.added.join("、")}`)
    }

    return {
      from: `${from.count}人`,
      to: parts.length > 0 ? `${to.count}人（${parts.join("；")}）` : `${to.count}人`,
    }
  }

  return Object.entries(changes).map(([field, { from, to }]) => {
    // 特殊處理 participants 欄位
    if (field === "participants" && typeof from === "object" && typeof to === "object") {
      const formatted = formatParticipantsChange(from as ParticipantsChange, to as ParticipantsChange)
      return {
        field: fieldLabels[field] || field,
        from: formatted.from,
        to: formatted.to,
      }
    }

    return {
      field: fieldLabels[field] || field,
      from: formatValue(field, from),
      to: formatValue(field, to),
    }
  })
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
  const [selectedActors, setSelectedActors] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(new Set())
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 0])
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(undefined)
  const [expenseDateRange, setExpenseDateRange] = useState<DateRange | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [projectCurrency, setProjectCurrency] = useState(DEFAULT_CURRENCY)
  const authFetch = useAuthFetch()

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedActions.size > 0 ||
    selectedEntities.size > 0 ||
    selectedPayers.size > 0 ||
    selectedActors.size > 0 ||
    selectedCategories.size > 0 ||
    selectedCurrencies.size > 0 ||
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

  const toggleActor = (actor: string) => {
    setSelectedActors((prev) => {
      const next = new Set(prev)
      if (next.has(actor)) {
        next.delete(actor)
      } else {
        next.add(actor)
      }
      return next
    })
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const toggleCurrency = (currency: string) => {
    setSelectedCurrencies((prev) => {
      const next = new Set(prev)
      if (next.has(currency)) {
        next.delete(currency)
      } else {
        next.add(currency)
      }
      return next
    })
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedActions(new Set())
    setSelectedEntities(new Set())
    setSelectedPayers(new Set())
    setSelectedActors(new Set())
    setSelectedCategories(new Set())
    setSelectedCurrencies(new Set())
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

  // 從 logs 中提取唯一的操作者列表
  const uniqueActors = Array.from(
    new Set(
      logs
        .map((log) => log.actor?.displayName)
        .filter((name): name is string => !!name)
    )
  )

  // 從 logs 中提取唯一的類別列表
  const uniqueCategories = Array.from(
    new Set(
      logs
        .map((log) => log.metadata?.category)
        .filter((cat): cat is string => !!cat)
    )
  )

  // 從 logs 中提取唯一的幣別列表
  const uniqueCurrencies = Array.from(
    new Set(
      logs
        .map((log) => log.metadata?.currency)
        .filter((cur): cur is string => !!cur)
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
    // 操作者篩選
    if (selectedActors.size > 0 && log.actor?.displayName && !selectedActors.has(log.actor.displayName)) {
      return false
    }
    // 類別篩選
    if (selectedCategories.size > 0 && log.metadata?.category && !selectedCategories.has(log.metadata.category)) {
      return false
    }
    // 幣別篩選
    if (selectedCurrencies.size > 0 && log.metadata?.currency && !selectedCurrencies.has(log.metadata.currency)) {
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

  // 獲取專案幣別
  const fetchProjectCurrency = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProjectCurrency(data.currency || DEFAULT_CURRENCY)
      }
    } catch (error) {
      console.error("獲取專案幣別錯誤:", error)
    }
  }, [authFetch, id])

  useEffect(() => {
    fetchLogs(0, false)
    fetchProjectCurrency()
  }, [fetchLogs, fetchProjectCurrency])

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
      <div className="pb-6">
        {/* 篩選器 */}
        <div className="mb-4 space-y-3">
          {/* 搜尋框 */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="搜尋描述、付款人、操作者..."
          />

          {/* 篩選按鈕 - 3x2 網格 */}
          <div className="grid grid-cols-3 gap-2">
            {/* 操作類型篩選 */}
            <FilterDropdown
              label="操作"
              icon={<Filter className="h-3.5 w-3.5" />}
              activeCount={selectedActions.size}
              contentClassName="w-32"
            >
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
            </FilterDropdown>

            {/* 操作者篩選 */}
            <FilterDropdown
              label="操作者"
              icon={<Users className="h-3.5 w-3.5" />}
              activeCount={selectedActors.size}
              contentClassName="w-36 max-h-60 overflow-y-auto"
            >
              <DropdownMenuLabel>誰執行操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueActors.length > 0 ? (
                uniqueActors.map((actor) => (
                  <DropdownMenuCheckboxItem
                    key={actor}
                    checked={selectedActors.has(actor)}
                    onCheckedChange={() => toggleActor(actor)}
                  >
                    {actor}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">無操作者</div>
              )}
            </FilterDropdown>

            {/* 類別篩選 */}
            <FilterDropdown
              label="類別"
              icon={<Tag className="h-3.5 w-3.5" />}
              activeCount={selectedCategories.size}
              contentClassName="w-32"
              align="end"
            >
              <DropdownMenuLabel>消費類別</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueCategories.length > 0 ? (
                uniqueCategories.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    checked={selectedCategories.has(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  >
                    {categoryLabels[cat] || cat}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">無類別</div>
              )}
            </FilterDropdown>

            {/* 付款人篩選 */}
            <FilterDropdown
              label="付款人"
              icon={<User className="h-3.5 w-3.5" />}
              activeCount={selectedPayers.size}
              contentClassName="w-36 max-h-60 overflow-y-auto"
            >
              <DropdownMenuLabel>誰付錢</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniquePayers.length > 0 ? (
                uniquePayers.map((payer) => (
                  <DropdownMenuCheckboxItem
                    key={payer}
                    checked={selectedPayers.has(payer)}
                    onCheckedChange={() => togglePayer(payer)}
                  >
                    {payer}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">無付款人</div>
              )}
            </FilterDropdown>

            {/* 建立日期篩選 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-1 truncate">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {createdDateRange?.from ? (
                        createdDateRange.to ? (
                          `${format(createdDateRange.from, "M/d")}~${format(createdDateRange.to, "M/d")}`
                        ) : (
                          format(createdDateRange.from, "M/d") + "~"
                        )
                      ) : (
                        "建立日期"
                      )}
                    </span>
                    {createdDateRange && (
                      <span className="px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full shrink-0">1</span>
                    )}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <div className="p-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">建立日期</span>
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

            {/* 付款日期篩選 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-1 truncate">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {expenseDateRange?.from ? (
                        expenseDateRange.to ? (
                          `${format(expenseDateRange.from, "M/d")}~${format(expenseDateRange.to, "M/d")}`
                        ) : (
                          format(expenseDateRange.from, "M/d") + "~"
                        )
                      ) : (
                        "付款日期"
                      )}
                    </span>
                    {expenseDateRange && (
                      <span className="px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full shrink-0">1</span>
                    )}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">付款日期</span>
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

            {/* 金額篩選 */}
            <FilterDropdown
              label="金額"
              icon={<DollarSign className="h-3.5 w-3.5" />}
              activeCount={(amountRange[0] > 0 || amountRange[1] > 0) ? 1 : 0}
              contentClassName="w-44 p-2.5"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{formatCurrency(amountRange[0], projectCurrency)}</span>
                  <span className="text-muted-foreground">~</span>
                  <span className="font-medium">
                    {amountRange[1] === 0 ? "不限" : formatCurrency(amountRange[1], projectCurrency)}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">最低</label>
                  <input
                    type="range"
                    min={0}
                    max={maxAmount}
                    step={Math.max(1, Math.floor(maxAmount / 50))}
                    value={amountRange[0]}
                    onChange={(e) => setAmountRange([Number(e.target.value), amountRange[1]])}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">最高 (0=不限)</label>
                  <input
                    type="range"
                    min={0}
                    max={maxAmount}
                    step={Math.max(1, Math.floor(maxAmount / 50))}
                    value={amountRange[1]}
                    onChange={(e) => setAmountRange([amountRange[0], Number(e.target.value)])}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                {(amountRange[0] > 0 || amountRange[1] > 0) && (
                  <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => setAmountRange([0, 0])}>
                    清除
                  </Button>
                )}
              </div>
            </FilterDropdown>

            {/* 幣別篩選 - 僅在有多種幣別時顯示 */}
            {uniqueCurrencies.length > 1 && (
              <FilterDropdown
                label="幣別"
                icon={<Coins className="h-3.5 w-3.5" />}
                activeCount={selectedCurrencies.size}
                contentClassName="w-32"
              >
                <DropdownMenuLabel>幣別</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueCurrencies.map((currency) => (
                  <DropdownMenuCheckboxItem
                    key={currency}
                    checked={selectedCurrencies.has(currency)}
                    onCheckedChange={() => toggleCurrency(currency)}
                  >
                    {currency}
                  </DropdownMenuCheckboxItem>
                ))}
              </FilterDropdown>
            )}
          </div>

          {/* 篩選結果統計 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              顯示 <span className="font-medium text-foreground">{filteredLogs.length}</span> / {logs.length} 筆
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground h-7 px-2">
                <X className="h-3.5 w-3.5 mr-1" />
                清除篩選
              </Button>
            )}
          </div>
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
              const changes = formatChanges(log.changes, projectCurrency)
              const categoryLabel = formatCategory(log.metadata?.category)

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* 標題列：操作類型和時間 */}
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    log.action === "create" ? "bg-emerald-50 dark:bg-emerald-950/50" :
                    log.action === "update" ? "bg-amber-50 dark:bg-amber-950/50" :
                    log.action === "delete" ? "bg-rose-50 dark:bg-rose-950/50" :
                    "bg-slate-50 dark:bg-slate-800/50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <span className={`font-medium text-sm ${
                        log.action === "create" ? "text-emerald-700 dark:text-emerald-300" :
                        log.action === "update" ? "text-amber-700 dark:text-amber-300" :
                        log.action === "delete" ? "text-rose-700 dark:text-rose-300" :
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
                                {formatCurrency(log.metadata.amount, projectCurrency)}
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
