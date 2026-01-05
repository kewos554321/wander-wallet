import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { useCurrencyConversion } from "@/lib/hooks/useCurrencyConversion"

// Mock authFetch
const mockAuthFetch = vi.fn()

vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
}))

describe("useCurrencyConversion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("convert", () => {
    it("should return same amount when currencies match", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32 } }),
      })

      const { result } = renderHook(() =>
        useCurrencyConversion({ projectCurrency: "TWD" })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.convert(100, "TWD")).toBe(100)
    })

    it("should convert using exchange rates", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32 } }),
      })

      const { result } = renderHook(() =>
        useCurrencyConversion({ projectCurrency: "TWD" })
      )

      await waitFor(() => expect(result.current.exchangeRates).not.toBeNull())

      // USD to TWD: 100 * (32/1) = 3200
      expect(result.current.convert(100, "USD")).toBe(3200)
    })

    it("should use custom rates when available", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32 } }),
      })

      const { result } = renderHook(() =>
        useCurrencyConversion({
          projectCurrency: "TWD",
          customRates: { USD: 30 }, // Custom rate: 1 USD = 30 TWD
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      // Should use custom rate: 100 * 30 = 3000
      expect(result.current.convert(100, "USD")).toBe(3000)
    })

    it("should round to 2 decimal places", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32.567 } }),
      })

      const { result } = renderHook(() =>
        useCurrencyConversion({ projectCurrency: "TWD" })
      )

      await waitFor(() => expect(result.current.exchangeRates).not.toBeNull())

      // 100 * 32.567 = 3256.7, rounded
      const converted = result.current.convert(100, "USD")
      expect(converted).toBe(3256.7)
    })
  })

  describe("getRate", () => {
    it("should return 1 when same currency", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32 } }),
      })

      const { result } = renderHook(() => useCurrencyConversion())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.getRate("USD", "USD")).toBe(1)
      expect(result.current.getRate("TWD", "TWD")).toBe(1)
    })

    it("should calculate correct rate between currencies", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32, JPY: 150 } }),
      })

      const { result } = renderHook(() => useCurrencyConversion())

      await waitFor(() => expect(result.current.exchangeRates).not.toBeNull())

      // USD to TWD: 32/1 = 32
      expect(result.current.getRate("USD", "TWD")).toBe(32)
      // TWD to USD: 1/32 = 0.03125
      expect(result.current.getRate("TWD", "USD")).toBeCloseTo(0.03125)
      // JPY to TWD: 32/150
      expect(result.current.getRate("JPY", "TWD")).toBeCloseTo(32 / 150)
    })

    it("should return 1 when exchange rates not loaded", () => {
      mockAuthFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() =>
        useCurrencyConversion({ autoFetch: false })
      )

      expect(result.current.getRate("USD", "TWD")).toBe(1)
    })
  })

  describe("autoFetch", () => {
    it("should fetch rates automatically when autoFetch is true", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1 } }),
      })

      renderHook(() => useCurrencyConversion({ autoFetch: true }))

      await waitFor(() => {
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/exchange-rates")
      })
    })

    it("should not fetch rates when autoFetch is false", () => {
      renderHook(() => useCurrencyConversion({ autoFetch: false }))

      expect(mockAuthFetch).not.toHaveBeenCalled()
    })
  })

  describe("refetch", () => {
    it("should refetch exchange rates", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { USD: 1, TWD: 32 } }),
      })

      const { result } = renderHook(() =>
        useCurrencyConversion({ autoFetch: false })
      )

      expect(mockAuthFetch).not.toHaveBeenCalled()

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockAuthFetch).toHaveBeenCalledWith("/api/exchange-rates")
      expect(result.current.exchangeRates).toEqual({ USD: 1, TWD: 32 })
    })
  })

  describe("usingFallback", () => {
    it("should set usingFallback when API returns fallback flag", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ rates: { USD: 1 }, usingFallback: true }),
      })

      const { result } = renderHook(() => useCurrencyConversion())

      await waitFor(() => expect(result.current.usingFallback).toBe(true))
    })

    it("should set usingFallback to false when not using fallback", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ rates: { USD: 1 }, usingFallback: false }),
      })

      const { result } = renderHook(() => useCurrencyConversion())

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.usingFallback).toBe(false)
    })
  })

  describe("error handling", () => {
    it("should handle fetch error gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockAuthFetch.mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() => useCurrencyConversion())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.exchangeRates).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it("should handle non-ok response", async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })

      const { result } = renderHook(() => useCurrencyConversion())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.exchangeRates).toBeNull()
    })
  })

  describe("loading state", () => {
    it("should set loading to true while fetching", async () => {
      let resolvePromise: (value: unknown) => void
      mockAuthFetch.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )

      const { result } = renderHook(() => useCurrencyConversion())

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ rates: {} }),
        })
      })

      await waitFor(() => expect(result.current.loading).toBe(false))
    })
  })
})
