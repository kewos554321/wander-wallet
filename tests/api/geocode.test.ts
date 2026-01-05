import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { GET } from "@/app/api/geocode/route"

describe("GET /api/geocode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("error handling", () => {
    it("should return 400 if no query or coordinates provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/geocode")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請提供搜尋關鍵字或座標")
    })

    it("should return 500 on fetch error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"))

      const req = new NextRequest("http://localhost:3000/api/geocode?q=tokyo")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("地理編碼服務暫時無法使用")
    })
  })

  describe("reverse geocoding (coordinates to address)", () => {
    it("should return address for valid coordinates", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            display_name: "東京都渋谷区道玄坂1-1-1",
            address: {
              city: "渋谷区",
              country: "日本",
            },
            lat: "35.6598",
            lon: "139.7004",
          }),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?lat=35.6598&lon=139.7004")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.displayName).toBe("東京都渋谷区道玄坂1-1-1")
      expect(data.lat).toBe(35.6598)
      expect(data.lon).toBe(139.7004)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("reverse"),
        expect.any(Object)
      )
    })

    it("should return error status from Nominatim", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?lat=35.6598&lon=139.7004")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe("無法取得地址")
    })

    it("should return 404 when Nominatim returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: "Unable to geocode" }),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?lat=0&lon=0")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Unable to geocode")
    })
  })

  describe("forward geocoding (search query to locations)", () => {
    it("should return search results for valid query", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              display_name: "東京駅",
              lat: "35.6812",
              lon: "139.7671",
              address: { station: "東京駅" },
              type: "station",
              class: "railway",
            },
            {
              display_name: "東京タワー",
              lat: "35.6586",
              lon: "139.7454",
              address: { tourism: "東京タワー" },
              type: "attraction",
              class: "tourism",
            },
          ]),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?q=東京")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].displayName).toBe("東京駅")
      expect(data[0].lat).toBe(35.6812)
      expect(data[0].lon).toBe(139.7671)
      expect(data[0].type).toBe("station")
      expect(data[0].class).toBe("railway")
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search"),
        expect.any(Object)
      )
    })

    it("should encode search query properly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?q=café%20paris")
      await GET(req)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("caf"),
        expect.any(Object)
      )
    })

    it("should return error status from Nominatim search", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?q=tokyo")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe("搜尋失敗")
    })

    it("should return empty array for no results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?q=xyznonexistent")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe("request headers", () => {
    it("should send proper User-Agent header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?q=test")
      await GET(req)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "WanderWallet/1.0",
          }),
        })
      )
    })

    it("should send Accept-Language header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const req = new NextRequest("http://localhost:3000/api/geocode?q=test")
      await GET(req)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
          }),
        })
      )
    })
  })
})
