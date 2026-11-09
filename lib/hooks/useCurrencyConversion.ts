import { useCallback, useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY, getCurrencyDecimals } from "@/lib/constants/currencies"

interface ExchangeRates {
  [currency: string]: number
}

interface UseCurrencyConversionOptions {
  projectCurrency?: string
  customRates?: Record<string, number> | null
  precision?: number
  autoFetch?: boolean
}

interface UseCurrencyConversionReturn {
  /** 將金額從指定幣別轉換為旅程幣別 */
  convert: (amount: number, fromCurrency: string) => number
  /** 取得兩個幣別之間的匯率 */
  getRate: (from: string, to: string) => number
  /** 即時匯率資料 */
  exchangeRates: ExchangeRates | null
  /** 是否正在載入匯率 */
  loading: boolean
  /** 是否使用備用匯率 */
  usingFallback: boolean
  /** 上游匯率資料時間（不是本機抓取時間） */
  ratesTimestamp: number | null
  /** 上游資料日期（YYYY-MM-DD） */
  ratesDate: string | null
  /** 匯率來源名稱 */
  ratesSource: string | null
  /** 匯率載入錯誤 */
  error: string | null
  /** 重新取得匯率 */
  refetch: () => Promise<void>
}

/**
 * 幣別換算 Hook
 * 整合自訂匯率和即時匯率，提供統一的換算介面
 */
export function useCurrencyConversion(
  options: UseCurrencyConversionOptions = {}
): UseCurrencyConversionReturn {
  const {
    projectCurrency = DEFAULT_CURRENCY,
    customRates = null,
    precision,
    autoFetch = true,
  } = options
  // Amounts round to the settlement currency's minor unit unless a caller
  // overrides it explicitly with `precision`.
  const decimals = precision ?? getCurrencyDecimals(projectCurrency)

  const authFetch = useAuthFetch()
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const [ratesTimestamp, setRatesTimestamp] = useState<number | null>(null)
  const [ratesDate, setRatesDate] = useState<string | null>(null)
  const [ratesSource, setRatesSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 取得匯率
  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch("/api/exchange-rates")
      if (!res.ok) {
        throw new Error("匯率載入失敗")
      }
      const data = await res.json()
      setExchangeRates(data.rates)
      setUsingFallback(data.usingFallback || false)
      setRatesTimestamp(data.updatedAt ?? data.timestamp ?? null)
      setRatesDate(data.date ?? null)
      setRatesSource(data.source ?? null)
    } catch (err) {
      console.error("取得匯率失敗:", err)
      setError("匯率載入失敗")
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  // 自動取得匯率
  useEffect(() => {
    if (autoFetch && !exchangeRates) {
      fetchRates()
    }
  }, [autoFetch, exchangeRates, fetchRates])

  // 取得兩個幣別之間的匯率
  const getRate = useCallback(
    (from: string, to: string): number => {
      if (from === to) return 1

      // 優先使用自訂匯率（從 from 到旅程幣別）
      if (customRates && customRates[from] && to === projectCurrency) {
        return customRates[from]
      }

      // 使用即時匯率
      if (!exchangeRates) return 1

      const fromRate = exchangeRates[from] || 1
      const toRate = exchangeRates[to] || 1
      return toRate / fromRate
    },
    [customRates, exchangeRates, projectCurrency]
  )

  // 轉換金額到旅程幣別
  const convert = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (fromCurrency === projectCurrency) return amount

      const rate = getRate(fromCurrency, projectCurrency)
      const factor = Math.pow(10, decimals)
      return Math.round(amount * rate * factor) / factor
    },
    [projectCurrency, getRate, decimals]
  )

  return {
    convert,
    getRate,
    exchangeRates,
    loading,
    usingFallback,
    ratesTimestamp,
    ratesDate,
    ratesSource,
    error,
    refetch: fetchRates,
  }
}
