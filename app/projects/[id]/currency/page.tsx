"use client"

import { use, useEffect, useState, useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRightLeft,
  RefreshCw,
  TrendingUp,
  Calendar,
  Info,
  ArrowRight,
  Clock,
  AlertCircle,
  ChevronDown,
} from "lucide-react"
import { CurrencyCode, formatCurrency, getCurrencyInfo, DEFAULT_CURRENCY } from "@/lib/constants/currencies"

interface RatesData {
  base: string
  rates: Record<string, number>
  date: string
  isHistorical?: boolean
  usingFallback?: boolean
}

interface Project {
  id: string
  name: string
  currency: string
  customRates?: Record<string, number>
}

// 常用幣別（優先顯示）
const COMMON_CURRENCIES: CurrencyCode[] = ["TWD", "JPY", "USD", "EUR", "CNY", "HKD", "KRW", "THB", "SGD", "GBP"]

export default function CurrencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const authFetch = useAuthFetch()

  const [project, setProject] = useState<Project | null>(null)
  const [rates, setRates] = useState<RatesData | null>(null)
  const [historicalRates, setHistoricalRates] = useState<RatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  // 換算器狀態
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD")
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("TWD")
  const [amount, setAmount] = useState("100")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)

  // 歷史匯率狀態
  const [historicalDate, setHistoricalDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7) // 預設一周前
    return d.toISOString().split("T")[0]
  })

  // 展開狀態
  const [showRates, setShowRates] = useState(false)
  const [showHistorical, setShowHistorical] = useState(false)

  const backHref = `/projects/${id}`

  // 獲取專案資料
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await authFetch(`/api/projects/${id}`)
        if (res.ok) {
          const data = await res.json()
          setProject(data)
          // 設定預設幣別為專案幣別
          if (data.currency) {
            setToCurrency(data.currency as CurrencyCode)
          }
        }
      } catch (error) {
        console.error("獲取專案失敗:", error)
      }
    }
    fetchProject()
  }, [authFetch, id])

  // 獲取即時匯率
  const fetchRates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/exchange-rates")
      if (res.ok) {
        const data = await res.json()
        setRates(data)
      }
    } catch (error) {
      console.error("獲取匯率失敗:", error)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  // 換算功能
  useEffect(() => {
    if (!rates || !amount) {
      setConvertedAmount(null)
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum)) {
      setConvertedAmount(null)
      return
    }

    const fromRate = rates.rates[fromCurrency] || 1
    const toRate = rates.rates[toCurrency] || 1
    const result = amountNum * (toRate / fromRate)
    setConvertedAmount(Math.round(result * 100) / 100)
  }, [rates, amount, fromCurrency, toCurrency])

  // 獲取歷史匯率
  async function fetchHistoricalRates() {
    setLoadingHistorical(true)
    try {
      const res = await authFetch(`/api/exchange-rates?date=${historicalDate}`)
      if (res.ok) {
        const data = await res.json()
        setHistoricalRates(data)
      }
    } catch (error) {
      console.error("獲取歷史匯率失敗:", error)
    } finally {
      setLoadingHistorical(false)
    }
  }

  // 互換幣別
  function swapCurrencies() {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  // 取得匯率
  function getRate(from: string, to: string, ratesData: RatesData | null): number | null {
    if (!ratesData) return null
    const fromRate = ratesData.rates[from] || 1
    const toRate = ratesData.rates[to] || 1
    return toRate / fromRate
  }

  // 格式化匯率顯示
  function formatRate(rate: number): string {
    if (rate >= 100) return rate.toFixed(2)
    if (rate >= 1) return rate.toFixed(4)
    return rate.toFixed(6)
  }

  if (loading && !rates) {
    return (
      <AppLayout title="匯率" showBack backHref={backHref}>
        <div className="py-8 text-center text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  const projectCurrency = project?.currency || DEFAULT_CURRENCY

  return (
    <AppLayout title="匯率" showBack backHref={backHref}>
      <div className="space-y-4 pb-20">
        {/* 換算器 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              匯率換算
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 來源幣別 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">金額</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="輸入金額"
                  className="flex-1"
                />
                <Select value={fromCurrency} onValueChange={(v) => setFromCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((code) => {
                      const info = getCurrencyInfo(code)
                      return (
                        <SelectItem key={code} value={code}>
                          {info.symbol} {code}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 互換按鈕 */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={swapCurrencies}
                className="rounded-full"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* 目標幣別 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">換算結果</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-lg font-semibold">
                  {convertedAmount !== null
                    ? formatCurrency(convertedAmount, toCurrency)
                    : "-"
                  }
                </div>
                <Select value={toCurrency} onValueChange={(v) => setToCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((code) => {
                      const info = getCurrencyInfo(code)
                      return (
                        <SelectItem key={code} value={code}>
                          {info.symbol} {code}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 匯率資訊 */}
            {rates && (
              <div className="pt-2 border-t text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>匯率：1 {fromCurrency} = {formatRate(getRate(fromCurrency, toCurrency, rates) || 0)} {toCurrency}</span>
                  <span className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {rates.date}
                  </span>
                </div>
                {rates.usingFallback && (
                  <div className="flex items-center gap-1 text-amber-600 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-xs">使用備用匯率</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 專案自訂匯率對比 */}
        {project?.customRates && Object.keys(project.customRates).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                專案自訂匯率
              </CardTitle>
              <CardDescription>
                與即時匯率對比（基準：{projectCurrency}）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(project.customRates).map(([currency, customRate]) => {
                  const liveRate = getRate(currency, projectCurrency, rates)
                  const diff = liveRate ? ((customRate - liveRate) / liveRate * 100) : 0
                  return (
                    <div key={currency} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium">1 {currency}</span>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            即時: {liveRate ? formatRate(liveRate) : "-"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold text-amber-600">
                            自訂: {formatRate(customRate)}
                          </span>
                        </div>
                        <div className={`text-xs ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 即時匯率 */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors pb-3"
            onClick={() => setShowRates(!showRates)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                即時匯率
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); fetchRates(); }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <ChevronDown className={`h-4 w-4 transition-transform ${showRates ? "rotate-180" : ""}`} />
              </div>
            </div>
            <CardDescription>
              基準：{projectCurrency} | {rates?.date || "-"}
            </CardDescription>
          </CardHeader>
          {showRates && (
            <CardContent className="pt-0">
              {rates?.usingFallback && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  無法取得即時匯率，顯示備用資料
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COMMON_CURRENCIES.filter(c => c !== projectCurrency).map((currency) => {
                  const info = getCurrencyInfo(currency)
                  const rate = getRate(currency, projectCurrency, rates)
                  return (
                    <div
                      key={currency}
                      className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{info.symbol}</span>
                        <span className="font-medium">{currency}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{info.name}</div>
                      <div className="mt-2 font-semibold text-primary text-sm">
                        1 {currency} = {rate ? formatRate(rate) : "-"} {projectCurrency}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>

        {/* 歷史匯率 */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors pb-3"
            onClick={() => setShowHistorical(!showHistorical)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                歷史匯率查詢
              </CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${showHistorical ? "rotate-180" : ""}`} />
            </div>
            <CardDescription>查詢過去特定日期的匯率</CardDescription>
          </CardHeader>
          {showHistorical && (
            <CardContent className="pt-0 space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={historicalDate}
                  onChange={(e) => setHistoricalDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="flex-1"
                />
                <Button onClick={fetchHistoricalRates} disabled={loadingHistorical}>
                  {loadingHistorical ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "查詢"
                  )}
                </Button>
              </div>

              {historicalRates && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {historicalRates.date} 的匯率（基準：{projectCurrency}）
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COMMON_CURRENCIES.filter(c => c !== projectCurrency).map((currency) => {
                      const info = getCurrencyInfo(currency)
                      const histRate = getRate(currency, projectCurrency, historicalRates)
                      const currentRate = getRate(currency, projectCurrency, rates)
                      const diff = histRate && currentRate
                        ? ((currentRate - histRate) / histRate * 100)
                        : 0
                      return (
                        <div
                          key={currency}
                          className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{info.symbol}</span>
                            <span className="font-medium">{currency}</span>
                          </div>
                          <div className="mt-2 font-semibold text-sm">
                            {histRate ? formatRate(histRate) : "-"} {projectCurrency}
                          </div>
                          {currentRate && histRate && (
                            <div className={`text-xs mt-1 ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                              vs 現在: {diff > 0 ? "+" : ""}{diff.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
