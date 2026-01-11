interface ExchangeRates {
  base: string
  rates: Record<string, number>
  timestamp: number
}

// Cache rates for 1 hour
let cachedRates: ExchangeRates | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// Historical rates cache (date -> rates)
const historicalCache = new Map<string, ExchangeRates>()

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

  // Return cached rates if still valid
  if (cachedRates && now - cacheTimestamp < CACHE_DURATION) {
    return cachedRates
  }

  try {
    // Use ExchangeRate-API - free, no key required, 160+ currencies
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${baseCurrency}`,
      { next: { revalidate: 3600 } } // Next.js cache for 1 hour
    )

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await response.json()

    if (data.result !== "success") {
      throw new Error("API returned error: " + data["error-type"])
    }

    // ExchangeRate-API format: { result, base_code, rates }
    cachedRates = {
      base: data.base_code || baseCurrency,
      rates: data.rates,
      timestamp: now,
    }
    cacheTimestamp = now
    usingFallback = false

    return cachedRates
  } catch (error) {
    console.error("Exchange rate fetch error:", error)
    usingFallback = true
    return { base: "USD", rates: FALLBACK_RATES, timestamp: now }
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
    // Note: Free tier doesn't support historical data, use current rates
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${baseCurrency}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )

    if (!response.ok) {
      throw new Error("Failed to fetch historical rates")
    }

    const data = await response.json()

    if (data.result !== "success") {
      throw new Error("API returned error: " + data["error-type"])
    }

    // ExchangeRate-API format: { result, base_code, rates }
    // Note: Free tier uses current rates for historical requests
    const result: ExchangeRates = {
      base: data.base_code || baseCurrency,
      rates: data.rates,
      timestamp: new Date(date).getTime(),
    }

    // Cache historical data
    historicalCache.set(cacheKey, result)

    return result
  } catch (error) {
    console.error("Historical rate fetch error:", error)
    return { base: "USD", rates: FALLBACK_RATES, timestamp: Date.now() }
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
