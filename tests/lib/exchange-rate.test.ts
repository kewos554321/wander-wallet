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
    it("should fetch the latest rates from Frankfurter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2026-02-02", base: "USD", quote: "TWD", rate: 31.5 },
            { date: "2026-02-02", base: "USD", quote: "JPY", rate: 150 },
          ]),
      })

      const { getExchangeRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getExchangeRates()

      const url = String((mockFetch.mock.calls[0] as unknown[])[0])
      expect(url).toContain("api.frankfurter.dev/v2/rates")
      expect(url).toContain("base=USD")
      expect(result.base).toBe("USD")
      expect(result.rates).toHaveProperty("USD", 1)
      expect(result.rates).toHaveProperty("TWD", 31.5)
      expect(result.source).toBe("Frankfurter")
      expect(result.date).toBe("2026-02-02")
      expect(result.timestamp).toBe(new Date("2026-02-02T00:00:00Z").getTime())
      expect(result.isFallback).toBe(false)
    })

    it("should use cache when rates are fresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2026-02-02", base: "USD", quote: "TWD", rate: 31.5 },
          ]),
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
      expect(result.isFallback).toBe(true)
      expect(result.source).toBe("Frankfurter")
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

    it("should return fallback rates when the API returns an error payload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 422, message: "invalid currency" }),
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
    it("should fetch true historical rates from Frankfurter for the requested date", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2024-01-01", base: "USD", quote: "TWD", rate: 30.5 },
            { date: "2024-01-01", base: "USD", quote: "JPY", rate: 141.2 },
          ]),
      })

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getHistoricalRates("2024-01-01")

      const url = String((mockFetch.mock.calls[0] as unknown[])[0])
      expect(url).toContain("api.frankfurter.dev")
      expect(url).toContain("date=2024-01-01")
      expect(url).toContain("base=USD")
      expect(result.base).toBe("USD")
      expect(result.rates.USD).toBe(1)
      expect(result.rates.TWD).toBe(30.5)
      expect(result.rates.JPY).toBe(141.2)
      expect(result.timestamp).toBe(new Date("2024-01-01T00:00:00Z").getTime())
      expect(result.date).toBe("2024-01-01")
      expect(result.source).toBe("Frankfurter")
      expect(result.isFallback).toBe(false)
    })

    it("should report the date the provider actually returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2023-12-29", base: "USD", quote: "TWD", rate: 30.4 },
          ]),
      })

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getHistoricalRates("2024-01-01")

      expect(result.date).toBe("2023-12-29")
      expect(result.timestamp).toBe(new Date("2023-12-29T00:00:00Z").getTime())
    })

    it("should pass the requested base currency to Frankfurter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2024-01-01", base: "EUR", quote: "TWD", rate: 34.2 },
          ]),
      })

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getHistoricalRates("2024-01-01", "EUR")

      const url = String((mockFetch.mock.calls[0] as unknown[])[0])
      expect(url).toContain("base=EUR")
      expect(result.base).toBe("EUR")
      expect(result.rates.EUR).toBe(1)
      expect(result.rates.TWD).toBe(34.2)
    })

    it("should cache historical rates per date", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2024-01-01", base: "USD", quote: "TWD", rate: 30.5 },
          ]),
      })

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )

      await getHistoricalRates("2024-01-01")
      await getHistoricalRates("2024-01-01") // Should use cache

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should throw instead of pretending fallback rates are history", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { getHistoricalRates } = await import(
        "@/lib/services/exchange-rate"
      )

      await expect(getHistoricalRates("2024-01-01")).rejects.toThrow(
        "查不到該日期的匯率"
      )
    })
  })

  describe("getRateSeries", () => {
    it("should return sorted daily points for one pair", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2026-10-03", base: "USD", quote: "TWD", rate: 31.9 },
            { date: "2026-10-01", base: "USD", quote: "TWD", rate: 31.8 },
            { date: "2026-10-02", base: "USD", quote: "TWD", rate: 31.85 },
          ]),
      })

      const { getRateSeries } = await import(
        "@/lib/services/exchange-rate"
      )
      const result = await getRateSeries({
        start: "2026-10-01",
        end: "2026-10-03",
        base: "USD",
        quote: "TWD",
      })

      const url = String((mockFetch.mock.calls[0] as unknown[])[0])
      expect(url).toContain("api.frankfurter.dev/v2/rates")
      expect(url).toContain("from=2026-10-01")
      expect(url).toContain("to=2026-10-03")
      expect(url).toContain("base=USD")
      expect(url).toContain("quotes=TWD")
      expect(result).toEqual([
        { date: "2026-10-01", rate: 31.8 },
        { date: "2026-10-02", rate: 31.85 },
        { date: "2026-10-03", rate: 31.9 },
      ])
    })

    it("should cache a series by range and pair", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { date: "2026-10-01", base: "USD", quote: "TWD", rate: 31.8 },
          ]),
      })

      const { getRateSeries } = await import(
        "@/lib/services/exchange-rate"
      )
      await getRateSeries({
        start: "2026-10-01",
        end: "2026-10-03",
        base: "USD",
        quote: "TWD",
      })
      await getRateSeries({
        start: "2026-10-01",
        end: "2026-10-03",
        base: "USD",
        quote: "TWD",
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should throw instead of inventing a series on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { getRateSeries } = await import(
        "@/lib/services/exchange-rate"
      )

      await expect(
        getRateSeries({
          start: "2026-10-01",
          end: "2026-10-03",
          base: "USD",
          quote: "TWD",
        })
      ).rejects.toThrow("查不到趨勢資料")
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
          Promise.resolve([
            { date: "2024-01-01", base: "USD", quote: "TWD", rate: 32 },
            { date: "2024-01-01", base: "USD", quote: "JPY", rate: 150 },
          ]),
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
          Promise.resolve([
            { date: "2024-01-01", base: "USD", quote: "TWD", rate: 32 },
            { date: "2024-01-01", base: "USD", quote: "JPY", rate: 150 },
          ]),
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
          Promise.resolve([
            { date: "2024-01-01", base: "USD", quote: "TWD", rate: 32 },
          ]),
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
          Promise.resolve([
            { date: "2024-01-01", base: "USD", quote: "TWD", rate: 32 },
          ]),
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
