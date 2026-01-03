"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Plus, Trash2, User, Utensils, Car, Home, Gamepad2, ShoppingBag, Wallet, Ticket, Gift, Receipt, CheckSquare, X, Search, Filter, ChevronDown, MapPin, Sparkles } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { sendDeleteNotificationToChat, sendBatchDeleteNotificationToChat } from "@/lib/liff"
import { VoiceExpenseDialog } from "@/components/voice/voice-expense-dialog"

interface Member {
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

interface ExpenseParticipant {
  id: string
  shareAmount: number
  member: Member
}

interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  createdAt: string
  payer: Member
  participants: ExpenseParticipant[]
}

export default function ExpensesList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedPayers, setSelectedPayers] = useState<Set<string>>(new Set())
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 0])
  const [notifyLineOnDelete, setNotifyLineOnDelete] = useState(true)
  const [projectName, setProjectName] = useState("")
  const [showVoiceDialog, setShowVoiceDialog] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserMemberId, setCurrentUserMemberId] = useState("")
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()

  useEffect(() => {
    fetchExpenses()
    fetchProjectName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchExpenses() {
    try {
      const res = await authFetch(`/api/projects/${id}/expenses`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error("獲取支出列表錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProjectName() {
    try {
      const res = await authFetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProjectName(data.name)
        // 設定成員資料供 AI 語音記帳使用
        if (data.members) {
          setMembers(data.members.map((m: Member & { user?: Member["user"] }) => ({
            id: m.id,
            displayName: m.displayName,
            userId: m.user?.id || null,
            user: m.user || null,
          })))
          // 找出當前用戶的 memberId
          const currentMember = data.members.find((m: Member) => m.user?.id === user?.id)
          if (currentMember) {
            setCurrentUserMemberId(currentMember.id)
          }
        }
      }
    } catch (error) {
      console.error("獲取專案名稱錯誤:", error)
    }
  }

  async function handleDelete() {
    if (!deleteId) return

    // 先取得要刪除的支出資料（用於通知）
    const expenseToDelete = expenses.find((e) => e.id === deleteId)

    setDeleting(true)
    try {
      const res = await authFetch(`/api/projects/${id}/expenses/${deleteId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // 發送 LINE 通知
        if (notifyLineOnDelete && canSendMessages && !isDevMode && expenseToDelete) {
          sendDeleteNotificationToChat({
            projectName,
            projectId: id,
            payerName: expenseToDelete.payer.displayName,
            amount: expenseToDelete.amount,
            description: expenseToDelete.description || undefined,
            category: expenseToDelete.category || undefined,
            participantCount: expenseToDelete.participants.length,
          }).catch(() => {
            // 發送失敗時靜默處理，不影響使用者體驗
          })
        }

        setExpenses(expenses.filter((e) => e.id !== deleteId))
        setDeleteId(null)
      } else {
        const data = await res.json()
        alert(data.error || "刪除失敗")
      }
    } catch (error) {
      console.error("刪除支出錯誤:", error)
      alert("刪除失敗")
    } finally {
      setDeleting(false)
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return

    // 先取得要刪除的支出資料（用於通知）
    const expensesToDelete = expenses.filter((e) => selectedIds.has(e.id))

    setDeleting(true)
    try {
      const res = await authFetch(`/api/projects/${id}/expenses/batch`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: Array.from(selectedIds) }),
      })

      if (res.ok) {
        // 發送 LINE 通知（合併為單一通知）
        if (notifyLineOnDelete && canSendMessages && !isDevMode && expensesToDelete.length > 0) {
          sendBatchDeleteNotificationToChat({
            projectName,
            projectId: id,
            expenses: expensesToDelete.map((expense) => ({
              amount: expense.amount,
              description: expense.description || undefined,
              category: expense.category || undefined,
              payerName: expense.payer.displayName,
              participantCount: expense.participants.length,
            })),
          }).catch(() => {
            // 發送失敗時靜默處理，不影響使用者體驗
          })
        }

        setExpenses(expenses.filter((e) => !selectedIds.has(e.id)))
        setSelectedIds(new Set())
        setSelectMode(false)
        setShowBatchDeleteDialog(false)
      } else {
        const data = await res.json()
        alert(data.error || "刪除失敗")
      }
    } catch (error) {
      console.error("批量刪除支出錯誤:", error)
      alert("刪除失敗")
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(expenseId: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId)
    } else {
      newSelected.add(expenseId)
    }
    setSelectedIds(newSelected)
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function formatExpenseDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }) +
      " " + date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
  }

  function formatCreatedDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }) +
      " " + date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
  }

  const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Utensils; color: string }> = {
    food: { label: "餐飲", icon: Utensils, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400" },
    transport: { label: "交通", icon: Car, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" },
    accommodation: { label: "住宿", icon: Home, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400" },
    ticket: { label: "票券", icon: Ticket, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" },
    shopping: { label: "購物", icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" },
    entertainment: { label: "娛樂", icon: Gamepad2, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400" },
    gift: { label: "禮品", icon: Gift, color: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" },
    other: { label: "其他", icon: Wallet, color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
  }

  function getCategoryInfo(category: string | null) {
    if (!category) return null
    return CATEGORY_CONFIG[category] || { label: category, icon: Receipt, color: "bg-slate-100 text-slate-600" }
  }

  // Get unique payers for filter
  const uniquePayers = Array.from(
    new Map(expenses.map((e) => [e.payer.id, e.payer])).values()
  )

  // Filter expenses based on search query and filters
  const filteredExpenses = expenses.filter((expense) => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      (expense.description?.toLowerCase().includes(searchQuery.toLowerCase()))

    // Category filter
    const matchesCategory = selectedCategories.size === 0 ||
      (expense.category && selectedCategories.has(expense.category))

    // Payer filter
    const matchesPayer = selectedPayers.size === 0 ||
      selectedPayers.has(expense.payer.id)

    // Amount filter
    const expenseAmount = Number(expense.amount)
    const [minVal, maxVal] = amountRange
    const matchesMinAmount = minVal === 0 || expenseAmount >= minVal
    const matchesMaxAmount = maxVal === 0 || expenseAmount <= maxVal

    return matchesSearch && matchesCategory && matchesPayer && matchesMinAmount && matchesMaxAmount
  })

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const maxExpenseAmount = Math.max(...expenses.map(e => Number(e.amount)), 0)
  const hasActiveFilters = searchQuery !== "" || selectedCategories.size > 0 || selectedPayers.size > 0 || amountRange[0] > 0 || amountRange[1] > 0

  function toggleCategory(category: string) {
    const newCategories = new Set(selectedCategories)
    if (newCategories.has(category)) {
      newCategories.delete(category)
    } else {
      newCategories.add(category)
    }
    setSelectedCategories(newCategories)
  }

  function togglePayer(payerId: string) {
    const newPayers = new Set(selectedPayers)
    if (newPayers.has(payerId)) {
      newPayers.delete(payerId)
    } else {
      newPayers.add(payerId)
    }
    setSelectedPayers(newPayers)
  }

  function clearAllFilters() {
    setSearchQuery("")
    setSelectedCategories(new Set())
    setSelectedPayers(new Set())
    setAmountRange([0, 0])
  }

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="支出列表" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title={selectMode ? `已選 ${selectedIds.size} 筆` : "支出列表"}
      showBack={!selectMode}
      backHref={backHref}
    >
      <div className="flex flex-col gap-4 pb-24">
        {/* 總計摘要 - 緊湊版 */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs text-muted-foreground">總支出</p>
            <p className="text-2xl font-bold tabular-nums">
              ${totalAmount.toLocaleString("zh-TW")}
            </p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-lg font-semibold tabular-nums">{filteredExpenses.length}</p>
              <p className="text-xs text-muted-foreground">筆支出</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-lg font-semibold tabular-nums text-primary">
                ${filteredExpenses.length > 0 ? Math.round(totalAmount / filteredExpenses.length).toLocaleString("zh-TW") : 0}
              </p>
              <p className="text-xs text-muted-foreground">平均每筆</p>
            </div>
          </div>
        </div>

        {/* 搜尋與篩選 */}
        {expenses.length > 0 && (
          <div className="space-y-3">
            {/* 第一行：篩選按鈕 */}
            <div className="grid grid-cols-3 gap-2">
              {/* 類別篩選 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5" />
                      類別
                      {selectedCategories.size > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                          {selectedCategories.size}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>選擇類別</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon }]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={selectedCategories.has(key)}
                      onCheckedChange={() => toggleCategory(key)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 付款人篩選 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      付款人
                      {selectedPayers.size > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                          {selectedPayers.size}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>選擇付款人</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {uniquePayers.map((payer) => (
                    <DropdownMenuCheckboxItem
                      key={payer.id}
                      checked={selectedPayers.has(payer.id)}
                      onCheckedChange={() => togglePayer(payer.id)}
                    >
                      {payer.displayName}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 金額篩選 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-1.5">
                      $ 金額
                      {(amountRange[0] > 0 || amountRange[1] > 0) && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                          1
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <DropdownMenuLabel className="px-0 pb-3">金額範圍</DropdownMenuLabel>
                  <div className="space-y-4">
                    {/* 顯示當前範圍 */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        ${amountRange[0].toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">~</span>
                      <span className="font-medium">
                        {amountRange[1] === 0 ? "不限" : `$${amountRange[1].toLocaleString()}`}
                      </span>
                    </div>

                    {/* 最低金額滑桿 */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">最低</label>
                      <input
                        type="range"
                        min={0}
                        max={maxExpenseAmount || 10000}
                        step={Math.max(1, Math.floor((maxExpenseAmount || 10000) / 100))}
                        value={amountRange[0]}
                        onChange={(e) => setAmountRange([Number(e.target.value), amountRange[1]])}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* 最高金額滑桿 */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">最高 (0 = 不限)</label>
                      <input
                        type="range"
                        min={0}
                        max={maxExpenseAmount || 10000}
                        step={Math.max(1, Math.floor((maxExpenseAmount || 10000) / 100))}
                        value={amountRange[1]}
                        onChange={(e) => setAmountRange([amountRange[0], Number(e.target.value)])}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {(amountRange[0] > 0 || amountRange[1] > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setAmountRange([0, 0])}
                      >
                        清除金額篩選
                      </Button>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              </div>

            {/* 第二行：搜尋 + 批次管理 + 清除篩選 */}
            <div className="flex items-center gap-2">
              {/* 搜尋輸入框 */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋支出描述..."
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

              {/* 清除篩選 */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground shrink-0">
                  清除
                </Button>
              )}

              {/* 批次按鈕 */}
              {!selectMode ? (
                <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5 shrink-0">
                  <CheckSquare className="h-4 w-4" />
                  批次
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={exitSelectMode} className="gap-1.5 shrink-0">
                  <X className="h-4 w-4" />
                  取消
                </Button>
              )}
            </div>

            {/* 篩選結果提示 */}
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground">
                顯示 {filteredExpenses.length} / {expenses.length} 筆
              </p>
            )}
          </div>
        )}

        {/* 多選模式工具列 */}
        {selectMode && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">全選</span>
            </label>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setShowBatchDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              刪除 {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </Button>
          </div>
        )}

        {/* 支出列表 */}
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">尚無支出記錄</h3>
            <p className="text-muted-foreground text-sm mb-6">開始記錄您的第一筆支出</p>
            <Link href={`/projects/${id}/expenses/new`}>
              <Button className="rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" />
                新增支出
              </Button>
            </Link>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">找不到符合的支出</h3>
            <p className="text-muted-foreground text-sm mb-6">嘗試調整搜尋條件或篩選器</p>
            <Button variant="outline" onClick={clearAllFilters}>
              清除所有篩選
            </Button>
          </div>
        ) : (
          <>
            {filteredExpenses.map((expense) => {
              const isSelected = selectedIds.has(expense.id)
              const categoryInfo = getCategoryInfo(expense.category)
              const CategoryIcon = categoryInfo?.icon || Receipt

              const cardContent = (
                  <div className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all cursor-pointer border border-slate-100 dark:border-slate-800 ${
                    selectMode
                      ? isSelected
                        ? "ring-2 ring-primary border-primary"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      : "hover:shadow-lg hover:border-slate-200"
                  }`}
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                  >
                    {/* 主內容區 */}
                    <div className="p-4">
                      <div className="flex gap-3">
                        {/* 左側：Checkbox 或 類別圖標+標籤 */}
                        {selectMode ? (
                          <div className="pt-0.5">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(expense.id)}
                              className="h-5 w-5"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${categoryInfo?.color || "bg-slate-100 text-slate-600"}`}>
                              <CategoryIcon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              {categoryInfo?.label || "其他"}
                            </span>
                          </div>
                        )}

                        {/* 中間內容 */}
                        <div className="flex-1 min-w-0 relative">
                          {/* 第一行：描述 + 金額 */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-base truncate flex-1 min-w-0">
                              {expense.description || "未知"}
                            </h3>
                            <p className="font-bold text-lg tabular-nums shrink-0">
                              ${Number(expense.amount).toLocaleString("zh-TW")}
                            </p>
                          </div>

                          {/* 第二行：付款時間 */}
                          <div className="text-xs text-muted-foreground mt-1">
                            付款 {formatExpenseDate(expense.expenseDate)}
                          </div>

                          {/* 第三行：建立時間 */}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            建立 {formatCreatedDate(expense.createdAt)}
                          </div>

                          {/* 第四行：位置（如果有） */}
                          {expense.location && (
                            <div className="flex items-start gap-1 mt-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {expense.location.length > 40
                                  ? expense.location.substring(0, 40) + "..."
                                  : expense.location}
                              </span>
                            </div>
                          )}

                          {/* 圖片縮圖 - 絕對定位右下角 */}
                          {expense.image && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setViewingImage(expense.image)
                              }}
                              className="absolute right-0 bottom-0 h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors"
                            >
                              <Image
                                src={expense.image}
                                alt="收據"
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 底部：付款人 + 分擔者 */}
                    {expense.participants.length > 0 && (
                      <div className="mx-4 mb-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* 付款人 */}
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const avatarData = parseAvatarString(expense.payer?.user?.image)
                              if (avatarData) {
                                const Icon = getAvatarIcon(avatarData.iconId)
                                return (
                                  <div
                                    className="h-6 w-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                                  >
                                    <Icon className="h-3 w-3 text-white" />
                                  </div>
                                )
                              }
                              const hasExternalImage = expense.payer?.user?.image && !expense.payer.user.image.startsWith("avatar:")
                              return (
                                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                  {hasExternalImage ? (
                                    <Image
                                      src={expense.payer!.user!.image!}
                                      alt={expense.payer!.displayName}
                                      width={24}
                                      height={24}
                                      className="rounded-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-3 w-3 text-slate-500" />
                                  )}
                                </div>
                              )
                            })()}
                            <span className="text-sm font-medium">{expense.payer.displayName}</span>
                          </div>

                          <span className="text-slate-300 dark:text-slate-600">·</span>

                          {/* 分擔者頭像 */}
                          <div className="flex -space-x-1.5">
                            {expense.participants.slice(0, 4).map((p) => {
                              const avatarData = parseAvatarString(p.member.user?.image)
                              if (avatarData) {
                                const Icon = getAvatarIcon(avatarData.iconId)
                                return (
                                  <div
                                    key={p.id}
                                    className="h-5 w-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900"
                                    style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                                    title={`${p.member.displayName}: $${p.shareAmount}`}
                                  >
                                    <Icon className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )
                              }
                              const hasExternalImage = p.member.user?.image && !p.member.user.image.startsWith("avatar:")
                              return (
                                <div
                                  key={p.id}
                                  className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-900"
                                  title={`${p.member.displayName}: $${p.shareAmount}`}
                                >
                                  {hasExternalImage ? (
                                    <Image
                                      src={p.member.user!.image!}
                                      alt={p.member.displayName}
                                      width={20}
                                      height={20}
                                      className="rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-300">
                                      {p.member.displayName[0]?.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                            {expense.participants.length > 4 && (
                              <div className="h-5 w-5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[9px] font-medium border-2 border-white dark:border-slate-900">
                                +{expense.participants.length - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {expense.participants.length}人
                          </span>
                        </div>

                        {/* 刪除按鈕 */}
                        {!selectMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setDeleteId(expense.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
              )

              return selectMode ? (
                <div key={expense.id} onClick={() => toggleSelect(expense.id)}>
                  {cardContent}
                </div>
              ) : (
                <Link key={expense.id} href={`/projects/${id}/expenses/${expense.id}/edit`}>
                  {cardContent}
                </Link>
              )
            })}
          </>
        )}

              </div>

      {/* 浮動按鈕群組 */}
      {!selectMode && (
        <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3">
          {/* AI 語音記帳按鈕 */}
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl shadow-violet-500/30 bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 hover:scale-110 hover:shadow-2xl hover:shadow-violet-500/40 active:scale-95 transition-all duration-200 text-white"
            onClick={() => setShowVoiceDialog(true)}
          >
            <Sparkles className="h-6 w-6" />
          </Button>

          {/* 新增支出按鈕 */}
          <Link href={`/projects/${id}/expenses/new`}>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-xl shadow-primary/30 hover:scale-110 hover:shadow-2xl hover:shadow-primary/40 active:scale-95 transition-all duration-200">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      )}

      {/* 單筆刪除確認對話框 */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        description="確定要刪除這筆支出嗎？此操作無法復原。"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {canSendMessages && !isDevMode && (
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <Checkbox
              checked={notifyLineOnDelete}
              onCheckedChange={(checked) => setNotifyLineOnDelete(checked === true)}
            />
            <div>
              <span className="text-sm font-medium">通知 LINE 群組</span>
              <p className="text-xs text-muted-foreground">刪除後自動發送通知到群組</p>
            </div>
          </label>
        )}
      </ConfirmDeleteDialog>

      {/* 批量刪除確認對話框 */}
      <ConfirmDeleteDialog
        open={showBatchDeleteDialog}
        onOpenChange={setShowBatchDeleteDialog}
        title="確認批量刪除"
        description={`確定要刪除選取的 ${selectedIds.size} 筆支出嗎？此操作無法復原。`}
        onConfirm={handleBatchDelete}
        loading={deleting}
        confirmText={`刪除 ${selectedIds.size} 筆`}
      >
        {canSendMessages && !isDevMode && (
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <Checkbox
              checked={notifyLineOnDelete}
              onCheckedChange={(checked) => setNotifyLineOnDelete(checked === true)}
            />
            <div>
              <span className="text-sm font-medium">通知 LINE 群組</span>
              <p className="text-xs text-muted-foreground">刪除後自動發送通知到群組</p>
            </div>
          </label>
        )}
      </ConfirmDeleteDialog>

      {/* 圖片檢視對話框 */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>消費圖片</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="relative w-full">
              <Image
                src={viewingImage}
                alt="消費圖片"
                width={800}
                height={600}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </AppLayout>
  )
}


