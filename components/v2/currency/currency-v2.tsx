"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import {
  useCurrencyConversion,
  useProjectData,
  useRateSeries,
  type RateRange,
} from "@/lib/hooks"
import { getCurrencyDecimals } from "@/lib/constants/currencies"
import { localDateString, rateIfAvailable } from "./format"
import { CurrencyV2View, type CurrencyHistoricalMeta } from "./currency-v2-view"

export function CurrencyV2({ projectId }: { projectId: string }) {
  const authFetch = useAuthFetch()
  const { project, projectCurrency } = useProjectData(projectId)
  const { exchangeRates, ratesDate, usingFallback, loading, error, refetch } = useCurrencyConversion({
    projectCurrency,
  })

  const tripCurrencies = useMemo(() => {
    const counts = new Map<string, number>()
    for (const expense of project?.expenses ?? []) {
      if (!expense.currency || expense.currency === projectCurrency) continue
      counts.set(expense.currency, (counts.get(expense.currency) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([currency]) => currency)
  }, [project, projectCurrency])

  const [fromOverride, setFromOverride] = useState<string | null>(null)
  const [toOverride, setToOverride] = useState<string | null>(null)
  const defaultFrom = tripCurrencies[0] ?? (projectCurrency === "USD" ? "JPY" : "USD")
  const fromCurrency = fromOverride ?? defaultFrom
  const toCurrency = toOverride ?? projectCurrency

  const [amount, setAmount] = useState("")
  const [selectedDate, setSelectedDate] = useState(localDateString)
  const [historicalRates, setHistoricalRates] = useState<Record<string, number> | null>(null)
  const [historicalMeta, setHistoricalMeta] = useState<CurrencyHistoricalMeta | null>(null)
  const [historicalError, setHistoricalError] = useState<string | null>(null)
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const historyReqId = useRef(0)

  // Only currencies this trip actually uses; no generic common-currency noise.
  const displayCurrencies = useMemo(() => tripCurrencies.slice(0, 6), [tripCurrencies])

  const isLatest = selectedDate === localDateString()
  const activeRates = isLatest ? exchangeRates : historicalRates
  const activeLoading = isLatest ? loading : loadingHistorical
  const activeError = isLatest ? error : historicalError
  const activeDataDate = isLatest ? ratesDate : historicalMeta?.actualDate ?? null

  const [trendRange, setTrendRange] = useState<RateRange>(30)
  const trend = useRateSeries({
    base: fromCurrency,
    quote: toCurrency,
    endDate: selectedDate,
    days: trendRange,
    enabled: fromCurrency !== toCurrency,
  })

  const rate = rateIfAvailable(fromCurrency, toCurrency, activeRates)
  const numeric = Number.parseFloat(amount)
  const targetDecimals = getCurrencyDecimals(toCurrency)
  const targetFactor = 10 ** targetDecimals
  const convertedAmount =
    rate != null && Number.isFinite(numeric)
      ? Math.round(numeric * rate * targetFactor) / targetFactor
      : null

  const queryHistorical = useCallback(
    async (date: string) => {
      const id = ++historyReqId.current
      setLoadingHistorical(true)
      setHistoricalError(null)
      setHistoricalRates(null)
      setHistoricalMeta(null)
      try {
        const res = await authFetch(`/api/exchange-rates?date=${date}`)
        const data = await res.json().catch(() => ({}))
        if (id !== historyReqId.current) return
        if (!res.ok) {
          throw new Error(data.error ?? "查不到該日期的匯率，請換一天試試")
        }
        setHistoricalRates(data.rates ?? null)
        setHistoricalMeta({
          requestedDate: date,
          actualDate: data.date ?? date,
          usingFallback: Boolean(data.usingFallback),
        })
      } catch (error) {
        if (id !== historyReqId.current) return
        setHistoricalRates(null)
        setHistoricalMeta(null)
        setHistoricalError(
          error instanceof Error ? error.message : "查不到該日期的匯率，請換一天試試"
        )
      } finally {
        if (id === historyReqId.current) setLoadingHistorical(false)
      }
    },
    [authFetch]
  )

  const changeDate = (date: string) => {
    setSelectedDate(date)
    if (date === localDateString()) {
      historyReqId.current++
      setHistoricalRates(null)
      setHistoricalMeta(null)
      setHistoricalError(null)
      setLoadingHistorical(false)
      void refetch()
    } else {
      void queryHistorical(date)
    }
  }

  const refresh = () => {
    if (isLatest) void refetch()
    else void queryHistorical(selectedDate)
  }

  const swap = () => {
    setFromOverride(toCurrency)
    setToOverride(fromCurrency)
  }

  return (
    <div className="mx-auto max-w-md">
      <CurrencyV2View
        projectId={projectId}
        projectCurrency={projectCurrency}
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
        amount={amount}
        convertedAmount={convertedAmount}
        rate={rate}
        ratesDate={activeDataDate}
        usingFallback={isLatest ? usingFallback : false}
        loading={activeLoading}
        ratesError={activeError}
        rates={activeRates}
        displayCurrencies={displayCurrencies}
        selectedDate={selectedDate}
        historicalMeta={historicalMeta}
        trendPoints={trend.points}
        trendLoading={trend.loading}
        trendError={trend.error}
        trendRange={trendRange}
        onTrendRange={setTrendRange}
        onRetryTrend={trend.refetch}
        onAmount={setAmount}
        onFrom={setFromOverride}
        onTo={setToOverride}
        onSwap={swap}
        onDateChange={changeDate}
        onRetryHistorical={() => void queryHistorical(selectedDate)}
        onRefresh={refresh}
      />
    </div>
  )
}
