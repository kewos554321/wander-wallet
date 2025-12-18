"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, User, Utensils, Car, Home, Gamepad2, ShoppingBag, MoreHorizontal, Coffee, Ticket, Gift, Heart, Receipt, CheckSquare, X, ImageIcon, Search, Filter, ChevronDown } from "lucide-react"
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
import { useAuthFetch } from "@/components/auth/liff-provider"

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
  const authFetch = useAuthFetch()

  useEffect(() => {
    fetchExpenses()
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

  async function handleDelete() {
    if (!deleteId) return

    setDeleting(true)
    try {
      const res = await authFetch(`/api/projects/${id}/expenses/${deleteId}`, {
        method: "DELETE",
      })

      if (res.ok) {
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

    setDeleting(true)
    try {
      const res = await authFetch(`/api/projects/${id}/expenses/batch`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseIds: Array.from(selectedIds) }),
      })

      if (res.ok) {
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
    drinks: { label: "飲品", icon: Coffee, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" },
    transport: { label: "交通", icon: Car, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" },
    accommodation: { label: "住宿", icon: Home, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400" },
    entertainment: { label: "娛樂", icon: Gamepad2, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400" },
    shopping: { label: "購物", icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" },
    ticket: { label: "票券", icon: Ticket, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" },
    gift: { label: "禮物", icon: Gift, color: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" },
    medical: { label: "醫療", icon: Heart, color: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" },
    other: { label: "其他", icon: MoreHorizontal, color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
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

    return matchesSearch && matchesCategory && matchesPayer
  })

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const hasActiveFilters = searchQuery !== "" || selectedCategories.size > 0 || selectedPayers.size > 0

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
      <div className="flex flex-col gap-5 pb-24">
        {/* 總計摘要 */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
        >
          {/* 總金額 */}
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-1">總支出</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              ${totalAmount.toLocaleString("zh-TW")}
            </p>
          </div>

          {/* 統計數據 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{filteredExpenses.length}</p>
              <p className="text-xs text-muted-foreground">筆支出</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary tabular-nums">
                ${filteredExpenses.length > 0 ? Math.round(totalAmount / filteredExpenses.length).toLocaleString("zh-TW") : 0}
              </p>
              <p className="text-xs text-muted-foreground">平均每筆</p>
            </div>
          </div>
        </div>

        {/* 分隔線 */}
        <div className="border-t border-slate-200 dark:border-slate-700" />

        {/* 搜尋與篩選 */}
        {expenses.length > 0 && (
          <div className="space-y-3">
            {/* 搜尋輸入框 */}
            <div className="relative">
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

            {/* 篩選按鈕列 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 類別篩選 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    類別
                    {selectedCategories.size > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {selectedCategories.size}
                      </span>
                    )}
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
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    付款人
                    {selectedPayers.size > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {selectedPayers.size}
                      </span>
                    )}
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

              {/* 清除篩選 */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                  清除篩選
                </Button>
              )}

              {/* 批次管理按鈕 */}
              <div className="ml-auto">
                {!selectMode ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5">
                    <CheckSquare className="h-4 w-4" />
                    批次管理
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={exitSelectMode} className="gap-1.5">
                    <X className="h-4 w-4" />
                    取消
                  </Button>
                )}
              </div>
            </div>

            {/* 篩選結果提示 */}
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground">
                顯示 {filteredExpenses.length} / {expenses.length} 筆支出
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
                              {expense.description || "無描述"}
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

        {/* 新增按鈕 */}
        {filteredExpenses.length > 0 && !selectMode && (
          <Link href={`/projects/${id}/expenses/new`} className="block">
            <button className="w-full py-4 px-4 rounded-xl border border-dashed border-slate-200 text-sm text-muted-foreground hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              新增支出
            </button>
          </Link>
        )}
      </div>


      {/* 單筆刪除確認對話框 */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除這筆支出嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "刪除中..." : "刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量刪除確認對話框 */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認批量刪除</DialogTitle>
            <DialogDescription>
              確定要刪除選取的 {selectedIds.size} 筆支出嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={deleting}
            >
              {deleting ? "刪除中..." : `刪除 ${selectedIds.size} 筆`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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


