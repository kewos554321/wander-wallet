"use client"

import { use, useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"

interface Balance {
  userId: string
  userName: string
  userEmail: string
  balance: number
}

interface Settlement {
  from: {
    id: string
    name: string | null
    email: string
  }
  to: {
    id: string
    name: string | null
    email: string
  }
  amount: number
}

interface SettleData {
  balances: Balance[]
  settlements: Settlement[]
  summary: {
    totalExpenses: number
    totalAmount: number
    totalShared: number
    isBalanced: boolean
  }
}

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<SettleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettleData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchSettleData() {
    try {
      const res = await fetch(`/api/projects/${id}/settle`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      } else {
        const errData = await res.json()
        setError(errData.error || "獲取結算數據失敗")
      }
    } catch (err) {
      console.error("獲取結算數據錯誤:", err)
      setError("獲取結算數據失敗")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="結算" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="結算" showBack>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout title="結算" showBack>
        <div className="text-center py-8 text-muted-foreground">無結算數據</div>
      </AppLayout>
    )
  }

  const { balances, settlements, summary } = data

  // 分類餘額
  const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance)
  const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance)
  const settled = balances.filter((b) => Math.abs(b.balance) <= 0.01)

  return (
    <AppLayout title="結算" showBack>
      <div className="space-y-6 pb-20">
        {/* 總覽 */}
        <Card>
          <CardHeader>
            <CardTitle>總覽</CardTitle>
            <CardDescription>專案支出統計</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">總支出筆數</span>
              <span className="font-medium">{summary.totalExpenses} 筆</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">總金額</span>
              <span className="font-bold text-lg">
                ${summary.totalAmount.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {summary.totalExpenses > 0 && balances.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">人均支出</span>
                <span className="font-medium">
                  ${(summary.totalAmount / balances.length).toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 結算建議 */}
        <Card>
          <CardHeader>
            <CardTitle>結算建議</CardTitle>
            <CardDescription>
              {settlements.length > 0
                ? `需要 ${settlements.length} 筆轉帳來完成結算`
                : "目前沒有需要結算的項目"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {summary.totalExpenses === 0 ? "尚無支出記錄" : "所有人都已結清！"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {s.from.name || s.from.email?.split("@")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">付款</div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {s.to.name || s.to.email?.split("@")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">收款</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        ${s.amount.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 個人餘額明細 */}
        <Card>
          <CardHeader>
            <CardTitle>個人餘額</CardTitle>
            <CardDescription>每個人的收支狀況</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 應收款（付多了）*/}
            {creditors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">應收款（付多了）</span>
                </div>
                <div className="space-y-2">
                  {creditors.map((b) => (
                    <div
                      key={b.userId}
                      className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                    >
                      <span className="font-medium">{b.userName}</span>
                      <span className="text-green-600 font-bold">
                        +${b.balance.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 應付款（付少了）*/}
            {debtors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">應付款（欠款）</span>
                </div>
                <div className="space-y-2">
                  {debtors.map((b) => (
                    <div
                      key={b.userId}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                    >
                      <span className="font-medium">{b.userName}</span>
                      <span className="text-red-600 font-bold">
                        ${b.balance.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 已結清 */}
            {settled.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">已結清</span>
                </div>
                <div className="space-y-2">
                  {settled.map((b) => (
                    <div
                      key={b.userId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30"
                    >
                      <span className="font-medium text-muted-foreground">{b.userName}</span>
                      <span className="text-muted-foreground">$0.00</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {balances.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                尚無成員餘額數據
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


