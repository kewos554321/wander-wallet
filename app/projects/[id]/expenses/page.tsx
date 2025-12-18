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
import { Plus, Trash2, User, Utensils, Car, Home, Gamepad2, ShoppingBag, MoreHorizontal, Coffee, Ticket, Gift, Heart, Receipt, CheckSquare, X } from "lucide-react"
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
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return `今天 ${date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`
    } else if (days === 1) {
      return `昨天 ${date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`
    } else if (days < 7) {
      return `${days} 天前`
    } else {
      return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" })
    }
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

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

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
      rightAction={
        expenses.length > 0 && !selectMode ? (
          <Button variant="outline" size="icon" onClick={() => setSelectMode(true)} title="批次管理">
            <CheckSquare className="h-4 w-4" />
          </Button>
        ) : selectMode ? (
          <Button variant="outline" size="icon" onClick={exitSelectMode} title="取消批次">
            <X className="h-4 w-4" />
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5 pb-24">
        {/* 多選模式工具列 */}
        {selectMode && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedIds.size === expenses.length && expenses.length > 0}
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
              <p className="text-2xl font-bold tabular-nums">{expenses.length}</p>
              <p className="text-xs text-muted-foreground">筆支出</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary tabular-nums">
                ${expenses.length > 0 ? Math.round(totalAmount / expenses.length).toLocaleString("zh-TW") : 0}
              </p>
              <p className="text-xs text-muted-foreground">平均每筆</p>
            </div>
          </div>
        </div>

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
        ) : (
          <>
            {expenses.map((expense) => {
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
                        {/* 左側：Checkbox 或 類別圖標 */}
                        {selectMode ? (
                          <div className="pt-0.5">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(expense.id)}
                              className="h-5 w-5"
                            />
                          </div>
                        ) : (
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${categoryInfo?.color || "bg-slate-100 text-slate-600"}`}>
                            <CategoryIcon className="h-6 w-6" />
                          </div>
                        )}

                        {/* 右側內容 */}
                        <div className="flex-1 min-w-0">
                          {/* 第一行：描述 + 金額 */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base truncate">
                                {expense.description || "無描述"}
                              </h3>
                            </div>
                            <p className="font-bold text-lg tabular-nums shrink-0">
                              ${Number(expense.amount).toLocaleString("zh-TW")}
                            </p>
                          </div>

                          {/* 第二行：付款人 + 類別 + 時間 */}
                          <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {(() => {
                                const avatarData = parseAvatarString(expense.payer?.user?.image)
                                if (avatarData) {
                                  const Icon = getAvatarIcon(avatarData.iconId)
                                  return (
                                    <div
                                      className="h-4 w-4 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                                    >
                                      <Icon className="h-2 w-2 text-white" />
                                    </div>
                                  )
                                }
                                const hasExternalImage = expense.payer?.user?.image && !expense.payer.user.image.startsWith("avatar:")
                                return (
                                  <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                    {hasExternalImage ? (
                                      <Image
                                        src={expense.payer!.user!.image!}
                                        alt={expense.payer!.displayName}
                                        width={16}
                                        height={16}
                                        className="rounded-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-2 w-2 text-slate-500" />
                                    )}
                                  </div>
                                )
                              })()}
                              <span>{expense.payer.displayName}</span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            {categoryInfo && (
                              <>
                                <span>{categoryInfo.label}</span>
                                <span className="text-slate-300 dark:text-slate-600">·</span>
                              </>
                            )}
                            <span>{formatDate(expense.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 底部：分擔者區域 */}
                    {expense.participants.length > 0 && (
                      <div className="mx-4 mb-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {expense.participants.slice(0, 5).map((p) => {
                              const avatarData = parseAvatarString(p.member.user?.image)
                              if (avatarData) {
                                const Icon = getAvatarIcon(avatarData.iconId)
                                return (
                                  <div
                                    key={p.id}
                                    className="h-6 w-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900"
                                    style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                                    title={`${p.member.displayName}: $${p.shareAmount}`}
                                  >
                                    <Icon className="h-3 w-3 text-white" />
                                  </div>
                                )
                              }
                              const hasExternalImage = p.member.user?.image && !p.member.user.image.startsWith("avatar:")
                              return (
                                <div
                                  key={p.id}
                                  className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-900"
                                  title={`${p.member.displayName}: $${p.shareAmount}`}
                                >
                                  {hasExternalImage ? (
                                    <Image
                                      src={p.member.user!.image!}
                                      alt={p.member.displayName}
                                      width={24}
                                      height={24}
                                      className="rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-300">
                                      {p.member.displayName[0]?.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                            {expense.participants.length > 5 && (
                              <div className="h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-slate-900">
                                +{expense.participants.length - 5}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {expense.participants.length} 人分擔
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
        {expenses.length > 0 && !selectMode && (
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

    </AppLayout>
  )
}


