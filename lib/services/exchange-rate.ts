interface ExchangeRates {
  base: string
  rates: Record<string, number>
  timestamp: number
}

// Cache rates for 1 hour
let cachedRates: ExchangeRates | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

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
    // Use exchangerate.host - free API, no key required
    const response = await fetch(
      `https://api.exchangerate.host/latest?base=${baseCurrency}`,
      { next: { revalidate: 3600 } } // Next.js cache for 1 hour
    )

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error("API returned unsuccessful response")
    }

    cachedRates = {
      base: data.base || baseCurrency,
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
