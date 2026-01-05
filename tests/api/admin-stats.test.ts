import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    advertisement: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    adAnalytics: {
      aggregate: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"
import { GET } from "@/app/api/admin/stats/route"

describe("Admin Stats API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/admin/stats", () => {
    it("should return dashboard statistics", async () => {
      vi.mocked(prisma.advertisement.count)
        .mockResolvedValueOnce(10) // totalAds
        .mockResolvedValueOnce(5)  // activeAds

      vi.mocked(prisma.advertisement.aggregate).mockResolvedValue({
        _sum: {
          totalImpressions: 1000,
          totalClicks: 100,
        },
      } as never)

      vi.mocked(prisma.adAnalytics.aggregate).mockResolvedValue({
        _sum: {
          impressions: 50,
          clicks: 10,
        },
      } as never)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        totalAds: 10,
        activeAds: 5,
        totalImpressions: 1000,
        totalClicks: 100,
        todayImpressions: 50,
        todayClicks: 10,
      })
    })

    it("should handle null sums with default 0", async () => {
      vi.mocked(prisma.advertisement.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      vi.mocked(prisma.advertisement.aggregate).mockResolvedValue({
        _sum: {
          totalImpressions: null,
          totalClicks: null,
        },
      } as never)

      vi.mocked(prisma.adAnalytics.aggregate).mockResolvedValue({
        _sum: {
          impressions: null,
          clicks: null,
        },
      } as never)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        totalAds: 0,
        activeAds: 0,
        totalImpressions: 0,
        totalClicks: 0,
        todayImpressions: 0,
        todayClicks: 0,
      })
    })

    it("should return 500 on database error", async () => {
      vi.mocked(prisma.advertisement.count).mockRejectedValue(new Error("DB error"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("獲取統計數據失敗")

      consoleError.mockRestore()
    })

    it("should query with correct filters", async () => {
      vi.mocked(prisma.advertisement.count)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)

      vi.mocked(prisma.advertisement.aggregate).mockResolvedValue({
        _sum: { totalImpressions: 0, totalClicks: 0 },
      } as never)

      vi.mocked(prisma.adAnalytics.aggregate).mockResolvedValue({
        _sum: { impressions: 0, clicks: 0 },
      } as never)

      await GET()

      // Check total ads query
      expect(prisma.advertisement.count).toHaveBeenNthCalledWith(1, {
        where: { deletedAt: null },
      })

      // Check active ads query
      expect(prisma.advertisement.count).toHaveBeenNthCalledWith(2, {
        where: { status: "active", deletedAt: null },
      })

      // Check aggregate query
      expect(prisma.advertisement.aggregate).toHaveBeenCalledWith({
        where: { deletedAt: null },
        _sum: {
          totalImpressions: true,
          totalClicks: true,
        },
      })

      // Check today analytics query uses date filter
      expect(prisma.adAnalytics.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      )
    })
  })
})
