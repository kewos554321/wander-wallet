"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pencil, Plus, Trash2, User } from "lucide-react"
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

  function getCategoryLabel(category: string | null) {
    const categoryMap: Record<string, string> = {
      food: "餐飲",
      transport: "交通",
      accommodation: "住宿",
      entertainment: "娛樂",
      shopping: "購物",
      other: "其他",
    }
    return category ? categoryMap[category] || category : null
  }

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  if (loading) {
    return (
      <AppLayout title="支出列表" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title={selectMode ? `已選 ${selectedIds.size} 筆` : "支出列表"}
      showBack={!selectMode}
      rightAction={
        expenses.length > 0 && !selectMode ? (
          <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>
            選擇
          </Button>
        ) : selectMode ? (
          <Button variant="ghost" size="sm" onClick={exitSelectMode}>
            取消
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 pb-20">
        {/* 多選模式工具列 */}
        {selectMode && (
          <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedIds.size === expenses.length && expenses.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm">全選</span>
            </label>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setShowBatchDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              刪除 {selectedIds.size > 0 ? `${selectedIds.size} 筆` : ""}
            </Button>
          </div>
        )}

        {/* 總計 */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
          <span className="text-sm text-muted-foreground">總支出</span>
          <span className="text-xl font-bold">
            ${totalAmount.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* 支出列表 */}
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">尚無支出記錄</p>
            <Link href={`/projects/${id}/expenses/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新增第一筆支出
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const isSelected = selectedIds.has(expense.id)
              const CardWrapper = selectMode ? "div" : Link
              const cardProps = selectMode
                ? {
                    onClick: () => toggleSelect(expense.id),
                  }
                : {
                    href: `/projects/${id}/expenses/${expense.id}/edit`,
                  }

              return (
                <CardWrapper key={expense.id} {...(cardProps as Record<string, unknown>)}>
                  <Card className={`transition-colors cursor-pointer ${
                    selectMode
                      ? isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-accent/50"
                      : "hover:bg-accent/50"
                  }`}>
                    <CardContent className="px-3 py-2.5">
                      {/* 第一行：Checkbox/金額 + 類別 + 操作按鈕 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectMode && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(expense.id)}
                              className="h-5 w-5"
                            />
                          )}
                          <span className="text-lg font-bold text-red-600">
                            -${Number(expense.amount).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                          {getCategoryLabel(expense.category) && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              {getCategoryLabel(expense.category)}
                            </span>
                          )}
                        </div>
                        {!selectMode && (
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDeleteId(expense.id)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                    {/* 第二行：描述 + 時間 */}
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm font-medium text-foreground truncate flex-1">
                        {expense.description || "無描述"}
                      </p>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {formatDate(expense.createdAt)}
                      </span>
                    </div>

                    {/* 第三行：付款人 + 分擔者 */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
                      {/* 付款人 */}
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const avatarData = parseAvatarString(expense.payer?.user?.image)
                          if (avatarData) {
                            const Icon = getAvatarIcon(avatarData.iconId)
                            return (
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                              >
                                <Icon className="h-2.5 w-2.5 text-white" />
                              </div>
                            )
                          }
                          const hasExternalImage = expense.payer?.user?.image && !expense.payer.user.image.startsWith("avatar:")
                          return (
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={expense.payer!.user!.image!}
                                  alt={expense.payer!.displayName}
                                  width={20}
                                  height={20}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-2.5 w-2.5 text-primary" />
                              )}
                            </div>
                          )
                        })()}
                        <span className="text-xs text-muted-foreground">
                          {expense.payer.displayName} 代付
                          {!expense.payer.userId && " (未認領)"}
                        </span>
                      </div>

                      {/* 分擔者 */}
                      {expense.participants.length > 0 && (
                        <div className="flex items-center gap-1 pl-2 border-l border-border/40">
                          <div className="flex -space-x-1">
                            {expense.participants.slice(0, 3).map((p) => {
                              const avatarData = parseAvatarString(p.member.user?.image)
                              if (avatarData) {
                                const Icon = getAvatarIcon(avatarData.iconId)
                                return (
                                  <div
                                    key={p.id}
                                    className="h-4 w-4 rounded-full flex items-center justify-center border border-background"
                                    style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                                    title={`${p.member.displayName}: $${p.shareAmount}`}
                                  >
                                    <Icon className="h-2 w-2 text-white" />
                                  </div>
                                )
                              }
                              const hasExternalImage = p.member.user?.image && !p.member.user.image.startsWith("avatar:")
                              return (
                                <div
                                  key={p.id}
                                  className="h-4 w-4 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-background"
                                  title={`${p.member.displayName}: $${p.shareAmount}`}
                                >
                                  {hasExternalImage ? (
                                    <Image
                                      src={p.member.user!.image!}
                                      alt={p.member.displayName}
                                      width={16}
                                      height={16}
                                      className="rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[8px] font-medium">
                                      {p.member.displayName[0]?.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                            {expense.participants.length > 3 && (
                              <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-medium border border-background">
                                +{expense.participants.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {expense.participants.length}人
                          </span>
                        </div>
                      )}
                    </div>
                    </CardContent>
                  </Card>
                </CardWrapper>
              )
            })}
          </div>
        )}

        {/* 新增按鈕 */}
        {expenses.length > 0 && !selectMode && (
          <Link href={`/projects/${id}/expenses/new`}>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              新增支出
            </Button>
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


