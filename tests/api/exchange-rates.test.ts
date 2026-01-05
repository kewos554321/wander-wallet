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
  convertCurrency: vi.fn(),
  isUsingFallbackRates: vi.fn(),
}))

import { GET } from "@/app/api/exchange-rates/route"
import { getAuthUser } from "@/lib/auth"
import {
  getExchangeRates,
  getHistoricalRates,
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
      timestamp: Date.now(),
    })

    const req = new NextRequest("http://localhost:3000/api/exchange-rates")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.base).toBe("USD")
    expect(data.rates).toHaveProperty("USD")
    expect(data.rates).toHaveProperty("TWD")
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
      timestamp: Date.now(),
    })

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?date=2024-01-01"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isHistorical).toBe(true)
    expect(getHistoricalRates).toHaveBeenCalledWith("2024-01-01", "USD")
  })

  it("should use custom base currency", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getExchangeRates).mockResolvedValue({
      base: "EUR",
      rates: { EUR: 1, USD: 1.1 },
      timestamp: Date.now(),
    })

    const req = new NextRequest(
      "http://localhost:3000/api/exchange-rates?base=EUR"
    )
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(getExchangeRates).toHaveBeenCalledWith("EUR")
  })

  it("should indicate when using fallback rates", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(getExchangeRates).mockResolvedValue({
      base: "USD",
      rates: { USD: 1 },
      timestamp: Date.now(),
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
