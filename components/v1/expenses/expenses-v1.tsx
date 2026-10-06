"use client"

import React, { useState } from "react"
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
import { Plus, Trash2, User, Users, Utensils, Car, Home, Gamepad2, ShoppingBag, Wallet, Ticket, Gift, Receipt, CheckSquare, X, Search, Filter, MapPin, Sparkles, CalendarDays, DollarSign, ChevronDown, Coins } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import { FilterDropdown } from "@/components/ui/filter-dropdown"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { useLiff } from "@/components/auth/liff-provider"
import { formatCurrency } from "@/lib/constants/currencies"
import { primaryPayerId } from "@/lib/expense-payers"
import { VoiceExpenseDialog } from "@/components/voice/voice-expense-dialog"
import { useProjectData, useExpenseFilters, useCurrencyConversion } from "@/lib/hooks"
import { AdContainer } from "@/components/ads/ad-container"
import { useProjectExpenses } from "@/lib/hooks/useProjectExpenses"
import {
  AmountRangeFilterContent,
  CategoryFilterItems,
  CurrencyFilterItems,
  DateRangeFilterContent,
  MemberFilterItems,
} from "@/components/expense/expense-filter-content"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"

export function ExpensesV1({ projectId: id }: { projectId: string }) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [notifyLineOnDelete, setNotifyLineOnDelete] = useState(true)
  const [showVoiceDialog, setShowVoiceDialog] = useState(false)
  const { user } = useLiff()

  // 使用共用 hooks
  const {
    project,
    members,
    loading: projectLoading,
    projectCurrency,
    customRates,
    precision,
  } = useProjectData(id)

  const {
    expenses,
    loading: expensesLoading,
    deleting,
    canNotifyLine,
    refetch: fetchExpenses,
    deleteExpense,
    batchDeleteExpenses,
  } = useProjectExpenses(id, { projectName: project?.name || "" })

  const {
    filters,
    filteredExpenses,
    hasActiveFilters,
    setSearchQuery,
    toggleCategory,
    togglePayer,
    toggleParticipant,
    toggleCurrency,
    setAmountRange,
    setCreatedDateRange,
    setExpenseDateRange,
    clearFilters,
    uniquePayers,
    uniqueParticipants,
    uniqueCurrencies,
    maxAmount: maxExpenseAmount,
  } = useExpenseFilters(expenses)

  const { convert: convertToProjectCurrency } = useCurrencyConversion({
    projectCurrency,
    customRates,
    precision,
  })

  // 找出當前用戶的 memberId
  const currentUserMemberId = members.find((m) => m.user?.id === user?.id)?.id || ""

  const loading = projectLoading || expensesLoading

  async function handleDelete() {
    if (!deleteId) return
    if (await deleteExpense(deleteId, { notifyLine: notifyLineOnDelete })) {
      setDeleteId(null)
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return
    if (await batchDeleteExpenses(Array.from(selectedIds), { notifyLine: notifyLineOnDelete })) {
      setSelectedIds(new Set())
      setSelectMode(false)
      setShowBatchDeleteDialog(false)
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

  // 檢查是否有多種幣別
  const hasMixedCurrencies = new Set(filteredExpenses.map(e => e.currency)).size > 1

  // 檢查是否使用自訂匯率
  const hasCustomRates = customRates && Object.keys(customRates).length > 0

  // 計算總金額（轉換為專案幣別）
  const totalAmount = filteredExpenses.reduce((sum, e) => {
    const convertedAmount = convertToProjectCurrency(Number(e.amount), e.currency)
    return sum + convertedAmount
  }, 0)

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
        {/* 頂部廣告 */}
        <AdContainer placement="expense-list" variant="banner" />

        {/* 總計摘要 - 緊湊版 */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs text-muted-foreground">
              總支出{hasMixedCurrencies && " (已換算)"}
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(totalAmount, projectCurrency)}
            </p>
            {hasMixedCurrencies && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                含多種幣別，{hasCustomRates ? "依自訂匯率換算" : "依即時匯率換算"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-lg font-semibold tabular-nums">{filteredExpenses.length}</p>
              <p className="text-xs text-muted-foreground">筆支出</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-lg font-semibold tabular-nums text-primary">
                {formatCurrency(filteredExpenses.length > 0 ? Math.round(totalAmount / filteredExpenses.length) : 0, projectCurrency)}
              </p>
              <p className="text-xs text-muted-foreground">平均每筆</p>
            </div>
          </div>
        </div>

        {/* 搜尋與篩選 */}
        {expenses.length > 0 && (
          <div className="space-y-3">
            {/* 搜尋框 */}
            <SearchInput
              value={filters.searchQuery}
              onChange={setSearchQuery}
              placeholder="搜尋支出描述..."
            />

            {/* 篩選按鈕 - 3x2 網格 */}
            <div className="grid grid-cols-3 gap-2">
              {/* 類別篩選 */}
              <FilterDropdown
                label="類別"
                icon={<Filter className="h-3.5 w-3.5" />}
                activeCount={filters.selectedCategories.size}
                contentClassName="w-32"
              >
                <CategoryFilterItems selected={filters.selectedCategories} onToggle={toggleCategory} />
              </FilterDropdown>

              {/* 付款人篩選 */}
              <FilterDropdown
                label="付款人"
                icon={<User className="h-3.5 w-3.5" />}
                activeCount={filters.selectedPayers.size}
                contentClassName="w-36 max-h-60 overflow-y-auto"
              >
                <MemberFilterItems heading="誰付錢" emptyText="無付款人" members={uniquePayers} selected={filters.selectedPayers} onToggle={togglePayer} />
              </FilterDropdown>

              {/* 參與者篩選 */}
              <FilterDropdown
                label="參與者"
                icon={<Users className="h-3.5 w-3.5" />}
                activeCount={filters.selectedParticipants.size}
                align="end"
                contentClassName="w-36 max-h-60 overflow-y-auto"
              >
                <MemberFilterItems heading="有參與分攤" emptyText="無參與者" members={uniqueParticipants} selected={filters.selectedParticipants} onToggle={toggleParticipant} />
              </FilterDropdown>

              {/* 幣別篩選 */}
              {uniqueCurrencies.length > 1 && (
                <FilterDropdown
                  label="幣別"
                  icon={<Coins className="h-3.5 w-3.5" />}
                  activeCount={filters.selectedCurrencies.size}
                  contentClassName="w-28"
                >
                  <CurrencyFilterItems currencies={uniqueCurrencies} selected={filters.selectedCurrencies} onToggle={toggleCurrency} />
                </FilterDropdown>
              )}

              {/* 金額篩選 */}
              <FilterDropdown
                label="金額"
                icon={<DollarSign className="h-3.5 w-3.5" />}
                activeCount={(filters.amountRange[0] > 0 || filters.amountRange[1] > 0) ? 1 : 0}
                contentClassName="w-44 p-2.5"
              >
                <AmountRangeFilterContent range={filters.amountRange} max={maxExpenseAmount} currency={projectCurrency} onChange={setAmountRange} />
              </FilterDropdown>

              {/* 建立日期篩選 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-1 truncate">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {filters.createdDateRange?.from ? (
                          filters.createdDateRange.to ? (
                            `${format(filters.createdDateRange.from, "M/d")}~${format(filters.createdDateRange.to, "M/d")}`
                          ) : (
                            format(filters.createdDateRange.from, "M/d") + "~"
                          )
                        ) : (
                          "建立日期"
                        )}
                      </span>
                      {filters.createdDateRange?.from && (
                        <span className="px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full shrink-0">1</span>
                      )}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <DateRangeFilterContent title="建立日期" range={filters.createdDateRange} onChange={setCreatedDateRange} />
                </PopoverContent>
              </Popover>

              {/* 付款日期篩選 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-1 truncate">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {filters.expenseDateRange?.from ? (
                          filters.expenseDateRange.to ? (
                            `${format(filters.expenseDateRange.from, "M/d")}~${format(filters.expenseDateRange.to, "M/d")}`
                          ) : (
                            format(filters.expenseDateRange.from, "M/d") + "~"
                          )
                        ) : (
                          "付款日期"
                        )}
                      </span>
                      {filters.expenseDateRange?.from && (
                        <span className="px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full shrink-0">1</span>
                      )}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <DateRangeFilterContent title="付款日期" range={filters.expenseDateRange} onChange={setExpenseDateRange} />
                </PopoverContent>
              </Popover>
            </div>

            {/* 篩選結果與操作按鈕 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                顯示 <span className="font-medium text-foreground">{filteredExpenses.length}</span> / {expenses.length} 筆
              </span>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-7 px-2">
                    <X className="h-3.5 w-3.5 mr-1" />
                    清除
                  </Button>
                )}
                {!selectMode ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="h-7 gap-1">
                    <CheckSquare className="h-3.5 w-3.5" />
                    批次
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={exitSelectMode} className="h-7 gap-1">
                    <X className="h-3.5 w-3.5" />
                    取消
                  </Button>
                )}
              </div>
            </div>
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
            <Button variant="outline" onClick={clearFilters}>
              清除所有篩選
            </Button>
          </div>
        ) : (
          <>
            {filteredExpenses.map((expense, index) => {
              const isSelected = selectedIds.has(expense.id)
              const categoryInfo = getCategoryInfo(expense.category)
              const CategoryIcon = categoryInfo?.icon || Receipt
              const payers = expense.payers ?? []
              const primaryPayer = payers.find((p) => p.memberId === primaryPayerId(payers))
              const primaryPayerName = primaryPayer?.member.displayName || "未知"
              const payerLabel = payers.length > 1 ? `${primaryPayerName}等 ${payers.length} 人` : primaryPayerName

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
                              {formatCurrency(Number(expense.amount), expense.currency)}
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
                            <div className={`flex items-start gap-1 mt-1.5 ${expense.image ? "pr-12" : ""}`}>
                              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {expense.location}
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
                              const avatarData = parseAvatarString(primaryPayer?.member.user?.image)
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
                              const primaryImage = primaryPayer?.member.user?.image
                              const hasExternalImage = primaryImage && !primaryImage.startsWith("avatar:")
                              return (
                                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                  {hasExternalImage ? (
                                    <Image
                                      src={primaryImage}
                                      alt={primaryPayerName}
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
                            <span className="text-sm font-medium">{payerLabel}</span>
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
                                    title={`${p.member.displayName}: ${formatCurrency(Number(p.shareAmount), expense.currency)}`}
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
                                  title={`${p.member.displayName}: ${formatCurrency(Number(p.shareAmount), expense.currency)}`}
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

              return (
                <React.Fragment key={expense.id}>
                  {selectMode ? (
                    <div onClick={() => toggleSelect(expense.id)}>
                      {cardContent}
                    </div>
                  ) : (
                    <Link href={`/projects/${id}/expenses/${expense.id}/edit`}>
                      {cardContent}
                    </Link>
                  )}
                </React.Fragment>
              )
            })}
          </>
        )}

              </div>

      {/* 浮動按鈕群組 - 垂直排列 */}
      {!selectMode && (
        <div className="fixed bottom-6 right-4 z-50 flex flex-col items-center gap-3">
          {/* AI 語音記帳按鈕 - 珊瑚暖色漸層（與品牌色互補） */}
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg shadow-orange-400/30 bg-gradient-to-br from-orange-300 to-rose-400 hover:from-orange-400 hover:to-rose-500 hover:scale-105 active:scale-95 transition-all duration-200 text-white ring-2 ring-white/20"
            onClick={() => setShowVoiceDialog(true)}
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          {/* 新增支出按鈕 - 品牌色漸層 */}
          <Link href={`/projects/${id}/expenses/new`}>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg shadow-brand-500/30 bg-gradient-to-br from-brand-400 to-brand-600 hover:from-brand-500 hover:to-brand-700 hover:scale-105 active:scale-95 transition-all duration-200 text-white ring-2 ring-white/20">
              <Plus className="h-5 w-5" />
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
        {canNotifyLine && <NotifyLineCheckbox checked={notifyLineOnDelete} onChange={setNotifyLineOnDelete} />}
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
        {canNotifyLine && <NotifyLineCheckbox checked={notifyLineOnDelete} onChange={setNotifyLineOnDelete} />}
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

      {/* AI 語音記帳對話框 */}
      <VoiceExpenseDialog
        open={showVoiceDialog}
        onOpenChange={setShowVoiceDialog}
        projectId={id}
        projectName={project?.name || ""}
        members={members.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          userId: m.userId,
          user: m.user,
        }))}
        currentUserMemberId={currentUserMemberId}
        currency={projectCurrency}
        onSuccess={() => {
          fetchExpenses()
        }}
      />

    </AppLayout>
  )
}


