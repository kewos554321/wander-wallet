/** Relative time / staleness / rate helpers for the v2 currency screen. */

import { format, isSameDay } from "date-fns"
import { roundRateForDisplay } from "@/lib/currency-conversion"

export type RateChipTone = "market" | "custom"

export interface RateChip {
  /** Short label shown on the chip: 市場 / 自訂. */
  chip: string
  /** Colour family for the chip dot. */
  tone: RateChipTone
  /** Secondary hint: relative time, market date, or provenance. */
  context: string | null
}

/**
 * Describe a bound expense rate for the amount card. `market` rates read as
 * 市場 today and 市場 with the date once the day has passed, so a past "live"
 * rate ages into a dated one instead of lying. `custom` is stable. Returns null
 * when there is no bound rate.
 */
export function rateChip(input: {
  kind: "market" | "custom" | null | undefined
  date: Date | string | null | undefined
  now: Date
}): RateChip | null {
  const { kind, date, now } = input
  if (kind === "custom") return { chip: "自訂", tone: "custom", context: "手動輸入" }
  if (kind !== "market") return null
  const parsed = date ? new Date(date) : null
  if (parsed && isSameDay(parsed, now)) {
    return { chip: "市場", tone: "market", context: "今天" }
  }
  return { chip: "市場", tone: "market", context: parsed ? format(parsed, "M/d") : null }
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - timestamp) / 60_000)
  if (minutes < 1) return "剛剛"
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  return `${Math.floor(hours / 24)} 天前`
}

export function customRateDiff(customRate: number, liveRate: number): number {
  if (!liveRate) return 0
  return ((customRate - liveRate) / liveRate) * 100
}

export function rateFromRates(from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return 1
  const fromRate = rates[from] || 1
  const toRate = rates[to] || 1
  return toRate / fromRate
}

/**
 * Cross rate, or null when a leg is genuinely missing. Unlike `rateFromRates`,
 * this never turns absent data into a plausible-looking 1:1 rate.
 */
export function rateIfAvailable(
  from: string,
  to: string,
  rates: Record<string, number> | null | undefined
): number | null {
  if (from === to) return 1
  if (!rates) return null
  const fromRate = rates[from]
  const toRate = rates[to]
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate === 0) return null
  return toRate / fromRate
}

/** Percentage change from `baseline`, or null when either side is unknown. */
export function rateDiffPercent(value: number | null, baseline: number | null): number | null {
  if (value == null || baseline == null) return null
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) return null
  return ((value - baseline) / baseline) * 100
}

/** Rate display uses significant digits so VND and KRW both stay readable. */
export function formatRate(rate: number): string {
  return String(roundRateForDisplay(rate))
}

function parseRateDate(value: string | number): Date | null {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      return Number.isNaN(date.getTime()) ? null : date
    }
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Calendar date for a rate, e.g. 2026/11/6. */
export function formatRateDate(value: string | number | null): string | null {
  if (value == null) return null
  const date = parseRateDate(value)
  if (!date) return null
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

/** Local `YYYY-MM-DD` for date inputs; avoids UTC shifting the day. */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * The live rate 1 `from` = X `to`, rounded for display (6 significant digits),
 * or null when either leg is missing from `rates`.
 */
export function liveRateHint(rates: Record<string, number>, from: string, to: string): number | null {
  const fromRate = rates[from]
  const toRate = rates[to]
  if (!fromRate || !toRate) return null
  return roundRateForDisplay(toRate / fromRate)
}
