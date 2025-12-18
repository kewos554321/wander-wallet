"use client"

import { use, useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Receipt, Crown, Info, ArrowRight, TrendingUp, Wallet } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

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
const CategoryTrendChart = dynamic(
  () => import("@/components/dashboard/category-trend-chart").then(mod => mod.CategoryTrendChart),
  { loading: () => <ChartSkeleton height={180} />, ssr: false }
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
  expenseDate: string
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

    const dateMap = new Map<string, { amount: number; timestamp: number }>()
    project.expenses.forEach((expense) => {
      // 使用 expenseDate（實際消費日期）而非 createdAt（記錄建立時間）
      const expenseDate = new Date(expense.expenseDate)
      const dateKey = expenseDate.toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
      })
      const existing = dateMap.get(dateKey)
      dateMap.set(dateKey, {
        amount: (existing?.amount || 0) + Number(expense.amount),
        timestamp: expenseDate.getTime(),
      })
    })

    return Array.from(dateMap.entries())
      .map(([date, { amount, timestamp }]) => ({ date, amount, timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7)
      .map(({ date, amount }) => ({ date, amount }))
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
        id: member.id,
        name: member.displayName.slice(0, 8),
        fullName: member.displayName,
        paid,
        share,
        balance: paid - share,
      }
    })
  }, [project])

  // S8: 付款排行榜（誰付最多）
  const paymentRanking = useMemo(() => {
    return [...memberBalanceData]
      .sort((a, b) => b.paid - a.paid)
      .slice(0, 3)
  }, [memberBalanceData])

  // S9: 消費排行榜（誰花最多）
  const spendingRanking = useMemo(() => {
    return [...memberBalanceData]
      .sort((a, b) => b.share - a.share)
      .slice(0, 3)
  }, [memberBalanceData])

  // S7: 結算預覽（誰欠誰多少）
  const settlements = useMemo(() => {
    if (!project || memberBalanceData.length === 0) return []

    // 複製 balance 數據
    const balances = memberBalanceData.map(m => ({
      id: m.id,
      name: m.fullName,
      balance: m.balance,
    }))

    const result: { from: string; to: string; amount: number }[] = []

    // 貪婪演算法：讓最大債務人付給最大債權人
    while (true) {
      // 找最大債務人（balance 最小，即欠最多）
      const debtor = balances.reduce((min, curr) =>
        curr.balance < min.balance ? curr : min
      )
      // 找最大債權人（balance 最大，即被欠最多）
      const creditor = balances.reduce((max, curr) =>
        curr.balance > max.balance ? curr : max
      )

      // 如果都接近 0 就結束
      if (Math.abs(debtor.balance) < 1 || Math.abs(creditor.balance) < 1) break

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance)
      if (amount < 1) break

      result.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount),
      })

      debtor.balance += amount
      creditor.balance -= amount
    }

    return result.slice(0, 5) // 最多顯示 5 筆
  }, [project, memberBalanceData])

  // S11: 類別趨勢數據（按日期分組的各類別支出）
  const { categoryTrendData, trendCategories } = useMemo(() => {
    if (!project || project.expenses.length === 0) {
      return { categoryTrendData: [], trendCategories: [] }
    }

    // 收集所有使用的類別
    const usedCategories = new Set<string>()
    const dateMap = new Map<string, { timestamp: number; categories: Record<string, number> }>()

    project.expenses.forEach((expense) => {
      const expenseDate = new Date(expense.expenseDate)
      const dateKey = expenseDate.toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
      })
      const cat = expense.category || "other"
      usedCategories.add(cat)

      const existing = dateMap.get(dateKey) || { timestamp: expenseDate.getTime(), categories: {} }
      existing.categories[cat] = (existing.categories[cat] || 0) + Number(expense.amount)
      dateMap.set(dateKey, existing)
    })

    const categories = Array.from(usedCategories)
    const data = Array.from(dateMap.entries())
      .map(([date, { timestamp, categories: cats }]) => ({
        date,
        timestamp,
        ...categories.reduce((acc, cat) => ({ ...acc, [cat]: cats[cat] || 0 }), {}),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7)
      .map(({ timestamp, ...rest }) => rest)

    return { categoryTrendData: data, trendCategories: categories }
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

  // 計算每日平均（根據有支出的天數，使用 expenseDate）
  const uniqueDays = new Set(
    project.expenses.map((e) => new Date(e.expenseDate).toDateString())
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              總覽
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={4} className="w-auto p-2 text-sm">
                統計數據依據「消費日期」計算
              </PopoverContent>
            </Popover>
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">總支出</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              ${totalAmount.toLocaleString("zh-TW")}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">筆數</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.expenses.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">每人</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${Math.round(perPerson).toLocaleString("zh-TW")}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">日均</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${Math.round(dailyAverage).toLocaleString("zh-TW")}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">單筆</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">${Math.round(project.expenses.length > 0 ? totalAmount / project.expenses.length : 0).toLocaleString("zh-TW")}</p>
            </div>
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

            {/* S11: 類別趨勢 */}
            {categoryTrendData.length >= 2 && (
              <CategoryTrendChart data={categoryTrendData} categories={trendCategories} />
            )}

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
                      {highestExpense.payer?.user?.name || highestExpense.payer?.displayName || "未知"} · {new Date(highestExpense.expenseDate).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-amber-500 ml-4">
                    ${Number(highestExpense.amount).toLocaleString("zh-TW")}
                  </p>
                </div>
              </div>
            )}

            {/* S8 & S9: 付款/消費排行榜 */}
            {memberBalanceData.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    排行榜
                  </p>
                </div>
                <div className="space-y-4">
                  {/* 付款王 */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">付款王</span>
                    </div>
                    <div className="space-y-1.5">
                      {paymentRanking.map((member, idx) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 text-xs font-bold ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : "text-amber-700"}`}>
                              #{idx + 1}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {member.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            ${member.paid.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* 消費王 */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">消費王</span>
                    </div>
                    <div className="space-y-1.5">
                      {spendingRanking.map((member, idx) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 text-xs font-bold ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : "text-amber-700"}`}>
                              #{idx + 1}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {member.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            ${member.share.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* S7: 結算預覽 */}
            {settlements.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    結算預覽
                  </p>
                  <button
                    onClick={() => router.push(`/projects/${id}/settle`)}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    查看詳情
                  </button>
                </div>
                <div className="space-y-2">
                  {settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {s.from}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {s.to}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-red-500">
                        ${s.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
