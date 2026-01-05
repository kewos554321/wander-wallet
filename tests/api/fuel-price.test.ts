import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

import { GET } from "@/app/api/fuel-price/route"

describe("GET /api/fuel-price", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return fuel prices from API", async () => {
    const xmlResponse = `
      <root>
        <item>
          <產品名稱>92無鉛汽油</產品名稱>
          <參考牌價_金額>26.8</參考牌價_金額>
        </item>
        <item>
          <產品名稱>95無鉛汽油</產品名稱>
          <參考牌價_金額>28.3</參考牌價_金額>
        </item>
        <item>
          <產品名稱>98無鉛汽油</產品名稱>
          <參考牌價_金額>30.3</參考牌價_金額>
        </item>
      </root>
    `

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(xmlResponse),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.prices).toHaveLength(3)
    expect(data.source).toBe("中油")
    expect(data.updatedAt).toBeDefined()
  })

  it("should return prices sorted by grade (92, 95, 98)", async () => {
    const xmlResponse = `
      <root>
        <item>
          <產品名稱>98無鉛汽油</產品名稱>
          <參考牌價_金額>30.3</參考牌價_金額>
        </item>
        <item>
          <產品名稱>92無鉛汽油</產品名稱>
          <參考牌價_金額>26.8</參考牌價_金額>
        </item>
        <item>
          <產品名稱>95無鉛汽油</產品名稱>
          <參考牌價_金額>28.3</參考牌價_金額>
        </item>
      </root>
    `

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(xmlResponse),
    })

    const response = await GET()
    const data = await response.json()

    expect(data.prices[0].product).toBe("92無鉛汽油")
    expect(data.prices[1].product).toBe("95無鉛汽油")
    expect(data.prices[2].product).toBe("98無鉛汽油")
  })

  it("should filter out non-gasoline products", async () => {
    const xmlResponse = `
      <root>
        <item>
          <產品名稱>92無鉛汽油</產品名稱>
          <參考牌價_金額>26.8</參考牌價_金額>
        </item>
        <item>
          <產品名稱>超級柴油</產品名稱>
          <參考牌價_金額>25.0</參考牌價_金額>
        </item>
        <item>
          <產品名稱>液化石油氣</產品名稱>
          <參考牌價_金額>18.0</參考牌價_金額>
        </item>
      </root>
    `

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(xmlResponse),
    })

    const response = await GET()
    const data = await response.json()

    expect(data.prices).toHaveLength(1)
    expect(data.prices[0].product).toBe("92無鉛汽油")
  })

  it("should return fallback prices on API error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.source).toBe("預設值")
    expect(data.error).toBe("無法取得即時油價")
    expect(data.prices).toHaveLength(3)
    expect(data.prices[0].price).toBe(26.8)
    expect(data.prices[1].price).toBe(28.3)
    expect(data.prices[2].price).toBe(30.3)
  })

  it("should return fallback prices when API response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.source).toBe("預設值")
    expect(data.error).toBe("無法取得即時油價")
  })

  it("should include unit in price data", async () => {
    const xmlResponse = `
      <root>
        <item>
          <產品名稱>95無鉛汽油</產品名稱>
          <參考牌價_金額>28.3</參考牌價_金額>
        </item>
      </root>
    `

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(xmlResponse),
    })

    const response = await GET()
    const data = await response.json()

    expect(data.prices[0].unit).toBe("元/公升")
  })

  it("should handle empty XML response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("<root></root>"),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.prices).toEqual([])
  })
})
