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
import { Plus, Trash2, User } from "lucide-react"

interface ExpenseParticipant {
  id: string
  shareAmount: number
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  createdAt: string
  payer: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  participants: ExpenseParticipant[]
}

export default function ExpensesList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchExpenses() {
    try {
      const res = await fetch(`/api/projects/${id}/expenses`)
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
      const res = await fetch(`/api/projects/${id}/expenses/${deleteId}`, {
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
    <AppLayout title="支出列表" showBack>
      <div className="space-y-4 pb-20">
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
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {expense.description || "無描述"}
                        </span>
                        {getCategoryLabel(expense.category) && (
                          <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {getCategoryLabel(expense.category)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDate(expense.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {expense.payer?.image ? (
                            <Image
                              src={expense.payer.image}
                              alt={expense.payer?.name || ""}
                              width={24}
                              height={24}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {expense.payer?.name || expense.payer?.email?.split("@")[0] || "未知"} 代付
                        </span>
                      </div>
                      {expense.participants.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">分擔者：</span>
                          <div className="flex -space-x-1">
                            {expense.participants.slice(0, 5).map((p) => (
                              <div
                                key={p.id}
                                className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-background"
                                title={`${p.user.name || p.user.email}: $${p.shareAmount}`}
                              >
                                {p.user.image ? (
                                  <Image
                                    src={p.user.image}
                                    alt={p.user.name || ""}
                                    width={20}
                                    height={20}
                                    className="rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[10px]">
                                    {(p.user.name || p.user.email)?.[0]?.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                            {expense.participants.length > 5 && (
                              <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] border-2 border-background">
                                +{expense.participants.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">
                        -${Number(expense.amount).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 新增按鈕 */}
        {expenses.length > 0 && (
          <Link href={`/projects/${id}/expenses/new`}>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              新增支出
            </Button>
          </Link>
        )}
      </div>

      {/* 刪除確認對話框 */}
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
    </AppLayout>
  )
}


