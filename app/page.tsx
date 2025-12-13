"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, FolderOpen, History, Plus, ArrowRight } from "lucide-react"

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
  }
}

interface Project {
  id: string
  name: string
  expenses: Expense[]
  _count: {
    expenses: number
    members: number
  }
}

export default function Home() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "用戶"

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("獲取專案錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  // 計算總支出
  const totalExpenses = projects.reduce((sum, project) => {
    return sum + project.expenses.reduce((pSum, expense) => pSum + Number(expense.amount), 0)
  }, 0)

  // 獲取最近支出（取所有專案的支出，按時間排序取前5筆）
  const recentExpenses = projects
    .flatMap((project) =>
      project.expenses.map((expense) => ({
        ...expense,
        projectId: project.id,
        projectName: project.name,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

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

  if (loading) {
    return (
      <AppLayout title="Wander Wallet">
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Wander Wallet">
      <div className="space-y-6 pb-20">
        {/* 歡迎區塊 */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold mb-2">
            歡迎回來，{userName}！
          </h2>
          <p className="text-muted-foreground">管理你的旅行預算</p>
        </div>

        {/* 總覽卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              總支出
            </CardTitle>
            <CardDescription>所有專案的累計支出</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalExpenses.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {projects.length} 個專案 · {projects.reduce((sum, p) => sum + p._count.expenses, 0)} 筆支出
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/projects/new">
            <Button className="w-full h-20 flex-col gap-2">
              <Plus className="h-6 w-6" />
              <span>新建專案</span>
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline" className="w-full h-20 flex-col gap-2">
              <FolderOpen className="h-6 w-6" />
              <span>查看專案</span>
            </Button>
          </Link>
        </div>

        {/* 最近記錄 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              最近記錄
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">尚無支出記錄</p>
                <Link href="/projects">
                  <Button variant="outline" size="sm">
                    前往專案新增支出
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/projects/${expense.projectId}/expenses`}
                    className="block"
                  >
                    <div className="flex justify-between items-center p-2 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {expense.description || "無描述"}
                          </span>
                          {getCategoryLabel(expense.category) && (
                            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded flex-shrink-0">
                              {getCategoryLabel(expense.category)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {expense.projectName} · {formatDate(expense.createdAt)}
                        </div>
                      </div>
                      <div className="text-red-600 font-medium ml-2">
                        -${Number(expense.amount).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </Link>
                ))}
                {projects.reduce((sum, p) => sum + p._count.expenses, 0) > 5 && (
                  <div className="pt-2 text-center">
                    <Link href="/projects">
                      <Button variant="ghost" size="sm">
                        查看更多
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
