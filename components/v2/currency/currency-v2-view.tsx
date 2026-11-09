"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRightLeft, Clock } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { V2CurrencyField } from "@/components/v2/ui/currency-field"
import { formatCurrency } from "@/lib/constants/currencies"
import { cn } from "@/lib/utils"
import type { RatePoint, RateRange } from "@/lib/hooks"
import { CurrencySourceSheet } from "./currency-source-sheet"
import { RateTrendChart } from "./rate-trend-chart"
import { formatRate, formatRateDate, localDateString, rateIfAvailable } from "./format"

export interface CurrencyHistoricalMeta {
  requestedDate: string
  actualDate: string
  usingFallback: boolean
}

export interface CurrencyV2ViewProps {
  projectId: string
  projectCurrency: string
  fromCurrency: string
  toCurrency: string
  amount: string
  convertedAmount: number | null
  rate: number | null
  ratesDate: string | null
  usingFallback: boolean
  loading: boolean
  ratesError: string | null
  rates: Record<string, number> | null
  displayCurrencies: string[]
  selectedDate: string
  historicalMeta: CurrencyHistoricalMeta | null
  trendPoints: RatePoint[] | null
  trendLoading: boolean
  trendError: string | null
  trendRange: RateRange
  onTrendRange: (range: RateRange) => void
  onRetryTrend: () => void
  onAmount: (v: string) => void
  onFrom: (c: string) => void
  onTo: (c: string) => void
  onSwap: () => void
  onDateChange: (d: string) => void
  onRetryHistorical: () => void
  onRefresh: () => void
}

function displayRate(
  code: string,
  projectCurrency: string,
  rates: Record<string, number> | null
): number | null {
  return rateIfAvailable(code, projectCurrency, rates)
}

