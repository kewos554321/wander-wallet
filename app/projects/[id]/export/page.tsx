"use client"

import { use, useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Button } from "@/components/ui/button"
import { ExportOptionsForm } from "@/components/export/export-options-form"
import { Download, AlertCircle, Loader2 } from "lucide-react"
import { generateCSV, downloadCSV } from "@/lib/export/csv-generator"
import { getCategoryLabel } from "@/lib/constants/expenses"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type {
  ExportFormat,
  ExportContentOptions,
  ExportFilterOptions,
  ExportData,
  ExportOptions,
  ExpenseExportData,
  SettlementExportData,
  StatisticsExportData,
  CategoryBreakdownData,
  MemberBalanceData,
} from "@/lib/export/types"
import { defaultExportOptions } from "@/lib/export/types"

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
  currency: string
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
  currency: string
  startDate: string | null
  endDate: string | null
  customRates: Record<string, number> | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
  expenses: Expense[]
}

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null)

  // 匯出選項狀態
  const [format, setFormat] = useState<ExportFormat>(defaultExportOptions.format)
  const [content, setContent] = useState<ExportContentOptions>(defaultExportOptions.content)
  const [filters, setFilters] = useState<ExportFilterOptions>(defaultExportOptions.filters)

  useEffect(() => {
    if (id) {
      fetchProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 當有多種幣別時，獲取匯率
  useEffect(() => {
    if (project?.expenses) {
      const currencies = new Set(project.expenses.map(e => e.currency))
      if (currencies.size > 1) {
        fetchExchangeRates()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.expenses])

  async function fetchExchangeRates() {
    try {
      const res = await authFetch("/api/exchange-rates")
      if (res.ok) {
        const data = await res.json()
        setExchangeRates(data.rates)
      }
    } catch (error) {
      console.error("獲取匯率錯誤:", error)
    }
  }

  // 轉換單一金額到專案幣別（優先使用自訂匯率）
  const convertToProjectCurrency = useCallback((amount: number, fromCurrency: string): number => {
    if (!project) return amount
    const projectCurrency = project.currency || DEFAULT_CURRENCY
    if (fromCurrency === projectCurrency) return amount

    // 優先使用自訂匯率
    if (project.customRates && project.customRates[fromCurrency]) {
      return Math.round(amount * project.customRates[fromCurrency] * 100) / 100
    }

    // 無即時匯率時不轉換
    if (!exchangeRates) return amount

    // 透過 USD 作為中介轉換
    const fromRate = exchangeRates[fromCurrency] || 1
    const toRate = exchangeRates[projectCurrency] || 1
    return Math.round(amount * (toRate / fromRate) * 100) / 100
  }, [project, exchangeRates])

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

  // 篩選後的支出
  const filteredExpenses = useMemo(() => {
    if (!project) return []

    return project.expenses.filter((expense) => {
      // 日期篩選
      if (filters.dateRange?.start || filters.dateRange?.end) {
        const expenseDate = new Date(expense.expenseDate)
        if (filters.dateRange.start && expenseDate < filters.dateRange.start) {
          return false
        }
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end)
          endDate.setHours(23, 59, 59, 999)
          if (expenseDate > endDate) {
            return false
          }
        }
      }

      // 分類篩選
      if (filters.categories && filters.categories.length > 0) {
        const category = expense.category || "other"
        if (!filters.categories.includes(category)) {
          return false
        }
      }

      return true
    })
  }, [project, filters])

  // 建立成員 ID 到名稱的映射
  const memberNameMap = useMemo(() => {
    if (!project) return new Map<string, string>()
    return new Map(project.members.map((m) => [m.id, m.displayName]))
  }, [project])

  // 計算成員餘額（轉換為專案幣別）
  const memberBalances = useMemo((): MemberBalanceData[] => {
    if (!project) return []

    return project.members.map((member) => {
      let paid = 0
      let share = 0

      filteredExpenses.forEach((expense) => {
        const convertedAmount = convertToProjectCurrency(Number(expense.amount), expense.currency)
        if (expense.payer.id === member.id) {
          paid += convertedAmount
        }
        const participant = expense.participants.find((p) => p.memberId === member.id)
        if (participant) {
          // 按比例轉換分擔金額
          const shareRatio = Number(participant.shareAmount) / Number(expense.amount)
          share += convertedAmount * shareRatio
        }
      })

      return {
        name: member.displayName,
        paid,
        share,
        balance: paid - share,
      }
    })
  }, [project, filteredExpenses, convertToProjectCurrency])

  // 計算結算資訊
  const settlements = useMemo((): SettlementExportData[] => {
    if (memberBalances.length === 0) return []

    // 複製 balance 數據
    const balances = memberBalances.map((m) => ({
      name: m.name,
      balance: m.balance,
    }))

    const result: SettlementExportData[] = []

    // 貪婪演算法：讓最大債務人付給最大債權人
    while (true) {
      const debtor = balances.reduce((min, curr) =>
        curr.balance < min.balance ? curr : min
      )
      const creditor = balances.reduce((max, curr) =>
        curr.balance > max.balance ? curr : max
      )

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

    return result
  }, [memberBalances])

  // 建立匯出資料
  const buildExportData = useCallback((): ExportData | null => {
    if (!project) return null

    // 轉換支出資料（金額轉換為專案幣別）
    const expenses: ExpenseExportData[] = filteredExpenses.map((expense) => {
      const convertedAmount = convertToProjectCurrency(Number(expense.amount), expense.currency)
      return {
        id: expense.id,
        date: expense.expenseDate,
        description: expense.description || "",
        category: expense.category || "other",
        categoryLabel: getCategoryLabel(expense.category || "other"),
        amount: convertedAmount,
        payer: expense.payer.displayName,
        participants: expense.participants.map(
          (p) => memberNameMap.get(p.memberId) || "未知"
        ),
        participantShares: expense.participants.map((p) => {
          const shareRatio = Number(p.shareAmount) / Number(expense.amount)
          return {
            name: memberNameMap.get(p.memberId) || "未知",
            amount: convertedAmount * shareRatio,
          }
        }),
      }
    })

    // 計算分類統計（使用轉換後金額）
    const categoryMap = new Map<string, { amount: number; count: number }>()
    filteredExpenses.forEach((expense) => {
      const cat = expense.category || "other"
      const existing = categoryMap.get(cat) || { amount: 0, count: 0 }
      const convertedAmount = convertToProjectCurrency(Number(expense.amount), expense.currency)
      categoryMap.set(cat, {
        amount: existing.amount + convertedAmount,
        count: existing.count + 1,
      })
    })

    // 計算總金額（轉換為專案幣別）
    const totalAmount = filteredExpenses.reduce((sum, e) => {
      return sum + convertToProjectCurrency(Number(e.amount), e.currency)
    }, 0)
    const categoryBreakdown: CategoryBreakdownData[] = Array.from(categoryMap.entries())
      .map(([category, { amount, count }]) => ({
        category,
        label: getCategoryLabel(category),
        amount,
        count,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // 統計資料
    const statistics: StatisticsExportData = {
      totalExpenses: filteredExpenses.length,
      totalAmount,
      perPerson: project.members.length > 0 ? totalAmount / project.members.length : 0,
      memberCount: project.members.length,
      categoryBreakdown,
      memberBreakdown: memberBalances,
    }

    return {
      projectName: project.name,
      exportDate: new Date().toISOString(),
      currency: project.currency || "TWD",
      expenses,
      settlements,
      statistics,
    }
  }, [project, filteredExpenses, memberNameMap, memberBalances, settlements, convertToProjectCurrency])

  // 執行匯出
  const handleExport = async () => {
    const exportData = buildExportData()
    if (!exportData) return

    setExporting(true)

    const options: ExportOptions = {
      format,
      content,
      filters,
      projectName: exportData.projectName,
    }

    try {
      if (format === "csv") {
        const csvContent = generateCSV(exportData, options)
        downloadCSV(csvContent, `${exportData.projectName}_匯出`)
      } else {
        // 動態載入 PDF 生成器以減少 bundle size
        const { generatePDF, downloadPDF } = await import("@/lib/export/pdf-generator")
        const blob = await generatePDF(exportData, options)
        downloadPDF(blob, `${exportData.projectName}_匯出`)
      }
    } catch (error) {
      console.error("匯出失敗:", error)
    } finally {
      setExporting(false)
    }
  }

  // 檢查是否有選擇任何內容
  const hasSelectedContent = content.expenseDetails || content.settlementInfo || content.statisticsSummary

  // 大量資料警告
  const showLargeDataWarning = format === "pdf" && filteredExpenses.length > 500

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="匯出" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="匯出" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">
          專案不存在或無權限訪問
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="匯出" showBack backHref={backHref}>
      <div className="py-6 pb-24">
        <div className="max-w-lg mx-auto">
          {/* 匯出選項表單 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <ExportOptionsForm
              format={format}
              content={content}
              filters={filters}
              onFormatChange={setFormat}
              onContentChange={setContent}
              onFiltersChange={setFilters}
            />
          </div>

          {/* 匯出預覽資訊 */}
          <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              匯出預覽
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                專案：{project.name}
              </p>
              <p>
                支出筆數：{filteredExpenses.length} 筆
                {filteredExpenses.length !== project.expenses.length && (
                  <span className="text-slate-400">
                    {" "}(共 {project.expenses.length} 筆)
                  </span>
                )}
              </p>
              <p>成員人數：{project.members.length} 人</p>
            </div>
          </div>

          {/* 大量資料警告 */}
          {showLargeDataWarning && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium">大量資料警告</p>
                  <p>
                    目前有 {filteredExpenses.length} 筆支出，PDF 生成可能需要較長時間。
                    建議使用日期篩選或改用 CSV 格式。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 無內容警告 */}
          {!hasSelectedContent && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-200">
                  請至少選擇一項匯出內容
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 固定底部匯出按鈕 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleExport}
            disabled={exporting || !hasSelectedContent || filteredExpenses.length === 0}
            className="w-full gap-2"
            size="lg"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                匯出中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                匯出 {format.toUpperCase()}
              </>
            )}
          </Button>
          {filteredExpenses.length === 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              沒有符合條件的支出資料
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
