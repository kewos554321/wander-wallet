"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Share2,
  User,
  Calculator,
  Users,
  PieChart,
  Receipt,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal
} from "lucide-react"

interface ProjectMember {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface ExpenseParticipant {
  id: string
  shareAmount: number
  user: {
    id: string
    name: string | null
    email: string
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

interface Project {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  shareCode: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
  expenses: Expense[]
}

// 根據日期分組支出
function groupExpensesByDate(expenses: Expense[]): Record<string, Expense[]> {
  const groups: Record<string, Expense[]> = {}

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  sorted.forEach((expense) => {
    const date = new Date(expense.createdAt).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(expense)
  })

  return groups
}

// 類別圖標
function getCategoryIcon(category: string | null) {
  switch (category) {
    case "food":
      return <Utensils className="h-4 w-4" />
    case "transport":
      return <Car className="h-4 w-4" />
    case "accommodation":
      return <Home className="h-4 w-4" />
    case "entertainment":
      return <Gamepad2 className="h-4 w-4" />
    case "shopping":
      return <ShoppingBag className="h-4 w-4" />
    default:
      return <Receipt className="h-4 w-4" />
  }
}

// 類別顏色
function getCategoryColor(category: string | null) {
  switch (category) {
    case "food":
      return "bg-orange-100 text-orange-600"
    case "transport":
      return "bg-blue-100 text-blue-600"
    case "accommodation":
      return "bg-purple-100 text-purple-600"
    case "entertainment":
      return "bg-pink-100 text-pink-600"
    case "shopping":
      return "bg-yellow-100 text-yellow-600"
    default:
      return "bg-gray-100 text-gray-600"
  }
}

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/projects")
          return
        }
        return
      }
      const data = await res.json()
      setProject(data)
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!project) return
    const shareUrl = `${window.location.origin}/projects/join?code=${project.shareCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `加入 ${project.name}`,
          text: `分享碼：${project.shareCode}`,
          url: shareUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert(`已複製分享連結`)
    }
  }

  if (loading) {
    return (
      <AppLayout title="載入中..." showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="專案不存在" showBack>
        <div className="text-center py-8 text-muted-foreground">專案不存在或無權限訪問</div>
      </AppLayout>
    )
  }

  const totalAmount = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const groupedExpenses = groupExpensesByDate(project.expenses)

  return (
    <AppLayout title={project.name} showBack>
      <div className="pb-20">
        {/* 頂部總覽 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 -mx-4 px-4 py-5 text-white">
          <div className="text-center">
            <div className="text-sm opacity-80">總支出</div>
            <div className="text-3xl font-bold mt-1">
              ${totalAmount.toLocaleString("zh-TW")}
            </div>
            {project.description && (
              <div className="text-sm opacity-80 mt-2">{project.description}</div>
            )}
          </div>
        </div>

        {/* 快速操作列 */}
        <div className="flex gap-2 overflow-x-auto py-4 -mx-4 px-4 border-b">
          <Link href={`/projects/${id}/expenses`}>
            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs">{project.expenses.length} 筆支出</span>
            </button>
          </Link>
          <Link href={`/projects/${id}/settle`}>
            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs">結餘</span>
            </button>
          </Link>
          <Link href={`/projects/${id}/members`}>
            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-xs">{project.members.length} 位成員</span>
            </button>
          </Link>
          <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-secondary transition-colors opacity-50">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <PieChart className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs">統計</span>
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-xs">邀請</span>
          </button>
        </div>

        {/* 支出列表（按日期分組）*/}
        <div className="mt-2">
          {project.expenses.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-4">還沒有支出記錄</p>
              <Link href={`/projects/${id}/expenses/new`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  新增支出
                </Button>
              </Link>
            </div>
          ) : (
            Object.entries(groupedExpenses).map(([date, expenses]) => (
              <div key={date}>
                {/* 日期標題 */}
                <div className="bg-secondary/50 px-4 py-2 text-sm text-muted-foreground font-medium sticky top-0">
                  {date}
                </div>
                {/* 當日支出 */}
                <div className="divide-y">
                  {expenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/projects/${id}/expenses`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      {/* 類別圖標 */}
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getCategoryColor(expense.category)}`}>
                        {getCategoryIcon(expense.category)}
                      </div>
                      {/* 描述和付款人 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {expense.description || "支出"}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {expense.payer?.image ? (
                            <Image
                              src={expense.payer.image}
                              alt=""
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span>{expense.payer?.name || expense.payer?.email?.split("@")[0] || "未知"} 先付</span>
                        </div>
                      </div>
                      {/* 金額 */}
                      <div className="text-right">
                        <div className="font-semibold">
                          ${Number(expense.amount).toLocaleString("zh-TW")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {expense.participants.length} 人分
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 浮動新增按鈕 */}
      <Link
        href={`/projects/${id}/expenses/new`}
        className="fixed bottom-20 right-4 z-50"
      >
        <Button className="h-12 w-12 rounded-full shadow-lg">
          <Plus className="h-5 w-5" />
        </Button>
      </Link>
    </AppLayout>
  )
}
