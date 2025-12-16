"use client"

import { use, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { TrendAreaChart } from "@/components/dashboard/trend-area-chart"
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart"
import { BalanceBarChart } from "@/components/dashboard/balance-bar-chart"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import {
  Plus,
  Share2,
  Users,
  Calculator,
  Receipt,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  ChevronRight,
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
  shareAmount: number
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
      return "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400"
    case "transport":
      return "bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
    case "accommodation":
      return "bg-violet-50 text-violet-500 dark:bg-violet-950 dark:text-violet-400"
    case "entertainment":
      return "bg-pink-50 text-pink-500 dark:bg-pink-950 dark:text-pink-400"
    case "shopping":
      return "bg-amber-50 text-amber-500 dark:bg-amber-950 dark:text-amber-400"
    default:
      return "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
  }
}

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const authFetch = useAuthFetch()
  const { user } = useLiff()

  useEffect(() => {
    if (id) {
      fetchProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchProject() {
    try {
      const res = await authFetch(`/api/projects/${id}`)
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

  // 計算用戶的餘額
  const userBalance = useMemo(() => {
    if (!project || !user) return 0

    const membership = project.members.find((m) => m.user?.id === user.id)
    if (!membership) return 0

    let paid = 0
    let owed = 0

    project.expenses.forEach((expense) => {
      if (expense.payer.id === membership.id) {
        paid += Number(expense.amount)
      }
      const participant = expense.participants.find((p) => p.memberId === membership.id)
      if (participant) {
        owed += Number(participant.shareAmount)
      }
    })

    return paid - owed
  }, [project, user])

  // 按日期分組的支出趨勢數據
  const trendData = useMemo(() => {
    if (!project) return []

    const dateMap = new Map<string, number>()
    project.expenses.forEach((expense) => {
      const date = new Date(expense.createdAt).toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
      })
      dateMap.set(date, (dateMap.get(date) || 0) + Number(expense.amount))
    })

    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7)
  }, [project])

  // 類別統計數據
  const categoryData = useMemo(() => {
    if (!project) return []

    const categoryMap = new Map<string, number>()
    project.expenses.forEach((expense) => {
      const cat = expense.category || "other"
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(expense.amount))
    })

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value, color: "" }))
      .sort((a, b) => b.value - a.value)
  }, [project])

  // 成員付款比較數據
  const memberBalanceData = useMemo(() => {
    if (!project) return []

    return project.members.map((member) => {
      let paid = 0
      let share = 0

      project.expenses.forEach((expense) => {
        if (expense.payer.id === member.id) {
          paid += Number(expense.amount)
        }
        const participant = expense.participants.find((p) => p.memberId === member.id)
        if (participant) {
          share += Number(participant.shareAmount)
        }
      })

      return {
        name: member.displayName.slice(0, 4),
        paid,
        share,
        balance: paid - share,
      }
    })
  }, [project])

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

  return (
    <AppLayout title={project.name} showBack>
      <div className="pb-24 space-y-4 px-4">
        {/* 統計卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="總支出" value={`$${totalAmount.toLocaleString("zh-TW")}`} />
          <StatCard
            title="平均每人"
            value={`$${Math.round(perPerson).toLocaleString("zh-TW")}`}
          />
        </div>

        {/* 你的餘額 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                你的餘額
              </p>
              <p
                className={`text-2xl font-bold ${
                  userBalance >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {userBalance >= 0 ? "+" : ""}${Math.abs(userBalance).toLocaleString("zh-TW")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {userBalance > 0
                  ? "有人需要付你錢"
                  : userBalance < 0
                  ? "你需要付給別人"
                  : "已結清"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-2xl">
              {userBalance >= 0 ? "💰" : "💸"}
            </div>
          </div>
        </div>

        {/* 消費趨勢圖 */}
        {trendData.length > 0 && <TrendAreaChart data={trendData} />}

        {/* 分類統計 */}
        {categoryData.length > 0 && <CategoryPieChart data={categoryData} />}

        {/* 成員付款比較 */}
        {memberBalanceData.length > 0 && <BalanceBarChart data={memberBalanceData} />}

        {/* 快速操作 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/projects/${id}/settle`}>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">結算</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">查看誰欠誰</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>

          <Link href={`/projects/${id}/members`}>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">成員</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{project.members.length} 人</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>

        {/* 邀請按鈕 */}
        <button
          onClick={handleShare}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          邀請朋友加入 · {project.shareCode}
        </button>

        {/* 最近支出 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">最近支出</h2>
            <Link
              href={`/projects/${id}/expenses`}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              查看全部
            </Link>
          </div>

          {project.expenses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Receipt className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">還沒有支出記錄</p>
              <Link href={`/projects/${id}/expenses/new`}>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  新增第一筆
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {project.expenses.slice(0, 5).map((expense) => (
                <Link
                  key={expense.id}
                  href={`/projects/${id}/expenses`}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${getCategoryColor(expense.category)}`}
                  >
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {expense.description || "支出"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {expense.payer?.user?.name || expense.payer?.displayName || "未知"} 付款 ·{" "}
                      {expense.participants?.length || 0} 人分攤
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    ${Number(expense.amount).toLocaleString("zh-TW")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 浮動新增按鈕 */}
      <Link href={`/projects/${id}/expenses/new`} className="fixed bottom-24 right-4 z-50">
        <Button size="lg" className="h-14 px-6 rounded-full shadow-lg gap-2">
          <Plus className="h-5 w-5" />
          新增支出
        </Button>
      </Link>
    </AppLayout>
  )
}
