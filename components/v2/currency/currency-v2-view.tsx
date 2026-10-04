"use client"

import { ArrowRightLeft, ChevronDown, Clock } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { V2CurrencyField } from "@/components/v2/ui/currency-field"
import { formatCurrency } from "@/lib/constants/currencies"
import { cn } from "@/lib/utils"
import { formatRelativeTime, isRatesStale } from "./format"

export interface CustomRateRow {
  currency: string
  customRate: number
  liveRate: number
  diff: number
}

export interface CurrencyV2ViewProps {
  projectId: string
  projectCurrency: string
  fromCurrency: string
  toCurrency: string
  amount: string
  convertedAmount: number | null
  rate: number
  ratesTimestamp: number | null
  usingFallback: boolean
  customRates: CustomRateRow[]
  liveRates: { currency: string; rate: number }[]
  historicalDate: string
  historicalRates: { currency: string; rate: number; diff: number }[]
  loading: boolean
  loadingHistorical: boolean
  showRates: boolean
  showHistorical: boolean
  onAmount: (v: string) => void
  onFrom: (c: string) => void
  onTo: (c: string) => void
  onSwap: () => void
  onToggleRates: () => void
  onToggleHistorical: () => void
  onHistoricalDate: (d: string) => void
  onQueryHistorical: () => void
  onRefresh: () => void
}

function formatRate(rate: number): string {
  return String(Number(rate.toFixed(4)))
}

function diffClass(diff: number): string {
  return diff >= 0 ? "text-v2-link" : "text-v2-danger-strong"
}

function signed(diff: number): string {
  return `${diff >= 0 ? "+" : "-"}${Math.abs(diff).toFixed(1)}%`
}

export function CurrencyV2View(props: CurrencyV2ViewProps) {
  const {
    projectCurrency,
    fromCurrency,
    toCurrency,
    amount,
    convertedAmount,
    rate,
    ratesTimestamp,
    customRates,
    liveRates,
    historicalDate,
    historicalRates,
    loadingHistorical,
    showRates,
    showHistorical,
    onAmount,
    onFrom,
    onTo,
    onSwap,
    onToggleRates,
    onToggleHistorical,
    onHistoricalDate,
    onQueryHistorical,
    onRefresh,
  } = props

  const stale = isRatesStale(ratesTimestamp)

  return (
    <div className="min-h-screen">
      <V2TopBar
        title="匯率"
        backHref={`/projects/${props.projectId}`}
        titleClassName="text-[17px] font-semibold"
        actions={
          <button type="button" aria-label="重新整理" onClick={onRefresh} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink">
            <Clock className="h-[15px] w-[15px]" />
          </button>
        }
      />

      <div className="mx-4 mt-3.5 overflow-hidden rounded-[20px] bg-v2-lake p-[18px] px-5 text-v2-paper">
        <p className="mb-3 text-[13px] font-semibold opacity-85">匯率換算</p>
        <p className="mb-1 text-[11px] opacity-70">金額</p>
        <input
          aria-label="金額"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="mb-3.5 w-full rounded-[12px] border border-v2-paper/30 bg-v2-paper/10 px-3.5 py-3 font-v2-serif text-xl font-bold text-v2-paper outline-none"
        />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <V2CurrencyField value={fromCurrency} onChange={onFrom} short />
          <button type="button" aria-label="交換幣別" onClick={onSwap} className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-v2-paper text-v2-lake">
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
          <V2CurrencyField value={toCurrency} onChange={onTo} short />
        </div>
        <p data-testid="currency-result" className="mt-3.5 font-v2-serif text-[32px] font-bold leading-10">
          {convertedAmount !== null ? formatCurrency(convertedAmount, toCurrency) : "-"}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] opacity-75">
          <Clock className="h-[11px] w-[11px]" />
          <span>
            更新於 {ratesTimestamp ? formatRelativeTime(ratesTimestamp) : "未知"} · 1 {fromCurrency} = {formatRate(rate)} {toCurrency}
          </span>
        </div>
      </div>

      {customRates.length > 0 ? (
        <div className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">
          <p className="mb-2.5 text-[13px] font-bold text-v2-lake">專案自訂匯率</p>
          {customRates.map((row) => (
            <div key={row.currency} className="flex items-center justify-between border-b border-v2-line-soft py-2 last:border-0">
              <span className="text-[13px] font-semibold">
                {row.currency} → {projectCurrency}
              </span>
              <div className="text-right">
                <p className="m-0 text-[13px] font-bold">{formatRate(row.customRate)}（自訂）</p>
                <p className={cn("m-0 text-[11px]", diffClass(row.diff))}>
                  即時 {formatRate(row.liveRate)} · {signed(row.diff)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface">
        <button type="button" onClick={onToggleRates} className="flex w-full items-center gap-2 p-4 text-left">
          <span className="flex-1 text-[13px] font-bold text-v2-lake">即時匯率</span>
          <ChevronDown className={cn("h-3 w-3 text-v2-ink-subtle transition-transform", showRates && "rotate-180")} />
        </button>
        {showRates ? (
          <div className="px-4 pb-4">
            {stale ? (
              <div className="mb-2.5 flex items-center gap-1.5 rounded-[10px] border border-v2-danger-border bg-v2-danger-tint px-2.5 py-2 text-[11px] text-v2-danger-strong">
                部分匯率已超過24小時未更新
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              {liveRates.map((item) => (
                <div key={item.currency} className="rounded-[10px] bg-v2-lake-soft p-2.5 text-center">
                  <p className="m-0 text-[11px] text-v2-ink-muted">{item.currency}</p>
                  <p className="m-0 mt-0.5 font-v2-serif text-[14px] font-bold">{formatRate(item.rate)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface">
        <button type="button" onClick={onToggleHistorical} className="flex w-full items-center gap-2 p-4 text-left">
          <span className="flex-1 text-[13px] font-bold text-v2-lake">歷史匯率查詢</span>
          <ChevronDown className={cn("h-3 w-3 text-v2-ink-subtle transition-transform", showHistorical && "rotate-180")} />
        </button>
        {showHistorical ? (
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="歷史日期"
                max={new Date().toISOString().split("T")[0]}
                value={historicalDate}
                onChange={(e) => onHistoricalDate(e.target.value)}
                className="flex-1 rounded-[10px] border border-v2-line bg-v2-paper px-3 py-2.5 text-[13px] text-v2-ink-muted"
              />
              <button type="button" onClick={onQueryHistorical} disabled={loadingHistorical} className="rounded-[10px] bg-v2-lake px-4 text-[13px] font-bold text-v2-paper disabled:opacity-50">
                {loadingHistorical ? "載入中..." : "查詢"}
              </button>
            </div>
            {historicalRates.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {historicalRates.map((item) => (
                  <div key={item.currency} className="rounded-[10px] bg-v2-lake-soft p-2.5 text-center">
                    <p className="m-0 text-[11px] text-v2-ink-muted">{item.currency}</p>
                    <p className="m-0 mt-0.5 font-v2-serif text-[14px] font-bold">{formatRate(item.rate)}</p>
                    <p className={cn("m-0 text-[10px]", diffClass(item.diff))}>{signed(item.diff)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
