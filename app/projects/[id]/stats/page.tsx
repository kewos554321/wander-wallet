"use client"

import { use, useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Receipt, TrendingUp, Crown } from "lucide-react"

// 圖表 loading skeleton
function ChartSkeleton({ height = 160 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
      <div
        className="bg-slate-100 dark:bg-slate-800 rounded animate-pulse"
        style={{ height }}
      />
    </div>
  )
}

// 動態載入圖表元件（減少首次載入 bundle 約 270KB）
const TrendAreaChart = dynamic(
  () => import("@/components/dashboard/trend-area-chart").then(mod => mod.TrendAreaChart),
  { loading: () => <ChartSkeleton height={140} />, ssr: false }
)
const CategoryPieChart = dynamic(
  () => import("@/components/dashboard/category-pie-chart").then(mod => mod.CategoryPieChart),
  { loading: () => <ChartSkeleton height={100} />, ssr: false }
)
const BalanceBarChart = dynamic(
  () => import("@/components/dashboard/balance-bar-chart").then(mod => mod.BalanceBarChart),
  { loading: () => <ChartSkeleton height={160} />, ssr: false }
)

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
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
  expenses: Expense[]
}

export default function ProjectStats({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const authFetch = useAuthFetch()

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

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="統計" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="統計" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">專案不存在或無權限訪問</div>
      </AppLayout>
    )
  }

  const totalAmount = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const perPerson = project.members.length > 0 ? totalAmount / project.members.length : 0
  const hasData = project.expenses.length > 0

  // 計算每日平均（根據有支出的天數）
  const uniqueDays = new Set(
    project.expenses.map((e) => new Date(e.createdAt).toDateString())
  ).size
  const dailyAverage = uniqueDays > 0 ? totalAmount / uniqueDays : 0

  // 找出最高單筆支出
  const highestExpense = project.expenses.length > 0
    ? project.expenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max)
    : null

  return (
    <AppLayout title="統計" showBack backHref={backHref}>
      <div className="pb-8 space-y-4 px-4">
        {/* 總覽卡片 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">總支出</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              ${totalAmount.toLocaleString("zh-TW")}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">平均每人</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              ${Math.round(perPerson).toLocaleString("zh-TW")}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">每日平均</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              ${Math.round(dailyAverage).toLocaleString("zh-TW")}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">支出筆數</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {project.expenses.length}
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">還沒有支出記錄</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              新增支出後這裡會顯示統計圖表
            </p>
          </div>
        ) : (
          <>
            {/* 消費趨勢圖 */}
            {trendData.length > 0 && <TrendAreaChart data={trendData} />}

            {/* 分類統計 */}
            {categoryData.length > 0 && <CategoryPieChart data={categoryData} />}

            {/* 成員付款比較 */}
            {memberBalanceData.length > 0 && <BalanceBarChart data={memberBalanceData} />}

            {/* 最高單筆支出 */}
            {highestExpense && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    最高單筆支出
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {highestExpense.description || "支出"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {highestExpense.payer?.user?.name || highestExpense.payer?.displayName || "未知"} · {new Date(highestExpense.createdAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-amber-500 ml-4">
                    ${Number(highestExpense.amount).toLocaleString("zh-TW")}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
