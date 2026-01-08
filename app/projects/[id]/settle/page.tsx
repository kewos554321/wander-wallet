"use client"

import { use, useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowRight, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, User, Receipt, Wallet, Users, Share2, Copy, Check, Info, Settings, Calculator, HelpCircle, Heart, Coffee, Mail } from "lucide-react"
import Link from "next/link"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { AdContainer } from "@/components/ads/ad-container"

// PayPal icon component
function PaypalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
    </svg>
  )
}

interface Balance {
  memberId: string
  displayName: string
  userImage: string | null
  balance: number
  totalPaid: number
  totalShare: number
}

interface Settlement {
  from: {
    memberId: string
    displayName: string
    userImage: string | null
  }
  to: {
    memberId: string
    displayName: string
    userImage: string | null
  }
  amount: number
}

interface ExpenseDetail {
  id: string
  description: string
  amount: number
  currency: string
  convertedAmount: number
  payer: {
    memberId: string
    displayName: string
  }
  participants: {
    memberId: string
    displayName: string
    shareAmount: number
    convertedShareAmount: number
  }[]
}

interface SettleData {
  balances: Balance[]
  settlements: Settlement[]
  expenseDetails: ExpenseDetail[]
  summary: {
    totalExpenses: number
    totalAmount: number
    totalShared: number
    isBalanced: boolean
    currency?: string
    precision?: number
    exchangeRatesUsed?: Record<string, number>
    defaultRates?: Record<string, number>
    usingCustomRates?: Record<string, boolean>
    hasCustomRates?: boolean
  }
}

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<SettleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [calcDialogOpen, setCalcDialogOpen] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null) // null = 使用專案幣別
  const authFetch = useAuthFetch()

  const fetchSettleData = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${id}/settle`)
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
  }, [authFetch, id])

  useEffect(() => {
    fetchSettleData()
  }, [fetchSettleData])

  // 轉換金額到顯示幣別
  function convertToDisplayCurrency(amount: number): number {
    if (!displayCurrency || !data) return amount
    const baseCurrency = data.summary.currency || DEFAULT_CURRENCY
    if (displayCurrency === baseCurrency) return amount

    // 查找匯率
    const rates = data.summary.exchangeRatesUsed || {}
    const defaultRates = data.summary.defaultRates || {}

    // 如果顯示幣別在匯率表中，需要反向換算
    const rate = rates[displayCurrency] || defaultRates[displayCurrency]
    if (rate) {
      return amount / rate
    }
    return amount
  }

  // 取得顯示用的幣別代碼
  function getDisplayCurrencyCode(): string {
    return displayCurrency || data?.summary.currency || DEFAULT_CURRENCY
  }

  // 生成分享文字
  function generateShareText(): string {
    if (!data) return ""

    const { settlements, summary } = data
    const currency = summary.currency || DEFAULT_CURRENCY
    const lines: string[] = []

    lines.push("💰 結算明細")
    lines.push(`總支出：${formatCurrency(summary.totalAmount, currency)}`)
    lines.push("")

    if (settlements.length === 0) {
      lines.push("✅ 所有人都已結清！")
    } else {
      lines.push("📋 轉帳清單：")
      settlements.forEach((s, idx) => {
        lines.push(`${idx + 1}. ${s.from.displayName} ➡️ ${s.to.displayName}：${formatCurrency(s.amount, currency)}`)
      })
    }

    return lines.join("\n")
  }

  // 複製到剪貼簿
  async function handleCopy() {
    const text = generateShareText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("複製失敗:", err)
    }
  }

  // 分享到 LINE
  function handleShareLINE() {
    const text = generateShareText()
    const encodedText = encodeURIComponent(text)
    // 使用官方 LINE URL scheme 分享文字
    // https://developers.line.biz/en/docs/line-login/using-line-url-scheme/
    window.open(`https://line.me/R/share?text=${encodedText}`, "_blank")
    setShareDialogOpen(false)
  }

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="結算" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="結算" showBack backHref={backHref}>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout title="結算" showBack backHref={backHref}>
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
    <AppLayout title="結算" showBack backHref={backHref}>
      <div className="space-y-6 pb-20">
        {/* 頂部橫幅廣告 */}
        <AdContainer
          placement="settle"
          variant="banner"
        />

        {/* 匯率資訊提示 */}
        {data?.summary.exchangeRatesUsed && Object.keys(data.summary.exchangeRatesUsed).length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">
                  {data.summary.hasCustomRates ? "使用自訂匯率結算" : "使用即時匯率結算"}
                </p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(data.summary.exchangeRatesUsed).map(([curr, rate]) => {
                    const isCustom = data.summary.usingCustomRates?.[curr]
                    return (
                      <div key={curr} className="flex items-center gap-2">
                        <span>1 {curr} = {rate.toFixed(data.summary.precision ?? 2)} {data.summary.currency}</span>
                        {isCustom && (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded">自訂</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <Link
                  href={`/projects/${id}/settings`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  <Settings className="h-3 w-3" />
                  前往專案設定調整匯率
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 操作按鈕列 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 顯示幣別選擇 */}
          {data?.summary.exchangeRatesUsed && Object.keys(data.summary.exchangeRatesUsed).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">顯示幣別</span>
              <Select
                value={displayCurrency || data?.summary.currency || DEFAULT_CURRENCY}
                onValueChange={(value) => setDisplayCurrency(value === (data?.summary.currency || DEFAULT_CURRENCY) ? null : value)}
              >
                <SelectTrigger size="sm" className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={data?.summary.currency || DEFAULT_CURRENCY}>
                    {data?.summary.currency || DEFAULT_CURRENCY}
                  </SelectItem>
                  {Object.keys(data.summary.exchangeRatesUsed).map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">(僅供參考)</span>
            </div>
          )}

          {/* 按鈕組 */}
          <div className="flex gap-2 sm:ml-auto">
            {/* 計算流程按鈕 */}
            <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="h-4 w-4" />
                  計算說明
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    計算過程
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Step 1: 支出明細 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center">1</div>
                      <h3 className="font-semibold">支出明細</h3>
                      <span className="text-xs text-muted-foreground">（共 {data?.expenseDetails?.length || 0} 筆）</span>
                    </div>
                    <div className="ml-8">
                      {data?.expenseDetails && data.expenseDetails.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {data.expenseDetails.map((expense) => (
                            <div key={expense.id} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium">{expense.description}</span>
                                <span className="text-primary font-medium">
                                  {expense.currency !== summary.currency
                                    ? `${formatCurrency(expense.amount, expense.currency)} → `
                                    : ""
                                  }
                                  {formatCurrency(expense.convertedAmount, summary.currency || DEFAULT_CURRENCY)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>
                                  <span className="text-green-600">付款：</span>
                                  {expense.payer.displayName}
                                </div>
                                <div>
                                  <span className="text-amber-600">分攤：</span>
                                  {(() => {
                                    const count = expense.participants.length
                                    const total = expense.convertedAmount
                                    const perPerson = total / count
                                    const precision = summary.precision ?? 2
                                    const hasRounding = !Number.isInteger(perPerson)
                                    return (
                                      <>
                                        {hasRounding && (
                                          <span className="text-muted-foreground/50 mr-1">
                                            ({total} ÷ {count} ≈ {perPerson.toFixed(precision)})
                                          </span>
                                        )}
                                        {expense.participants.map((p, i) => (
                                          <span key={p.memberId}>
                                            {i > 0 && "、"}
                                            {p.displayName}
                                            <span className="text-muted-foreground/70">
                                              ({formatCurrency(p.convertedShareAmount, summary.currency || DEFAULT_CURRENCY)})
                                            </span>
                                          </span>
                                        ))}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">尚無支出記錄</p>
                      )}
                    </div>
                  </div>

                  {/* Step 2: 計算各人總額 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center">2</div>
                      <h3 className="font-semibold">計算各人總額</h3>
                    </div>
                    <div className="ml-8">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="text-left p-2 font-medium">成員</th>
                              <th className="text-right p-2 font-medium text-green-600">已付</th>
                              <th className="text-right p-2 font-medium text-amber-600">應付</th>
                              <th className="text-right p-2 font-medium">餘額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balances.map((b) => (
                              <tr key={b.memberId} className="border-t border-slate-200 dark:border-slate-700">
                                <td className="p-2">{b.displayName}</td>
                                <td className="p-2 text-right text-green-600">
                                  {formatCurrency(b.totalPaid, summary.currency || DEFAULT_CURRENCY)}
                                </td>
                                <td className="p-2 text-right text-amber-600">
                                  {formatCurrency(b.totalShare, summary.currency || DEFAULT_CURRENCY)}
                                </td>
                                <td className={`p-2 text-right font-medium ${b.balance > 0.01 ? "text-green-600" : b.balance < -0.01 ? "text-red-600" : "text-muted-foreground"}`}>
                                  {b.balance > 0.01 ? "+" : ""}{formatCurrency(b.balance, summary.currency || DEFAULT_CURRENCY)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        餘額 = 已付金額 − 應付金額（正數表示應收回，負數表示需付出）
                      </p>
                    </div>
                  </div>

                  {/* Step 3: 結算方案 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center">3</div>
                      <h3 className="font-semibold">結算方案</h3>
                    </div>
                    <div className="ml-8">
                      {settlements.length > 0 ? (
                        <>
                          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-2">
                            {settlements.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{idx + 1}.</span>
                                <span className="text-red-600 font-medium">{s.from.displayName}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className="text-green-600 font-medium">{s.to.displayName}</span>
                                <span className="ml-auto font-bold text-primary">
                                  {formatCurrency(s.amount, summary.currency || DEFAULT_CURRENCY)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            以上為最少轉帳次數的結算方案，共需 {settlements.length} 筆轉帳
                          </p>
                        </>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {summary.totalExpenses === 0 ? "尚無支出記錄" : "所有人都已結清，無需轉帳！"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 分享按鈕 */}
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  分享
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>分享結算結果</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* 預覽文字 */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm whitespace-pre-line max-h-48 overflow-y-auto">
                  {generateShareText()}
                </div>
                {/* 分享按鈕 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        複製文字
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white"
                    onClick={handleShareLINE}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    LINE 分享
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 總覽 */}
        <Card>
          <CardHeader>
            <CardTitle>總覽</CardTitle>
            <CardDescription>專案支出統計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {/* 總支出筆數 */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                  <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {summary.totalExpenses}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">支出筆數</span>
              </div>

              {/* 總金額 */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                  <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {Math.round(convertToDisplayCurrency(summary.totalAmount)).toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">總金額 ({getDisplayCurrencyCode()})</span>
              </div>

              {/* 人均支出 */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                  {balances.length > 0
                    ? Math.round(convertToDisplayCurrency(summary.totalAmount / balances.length)).toLocaleString()
                    : 0}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">人均 ({getDisplayCurrencyCode()})</span>
              </div>
            </div>
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
                {settlements.map((s, idx) => {
                  const fromAvatarData = parseAvatarString(s.from.userImage)
                  const toAvatarData = parseAvatarString(s.to.userImage)
                  const fromHasExternalImage = s.from.userImage && !s.from.userImage.startsWith("avatar:")
                  const toHasExternalImage = s.to.userImage && !s.to.userImage.startsWith("avatar:")
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col items-center gap-1">
                          {fromAvatarData ? (
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(fromAvatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(fromAvatarData.iconId); return <Icon className="h-5 w-5 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center overflow-hidden">
                              {fromHasExternalImage ? (
                                <Image
                                  src={s.from.userImage!}
                                  alt={s.from.displayName}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-red-500 dark:text-red-400" />
                              )}
                            </div>
                          )}
                          <div className="font-medium text-sm">
                            {s.from.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">付款</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col items-center gap-1">
                          {toAvatarData ? (
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(toAvatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(toAvatarData.iconId); return <Icon className="h-5 w-5 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center overflow-hidden">
                              {toHasExternalImage ? (
                                <Image
                                  src={s.to.userImage!}
                                  alt={s.to.displayName}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-green-500 dark:text-green-400" />
                              )}
                            </div>
                          )}
                          <div className="font-medium text-sm">
                            {s.to.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">收款</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {formatCurrency(convertToDisplayCurrency(s.amount), getDisplayCurrencyCode())}
                        </div>
                      </div>
                    </div>
                  )
                })}
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
                  {creditors.map((b) => {
                    const avatarData = parseAvatarString(b.userImage)
                    const hasExternalImage = b.userImage && !b.userImage.startsWith("avatar:")
                    return (
                      <div
                        key={b.memberId}
                        className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      >
                        <div className="flex items-center gap-3">
                          {avatarData ? (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={b.userImage!}
                                  alt={b.displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          )}
                          <span className="font-medium">{b.displayName}</span>
                        </div>
                        <span className="text-green-600 font-bold">
                          +{formatCurrency(convertToDisplayCurrency(b.balance), getDisplayCurrencyCode())}
                        </span>
                      </div>
                    )
                  })}
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
                  {debtors.map((b) => {
                    const avatarData = parseAvatarString(b.userImage)
                    const hasExternalImage = b.userImage && !b.userImage.startsWith("avatar:")
                    return (
                      <div
                        key={b.memberId}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                      >
                        <div className="flex items-center gap-3">
                          {avatarData ? (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={b.userImage!}
                                  alt={b.displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          )}
                          <span className="font-medium">{b.displayName}</span>
                        </div>
                        <span className="text-red-600 font-bold">
                          {formatCurrency(convertToDisplayCurrency(Math.abs(b.balance)), getDisplayCurrencyCode())}
                        </span>
                      </div>
                    )
                  })}
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
                  {settled.map((b) => {
                    const avatarData = parseAvatarString(b.userImage)
                    const hasExternalImage = b.userImage && !b.userImage.startsWith("avatar:")
                    return (
                      <div
                        key={b.memberId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          {avatarData ? (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                            >
                              {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                              {hasExternalImage ? (
                                <Image
                                  src={b.userImage!}
                                  alt={b.displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                          )}
                          <span className="font-medium text-muted-foreground">{b.displayName}</span>
                        </div>
                        <span className="text-muted-foreground">{formatCurrency(0, getDisplayCurrencyCode())}</span>
                      </div>
                    )
                  })}
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

        {/* 贊助區塊 */}
        <Card className="border-pink-200 dark:border-pink-900 bg-gradient-to-br from-pink-50 to-background dark:from-pink-950/30 dark:to-background">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">喜歡 Wander Wallet 嗎？</h3>
                <p className="text-sm text-muted-foreground">支持我們持續開發新功能</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Wander Wallet 是免費服務，由小團隊用愛維護。如果分帳工具對你有幫助，歡迎請我們喝杯咖啡！
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#FFDD00] text-[#946C00] dark:text-[#FFDD00] hover:bg-[#FFDD00]/10"
                onClick={() => window.open("https://buymeacoffee.com/your-username", "_blank")}
              >
                <Coffee className="w-4 h-4 mr-2" />
                Buy Me a Coffee
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#FF5E5B] text-[#FF5E5B] hover:bg-[#FF5E5B]/10"
                onClick={() => window.open("https://ko-fi.com/your-username", "_blank")}
              >
                <Heart className="w-4 h-4 mr-2" />
                Ko-fi
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#003087] text-[#003087] dark:border-[#0070BA] dark:text-[#0070BA] hover:bg-[#003087]/10 dark:hover:bg-[#0070BA]/10"
                onClick={() => window.open("https://paypal.me/your-username", "_blank")}
              >
                <PaypalIcon className="w-4 h-4 mr-2" />
                PayPal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "mailto:kewos554321@gmail.com?subject=Wander Wallet 贊助詢問"}
              >
                <Mail className="w-4 h-4 mr-2" />
                其他方式
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  )
}


