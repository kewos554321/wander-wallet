"use client"

import { useCallback, useMemo, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { useCurrencyConversion, useProjectData } from "@/lib/hooks"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { customRateDiff, rateFromRates } from "./format"
import { CurrencyV2View, type CustomRateRow } from "./currency-v2-view"

const COMMON_CURRENCIES = ["TWD", "JPY", "USD", "EUR", "CNY", "HKD", "KRW", "THB", "SGD", "GBP"]

function weekAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split("T")[0]
}

export function CurrencyV2({ projectId }: { projectId: string }) {
  const authFetch = useAuthFetch()
  const { projectCurrency, customRates, precision } = useProjectData(projectId)
  const { getRate, exchangeRates, ratesTimestamp, usingFallback, refetch } = useCurrencyConversion({
    projectCurrency,
    customRates,
    precision,
  })

  const [fromOverride, setFromOverride] = useState<string | null>(null)
  const [toOverride, setToOverride] = useState<string | null>(null)
  const fromCurrency = fromOverride ?? (projectCurrency === "USD" ? "JPY" : "USD")
  const toCurrency = toOverride ?? projectCurrency
  const [amount, setAmount] = useState("100")
  const [showRates, setShowRates] = useState(true)
  const [showHistorical, setShowHistorical] = useState(false)
  const [historicalDate, setHistoricalDate] = useState(weekAgo)
  const [historicalRates, setHistoricalRates] = useState<{ currency: string; rate: number; diff: number }[]>([])
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  const rates = exchangeRates ?? {}

  const rate =
    toCurrency === projectCurrency
      ? getRate(fromCurrency, toCurrency)
      : rateFromRates(fromCurrency, toCurrency, rates)

  const numeric = Number.parseFloat(amount)
  const convertedAmount = Number.isFinite(numeric) ? Math.round(numeric * rate * 100) / 100 : null

  const customRateRows = useMemo<CustomRateRow[]>(() => {
    if (!customRates) return []
    return Object.entries(customRates).map(([currency, customRate]) => {
      const liveRate = rateFromRates(currency, projectCurrency, rates)
      return { currency, customRate, liveRate, diff: customRateDiff(customRate, liveRate) }
    })
  }, [customRates, projectCurrency, rates])

  const liveRates = useMemo(
    () => COMMON_CURRENCIES.filter((code) => code !== projectCurrency).map((code) => ({ currency: code, rate: rateFromRates(code, projectCurrency, rates) })),
    [projectCurrency, rates]
  )

  const queryHistorical = useCallback(async () => {
    setLoadingHistorical(true)
    try {
      const res = await authFetch(`/api/exchange-rates?date=${historicalDate}`)
      if (res.ok) {
        const data = await res.json()
        const historical = data.rates ?? {}
        setHistoricalRates(
          COMMON_CURRENCIES.filter((code) => code !== projectCurrency).map((code) => {
            const value = rateFromRates(code, projectCurrency, historical)
            return { currency: code, rate: value, diff: customRateDiff(value, rateFromRates(code, projectCurrency, rates)) }
          })
        )
      }
    } catch (error) {
      console.error("查詢歷史匯率失敗:", error)
    } finally {
      setLoadingHistorical(false)
    }
  }, [authFetch, historicalDate, projectCurrency, rates])

  const swap = () => {
    setFromOverride(toCurrency)
    setToOverride(fromCurrency)
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <CurrencyV2View
          projectId={projectId}
          projectCurrency={projectCurrency}
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          amount={amount}
          convertedAmount={convertedAmount}
          rate={rate}
          ratesTimestamp={ratesTimestamp}
          usingFallback={usingFallback}
          customRates={customRateRows}
          liveRates={liveRates}
          historicalDate={historicalDate}
          historicalRates={historicalRates}
          loading={false}
          loadingHistorical={loadingHistorical}
          showRates={showRates}
          showHistorical={showHistorical}
          onAmount={setAmount}
          onFrom={setFromOverride}
          onTo={setToOverride}
          onSwap={swap}
          onToggleRates={() => setShowRates((v) => !v)}
          onToggleHistorical={() => setShowHistorical((v) => !v)}
          onHistoricalDate={setHistoricalDate}
          onQueryHistorical={queryHistorical}
          onRefresh={refetch}
        />
      </div>
    </UiV2Scope>
  )
}
