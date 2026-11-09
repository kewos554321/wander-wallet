import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock exchange rate service
vi.mock("@/lib/services/exchange-rate", () => ({
  getExchangeRates: vi.fn(),
  getHistoricalRates: vi.fn(),
  getRateSeries: vi.fn(),
  convertCurrency: vi.fn(),
  isUsingFallbackRates: vi.fn(),
}))

import { GET } from "@/app/api/exchange-rates/route"
import { getAuthUser } from "@/lib/auth"
import {
  getExchangeRates,
  getHistoricalRates,
  getRateSeries,
  convertCurrency,
  isUsingFallbackRates,
} from "@/lib/services/exchange-rate"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

describe("GET /api/exchange-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isUsingFallbackRates).mockReturnValue(false)
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/exchange-rates")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return all exchange rates", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getExchangeRates).mockResolvedValue({
      base: "USD",
      rates: { USD: 1, TWD: 32 },
      timestamp: 1770000000000,
      date: "2026-11-06",
      source: "Frankfurter",
      isFallback: false,
    })

    const req = new NextRequest("http://localhost:3000/api/exchange-rates")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.base).toBe("USD")
    expect(data.rates).toHaveProperty("USD")
    expect(data.rates).toHaveProperty("TWD")
    expect(data.source).toBe("Frankfurter")
    expect(data.date).toBe("2026-11-06")
    expect(data.updatedAt).toBe(1770000000000)
    expect(data.usingFallback).toBe(false)
  })

  it("should convert specific currencies when from/to provided", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(convertCurrency).mockResolvedValue({
      convertedAmount: 3200,
      exchangeRate: 32,
    })

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?from=USD&to=TWD&amount=100"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.from).toBe("USD")
    expect(data.to).toBe("TWD")
    expect(data.amount).toBe(100)
    expect(data.convertedAmount).toBe(3200)
    expect(data.exchangeRate).toBe(32)
  })

  it("should return 400 for invalid amount", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?from=USD&to=TWD&amount=invalid"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的金額")
  })

  it("should get historical rates when date provided", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getHistoricalRates).mockResolvedValue({
      base: "USD",
      rates: { USD: 1, TWD: 31 },
      timestamp: 1704067200000,
      date: "2024-01-01",
      source: "Frankfurter",
      isFallback: false,
    })

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?date=2024-01-01"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isHistorical).toBe(true)
    expect(data.source).toBe("Frankfurter")
    expect(data.date).toBe("2024-01-01")
    expect(data.updatedAt).toBe(1704067200000)
    expect(getHistoricalRates).toHaveBeenCalledWith("2024-01-01", "USD")
  })

  it("should return 502 when the historical provider fails", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getHistoricalRates).mockRejectedValue(
      Object.assign(new Error("查不到該日期的匯率"), {
        name: "HistoricalRateError",
      })
    )

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?date=2024-01-01"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe("查不到該日期的匯率")
  })

  it("should return a trend series", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getRateSeries).mockResolvedValue([
      { date: "2026-10-01", rate: 31.8 },
      { date: "2026-10-02", rate: 31.85 },
    ])

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?start=2026-10-01&end=2026-10-02&base=USD&quote=TWD"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.points).toHaveLength(2)
    expect(data.source).toBe("Frankfurter")
    expect(getRateSeries).toHaveBeenCalledWith({
      start: "2026-10-01",
      end: "2026-10-02",
      base: "USD",
      quote: "TWD",
    })
  })

  it("should reject malformed trend dates", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?start=10-01-2026&end=2026-10-02&quote=TWD"
    )
    const response = await GET(req)

    expect(response.status).toBe(400)
  })

  it("should reject a trend range longer than 366 days", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?start=2024-01-01&end=2026-01-01&quote=TWD"
    )
    const response = await GET(req)

    expect(response.status).toBe(400)
  })

  it("should return 502 when the trend provider fails", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getRateSeries).mockRejectedValue(
      Object.assign(new Error("查不到趨勢資料"), { name: "RateSeriesError" })
    )

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?start=2026-10-01&end=2026-10-02&quote=TWD"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe("查不到趨勢資料")
  })

  it("should use custom base currency", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getExchangeRates).mockResolvedValue({
      base: "EUR",
      rates: { EUR: 1, USD: 1.1 },
      timestamp: 1770000000000,
      date: "2026-11-06",
      source: "Frankfurter",
      isFallback: false,
    })

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?base=EUR"
    )
    const response = await GET(req)

    expect(response.status).toBe(200)
    expect(getExchangeRates).toHaveBeenCalledWith("EUR")
  })

  it("should indicate when using fallback rates", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getExchangeRates).mockResolvedValue({
      base: "USD",
      rates: { USD: 1 },
      timestamp: 1770000000000,
      date: "2026-11-06",
      source: "Frankfurter",
      isFallback: true,
    })
    vi.mocked(isUsingFallbackRates).mockReturnValue(true)

    const req = new NextRequest("http://localhost:3000/api/exchange-rates")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.usingFallback).toBe(true)
  })

  it("should return 500 on error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getExchangeRates).mockRejectedValue(new Error("Service error"))

    const req = new NextRequest("http://localhost:3000/api/exchange-rates")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("匯率查詢失敗")
  })

  it("should default amount to 1 for conversion", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(convertCurrency).mockResolvedValue({
      convertedAmount: 32,
      exchangeRate: 32,
    })

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?from=USD&to=TWD"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.amount).toBe(1)
    expect(convertCurrency).toHaveBeenCalledWith(1, "USD", "TWD")
  })
})
