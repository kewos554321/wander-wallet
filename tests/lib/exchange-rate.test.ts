import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Need to reset modules to clear cached rates between tests
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("exchange-rate service", () => {
  describe("getExchangeRates", () => {
    it("should fetch exchange rates from API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 31.5, JPY: 150 },
          }),
      })

      const { getExchangeRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getExchangeRates()

      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("USD")
      expect(result.rates).toHaveProperty("TWD")
    })

    it("should use cache when rates are fresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 31.5 },
          }),
      })

      const { getExchangeRates } = await import(
        "@/lib/services/exchange-rate"
      )

      // First call - fetches from API
      await getExchangeRates()
      // Second call - should use cache
      await getExchangeRates()

      // Should only fetch once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should return fallback rates on API error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { getExchangeRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getExchangeRates()

      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("USD", 1)
      expect(result.rates).toHaveProperty("TWD")
    })

    it("should return fallback rates when API response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      const { getExchangeRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getExchangeRates()

      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("USD", 1)
    })

    it("should return fallback rates when API returns unsuccessful", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      const { getExchangeRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getExchangeRates()

      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("USD", 1)
    })
  })

  describe("getHistoricalRates", () => {
    it("should fetch historical rates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 30.5 },
          }),
      })

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getHistoricalRates("2024-01-01")

      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("TWD")
    })

    it("should cache historical rates", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 30.5 },
          }),
      })

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )

      await getHistoricalRates("2024-01-01")
      await getHistoricalRates("2024-01-01") // Should use cache

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should return fallback on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getHistoricalRates("2024-01-01")

      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("USD", 1)
    })
  })

  describe("convertCurrency", () => {
    it("should return same amount for same currency", async () => {
      const { convertCurrency } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await convertCurrency(100, "USD", "USD")

      expect(result.convertedAmount).toBe(100)
      expect(result.exchangeRate).toBe(1)
    })

    it("should convert between currencies", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 32, JPY: 150 },
          }),
      })

      const { convertCurrency } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await convertCurrency(100, "USD", "TWD")

      expect(result.convertedAmount).toBe(3200)
      expect(result.exchangeRate).toBe(32)
    })

    it("should handle conversion via USD intermediary", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 32, JPY: 150 },
          }),
      })

      const { convertCurrency } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await convertCurrency(150, "JPY", "TWD")

      // 150 JPY / 150 (JPY rate) * 32 (TWD rate) = 32 TWD
      expect(result.convertedAmount).toBe(32)
    })
  })

  describe("getExchangeRate", () => {
    it("should return exchange rate between currencies", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1, TWD: 32 },
          }),
      })

      const { getExchangeRate } = await import(
        "@/lib/services/exchange-rate"
      )
      const rate = await getExchangeRate("USD", "TWD")

      expect(rate).toBe(32)
    })
  })

  describe("isUsingFallbackRates", () => {
    it("should return false when API succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            base: "USD",
            rates: { USD: 1 },
          }),
      })

      const { getExchangeRates, isUsingFallbackRates } = await import(
        "@/lib/services/exchange-rate"
      )
      await getExchangeRates()

      expect(isUsingFallbackRates()).toBe(false)
    })

    it("should return true when using fallback", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { getExchangeRates, isUsingFallbackRates } = await import(
        "@/lib/services/exchange-rate"
      )
      await getExchangeRates()

      expect(isUsingFallbackRates()).toBe(true)
    })
  })
})
