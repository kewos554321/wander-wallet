"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Share2,
  User,
  Calculator,
  Users,
  Receipt,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"

interface ProjectMember {
  id: string
  role: string
  displayName: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

interface ExpenseParticipant {
  id: string
  memberId: string
}

interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  createdAt: string
  payer: {
    id: string
    displayName: string
    user: {
      name: string | null
      email: string
    } | null
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

// 類別顏色 - 更柔和的配色
function getCategoryColor(category: string | null) {
  switch (category) {
    case "food":
      return "bg-orange-50 text-orange-500"
    case "transport":
      return "bg-blue-50 text-blue-500"
    case "accommodation":
      return "bg-violet-50 text-violet-500"
    case "entertainment":
      return "bg-pink-50 text-pink-500"
    case "shopping":
      return "bg-amber-50 text-amber-500"
    default:
      return "bg-slate-50 text-slate-500"
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
  const perPerson = project.members.length > 0 ? totalAmount / project.members.length : 0
  const groupedExpenses = groupExpensesByDate(project.expenses)

  return (
    <AppLayout title={project.name} showBack>
      <div className="pb-24 space-y-6">
        {/* 總覽卡片 - Clean Minimal 風格 */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">總支出</p>
              <p className="text-4xl font-semibold tracking-tight">
                ${totalAmount.toLocaleString("zh-TW")}
              </p>
              <p className="text-sm text-muted-foreground">
                平均每人 ${Math.round(perPerson).toLocaleString("zh-TW")}
              </p>
            </div>

            {/* 成員頭像列 */}
            <div className="flex justify-center mt-4 -space-x-2">
              {project.members.slice(0, 5).map((member) => {
                const avatarData = parseAvatarString(member.user?.image)
                const isCustomAvatar = avatarData !== null
                const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")

                if (isCustomAvatar) {
                  const Icon = getAvatarIcon(avatarData.iconId)
                  const color = getAvatarColor(avatarData.colorId)
                  return (
                    <div
                      key={member.id}
                      className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ backgroundColor: color }}
                      title={member.displayName}
                    >
                      <Icon className="size-4 text-white" />
                    </div>
                  )
                }

                return (
                  <div
                    key={member.id}
                    className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden"
                    title={member.displayName}
                  >
                    {hasExternalImage ? (
                      <Image
                        src={member.user!.image!}
                        alt=""
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-slate-500">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )
              })}
              {project.members.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-slate-500">+{project.members.length - 5}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 - 橫向卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/projects/${id}/settle`}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">結算</p>
                  <p className="text-xs text-muted-foreground">查看誰欠誰</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/projects/${id}/members`}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">成員</p>
                  <p className="text-xs text-muted-foreground">{project.members.length} 人</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 邀請按鈕 */}
        <button
          onClick={handleShare}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-200 text-sm text-muted-foreground hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          邀請朋友加入 · {project.shareCode}
        </button>

        {/* 最近支出 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">最近支出</h2>
            <Link
              href={`/projects/${id}/expenses`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              查看全部
            </Link>
          </div>

          {project.expenses.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Receipt className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-muted-foreground mb-4">還沒有支出記錄</p>
                <Link href={`/projects/${id}/expenses/new`}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    新增第一筆
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {Object.entries(groupedExpenses).slice(0, 3).map(([date, expenses]) => (
                  expenses.slice(0, 3).map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/projects/${id}/expenses`}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                    >
                      {/* 類別圖標 */}
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${getCategoryColor(expense.category)}`}>
                        {getCategoryIcon(expense.category)}
                      </div>
                      {/* 描述和付款人 */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {expense.description || "支出"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {expense.payer?.user?.name || expense.payer?.displayName || "未知"} 付款 · {expense.participants?.length || 0} 人分攤
                        </p>
                      </div>
                      {/* 金額 */}
                      <p className="font-semibold tabular-nums">
                        ${Number(expense.amount).toLocaleString("zh-TW")}
                      </p>
                    </Link>
                  ))
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 浮動新增按鈕 */}
      <Link
        href={`/projects/${id}/expenses/new`}
        className="fixed bottom-24 right-4 z-50"
      >
        <Button size="lg" className="h-14 px-6 rounded-full shadow-lg gap-2">
          <Plus className="h-5 w-5" />
          新增支出
        </Button>
      </Link>
    </AppLayout>
  )
}