export function CurrencyV2View(props: CurrencyV2ViewProps) {
  const {
    projectCurrency,
    fromCurrency,
    toCurrency,
    amount,
    convertedAmount,
    rate,
    ratesDate,
    usingFallback,
    loading,
    ratesError,
    rates,
    displayCurrencies,
    selectedDate,
    historicalMeta,
    trendPoints,
    trendLoading,
    trendError,
    trendRange,
    onTrendRange,
    onRetryTrend,
    onAmount,
    onFrom,
    onTo,
    onSwap,
    onDateChange,
    onRetryHistorical,
    onRefresh,
  } = props

  const [sourcesOpen, setSourcesOpen] = useState(false)

  const dataDate = formatRateDate(ratesDate)
  const isHistorical = selectedDate !== localDateString()
  const hasRates =
    rates != null &&
    displayCurrencies.some((code) => displayRate(code, projectCurrency, rates) != null)

  return (
    <div className="min-h-screen">
      <V2TopBar
        title="匯率"
        backHref={`/projects/${props.projectId}`}
        titleClassName="text-[17px] font-semibold"
      />

      <div
        aria-busy={loading}
        className="mx-4 mt-3.5 overflow-hidden rounded-v2-lg bg-v2-lake p-[18px] px-5 text-v2-paper"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="m-0 text-[13px] font-semibold opacity-85">匯率換算</p>
          <span className="shrink-0 rounded-full bg-v2-paper/15 px-2 py-0.5 text-[10px] font-semibold tracking-[.2px]">
            結算幣別 {projectCurrency}
          </span>
        </div>
        <label htmlFor="currency-amount" className="mb-1 block text-[11px] opacity-70">
          金額（{fromCurrency}）
        </label>
        <input
          id="currency-amount"
          aria-label="金額"
          inputMode="decimal"
          value={amount}
          placeholder="輸入金額"
          onChange={(e) => onAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="mb-3.5 w-full rounded-v2-md border border-v2-paper/30 bg-v2-paper/10 px-3.5 py-3 font-v2-serif text-xl font-bold text-v2-paper outline-none placeholder:text-v2-paper/45"
        />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <V2CurrencyField value={fromCurrency} onChange={onFrom} short />
          <button
            type="button"
            aria-label="交換幣別"
            onClick={onSwap}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-v2-paper text-v2-lake"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
          <V2CurrencyField value={toCurrency} onChange={onTo} short />
        </div>
        <p
          data-testid="currency-result"
          className="mt-3.5 font-v2-serif text-[32px] font-bold leading-10 tabular-nums"
        >
          {convertedAmount !== null ? formatCurrency(convertedAmount, toCurrency) : "—"}
        </p>
        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 opacity-75">
          <Clock className="mt-[1px] h-[11px] w-[11px] shrink-0" aria-hidden="true" />
          <span data-testid="currency-data-date">
            {loading ? "匯率載入中…" : dataDate ? `資料日期 ${dataDate}` : "資料日期未知"}
            {" · "}
            {rate != null
              ? `1 ${fromCurrency} = ${formatRate(rate)} ${toCurrency}`
              : `1 ${fromCurrency} = — ${toCurrency}`}
          </span>
        </div>
        {usingFallback ? (
          <p
            role="status"
            className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-v2-coral-tint"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            使用備援匯率，可能非最新
          </p>
        ) : null}
      </div>

      <div className="mx-4 mt-3.5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <label
            htmlFor="currency-rate-date"
            className="text-[11px] font-medium text-v2-ink-muted"
          >
            匯率日期
          </label>
          <span className="text-[10px] text-v2-ink-muted">套用到本頁匯率</span>
        </div>
        <input
          id="currency-rate-date"
          type="date"
          aria-label="匯率日期"
          max={localDateString()}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-v2-sm border border-v2-line bg-v2-paper px-3 py-2.5 text-[13px] text-v2-ink"
        />
      </div>

      {ratesError ? (
        <div
          role="alert"
          className="mx-4 mt-2 flex items-start justify-between gap-3 rounded-v2-sm border border-v2-danger-border bg-v2-danger-tint px-2.5 py-2 text-[11px] leading-4 text-v2-danger-strong"
        >
          <p className="m-0">{ratesError}</p>
          <button
            type="button"
            onClick={isHistorical ? onRetryHistorical : onRefresh}
            className="shrink-0 rounded-full border border-v2-lake px-3 py-1 text-[11px] font-bold text-v2-lake"
          >
            重試
          </button>
        </div>
      ) : null}

      {fromCurrency !== toCurrency ? (
        <RateTrendChart
          base={fromCurrency}
          quote={toCurrency}
          range={trendRange}
          points={trendPoints}
          loading={trendLoading}
          error={trendError}
          onRangeChange={onTrendRange}
          onRetry={onRetryTrend}
        />
      ) : null}

      {displayCurrencies.length > 0 ? (
      <section className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface">
        <div className="p-4 pb-3">
          <h2 className="m-0 text-[13px] font-bold text-v2-lake">旅程幣別</h2>
          <p className="m-0 mt-0.5 text-[10px] text-v2-ink-muted">這趟旅程用到的幣別</p>
        </div>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2" aria-busy={loading}>
            {displayCurrencies.map((code) => {
              const value = displayRate(code, projectCurrency, rates)
              const directionLabel = `1 ${code} → ${projectCurrency}`
              const equation =
                value == null
                  ? `${code}，暫無匯率`
                  : `1 ${code} = ${formatRate(value)} ${projectCurrency}`
              return (
                <div
                  key={code}
                  role="group"
                  aria-label={equation}
                  className="min-w-0 rounded-v2-sm bg-v2-lake-soft px-2.5 py-2 text-center"
                >
                  <p className="m-0 text-[10px] text-v2-ink-muted">{code}</p>
                  <p
                    data-testid={`rate-${code}`}
                    className={cn(
                      "m-0 mt-0.5 font-v2-serif text-[13px] font-bold tabular-nums",
                      value == null && "animate-pulse motion-reduce:animate-none"
                    )}
                  >
                    {value == null ? "—" : formatRate(value)}
                  </p>
                  <p
                    data-testid={`direction-${code}`}
                    className="m-0 text-[10px] leading-4 text-v2-ink-muted"
                  >
                    {directionLabel}
                  </p>
                </div>
              )
            })}
          </div>

          {isHistorical && !ratesError && !loading && !hasRates ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-v2-ink-muted">
              這天沒有可用的匯率資料，請換一天試試。
            </p>
          ) : null}

          {isHistorical &&
          historicalMeta &&
          historicalMeta.actualDate !== historicalMeta.requestedDate ? (
            <p className="mt-3 text-[11px] leading-relaxed text-v2-ink-muted">
              查詢 {historicalMeta.requestedDate}，回傳 {historicalMeta.actualDate}。
            </p>
          ) : null}
        </div>
      </section>
      ) : null}

      <div
        data-testid="currency-source-line"
        className="mx-4 mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] leading-4 text-v2-ink-muted"
      >
        <span>匯率僅供參考</span>
        <span aria-hidden="true">·</span>
        <span>{usingFallback ? "備援資料" : loading ? "匯率載入中…" : "交易日更新"}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          aria-label="資料來源"
          onClick={() => setSourcesOpen(true)}
          className="rounded font-semibold text-v2-lake underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
        >
          資料來源
        </button>
      </div>

      <CurrencySourceSheet
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        dataDate={dataDate}
        usingFallback={usingFallback}
        ratesError={ratesError}
        loading={loading}
        onRefresh={onRefresh}
      />

      <div className="h-8" aria-hidden="true" />
    </div>
  )
}
