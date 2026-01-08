import { useCallback, useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"

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
  /** 將金額從指定幣別轉換為專案幣別 */
  convert: (amount: number, fromCurrency: string) => number
  /** 取得兩個幣別之間的匯率 */
  getRate: (from: string, to: string) => number
  /** 即時匯率資料 */
  exchangeRates: ExchangeRates | null
  /** 是否正在載入匯率 */
  loading: boolean
  /** 是否使用備用匯率 */
  usingFallback: boolean
  /** 匯率更新時間戳記 */
  ratesTimestamp: number | null
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
    precision = 2,
    autoFetch = true,
  } = options

  const authFetch = useAuthFetch()
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const [ratesTimestamp, setRatesTimestamp] = useState<number | null>(null)

  // 取得匯率
  const fetchRates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/exchange-rates")
      if (res.ok) {
        const data = await res.json()
        setExchangeRates(data.rates)
        setUsingFallback(data.usingFallback || false)
        setRatesTimestamp(data.timestamp || null)
      }
    } catch (error) {
      console.error("取得匯率失敗:", error)
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

      // 優先使用自訂匯率（從 from 到專案幣別）
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

  // 轉換金額到專案幣別
  const convert = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (fromCurrency === projectCurrency) return amount

      const rate = getRate(fromCurrency, projectCurrency)
      const factor = Math.pow(10, precision)
      return Math.round(amount * rate * factor) / factor
    },
    [projectCurrency, getRate, precision]
  )

  return {
    convert,
    getRate,
    exchangeRates,
    loading,
    usingFallback,
    ratesTimestamp,
    refetch: fetchRates,
  }
}
