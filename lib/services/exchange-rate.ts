export interface ExchangeRates {
  base: string
  rates: Record<string, number>
  /** Upstream data time (not the time this process fetched it). */
  timestamp: number
  /** The calendar date the data actually represents, YYYY-MM-DD. */
  date: string
  source: "Frankfurter"
  isFallback: boolean
}

/** Distinguishes "that date has no rate" from generic upstream failures. */
export class HistoricalRateError extends Error {
  constructor(message = "查不到該日期的匯率") {
    super(message)
    this.name = "HistoricalRateError"
  }
}

/** One point in a rate time series. */
export interface RatePoint {
  date: string
  rate: number
}

export class RateSeriesError extends Error {
  constructor(message = "查不到趨勢資料") {
    super(message)
    this.name = "RateSeriesError"
  }
}

// Cache latest rates per base currency for 1 hour.
const liveCache = new Map<string, { data: ExchangeRates; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// Historical rates cache (date -> rates)
const historicalCache = new Map<string, ExchangeRates>()

// Rate-series cache (start/end/base/quote -> points). Kept short so a range
// ending today can pick up a newly published point later in the day.
const seriesCache = new Map<string, { points: RatePoint[]; timestamp: number }>()
const SERIES_CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// Fallback static rates (USD as base, updated periodically)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  CAD: 1.36,
  TWD: 31.5,
  JPY: 149.5,
  KRW: 1320,
  CNY: 7.24,
  HKD: 7.82,
  SGD: 1.34,
  THB: 35.8,
  VND: 24500,
  MYR: 4.47,
  PHP: 56.5,
  IDR: 15800,
  INR: 83.5,
  NZD: 1.64,
  CHF: 0.88,
}

let usingFallback = false

export async function getExchangeRates(
  baseCurrency: string = "USD"
): Promise<ExchangeRates> {
  const now = Date.now()

  // Return cached rates if still valid.
  const cached = liveCache.get(baseCurrency)
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Frankfurter v2 serves both latest and historical rates without a key.
    // Response: [{ date, base, quote, rate }] — one row per quote.
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?base=${baseCurrency}`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = (await response.json()) as
      | { date?: unknown; quote?: unknown; rate?: unknown }[]
      | unknown

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Unexpected exchange rates payload")
    }

    const rates: Record<string, number> = { [baseCurrency]: 1 }
    let actualDate = new Date(now).toISOString().slice(0, 10)
    for (const row of data) {
      if (row && typeof row.date === "string") actualDate = row.date
      if (row && typeof row.quote === "string" && typeof row.rate === "number") {
        rates[row.quote] = row.rate
      }
    }

    const timestamp = new Date(`${actualDate}T00:00:00Z`).getTime()
    const result: ExchangeRates = {
      base: baseCurrency,
      rates,
      timestamp: Number.isNaN(timestamp) ? now : timestamp,
      date: actualDate,
      source: "Frankfurter",
      isFallback: false,
    }

    liveCache.set(baseCurrency, { data: result, timestamp: now })
    usingFallback = false

    return result
  } catch (error) {
    console.error("Exchange rate fetch error:", error)
    usingFallback = true
    return {
      base: "USD",
      rates: FALLBACK_RATES,
      timestamp: now,
      date: new Date(now).toISOString().slice(0, 10),
      source: "Frankfurter",
      isFallback: true,
    }
  }
}

// 獲取歷史匯率
export async function getHistoricalRates(
  date: string, // YYYY-MM-DD format
  baseCurrency: string = "USD"
): Promise<ExchangeRates> {
  // Check cache first
  const cacheKey = `${date}_${baseCurrency}`
  if (historicalCache.has(cacheKey)) {
    return historicalCache.get(cacheKey)!
  }

  try {
    // Frankfurter (v2) serves real historical rates and needs no API key.
    // Response: [{ date, base, quote, rate }] — one row per quote.
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?date=${date}&base=${baseCurrency}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )

    if (!response.ok) {
      throw new Error("Failed to fetch historical rates")
    }

    const data = (await response.json()) as
      | { date: string; base: string; quote: string; rate: number }[]
      | unknown

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Unexpected historical rates payload")
    }

    const rates: Record<string, number> = { [baseCurrency]: 1 }
    let actualDate = date
    for (const row of data as { date?: unknown; quote?: unknown; rate?: unknown }[]) {
      if (row && typeof row.date === "string") actualDate = row.date
      if (row && typeof row.quote === "string" && typeof row.rate === "number") {
        rates[row.quote] = row.rate
      }
    }

    const timestamp = new Date(`${actualDate}T00:00:00Z`).getTime()
    const result: ExchangeRates = {
      base: baseCurrency,
      rates,
      timestamp: Number.isNaN(timestamp) ? new Date(date).getTime() : timestamp,
      date: actualDate,
      source: "Frankfurter",
      isFallback: false,
    }

    // Cache historical data
    historicalCache.set(cacheKey, result)

    return result
  } catch (error) {
    console.error("Historical rate fetch error:", error)
    // Never masquerade today's static fallback as a historical observation.
    throw new HistoricalRateError()
  }
}

/**
 * Daily rate series for one pair. Frankfurter returns one row per date/quote;
 * weekends and holidays follow the provider's own calendar.
 */
export async function getRateSeries(input: {
  start: string
  end: string
  base: string
  quote: string
}): Promise<RatePoint[]> {
  const { start, end, base, quote } = input
  const cacheKey = `${start}_${end}_${base}_${quote}`
  const cached = seriesCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < SERIES_CACHE_DURATION) {
    return cached.points
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?from=${start}&to=${end}&base=${base}&quotes=${quote}`,
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch rate series")
    }

    const data = (await response.json()) as
      | { date?: unknown; rate?: unknown }[]
      | unknown

    if (!Array.isArray(data)) {
      throw new Error("Unexpected rate series payload")
    }

    const points: RatePoint[] = data
      .filter(
        (row): row is { date: string; rate: number } =>
          Boolean(row) &&
          typeof (row as { date?: unknown }).date === "string" &&
          typeof (row as { rate?: unknown }).rate === "number"
      )
      .map((row) => ({ date: row.date, rate: row.rate }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (points.length === 0) {
      throw new Error("Empty rate series")
    }

    seriesCache.set(cacheKey, { points, timestamp: Date.now() })
    return points
  } catch (error) {
    console.error("Rate series fetch error:", error)
    throw new RateSeriesError()
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; exchangeRate: number }> {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, exchangeRate: 1 }
  }

  const rates = await getExchangeRates("USD")

  // Convert via USD as intermediary
  const fromRate = rates.rates[fromCurrency] || 1
  const toRate = rates.rates[toCurrency] || 1

  const exchangeRate = toRate / fromRate
  const convertedAmount = Math.round(amount * exchangeRate * 100) / 100

  return { convertedAmount, exchangeRate }
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const result = await convertCurrency(1, fromCurrency, toCurrency)
  return result.exchangeRate
}

export function isUsingFallbackRates(): boolean {
  return usingFallback
}
