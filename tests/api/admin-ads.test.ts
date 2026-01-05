import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    advertisement: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    admin: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"
import { GET, POST } from "@/app/api/admin/ads/route"

describe("Admin Ads API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/admin/ads", () => {
    it("should return ads list", async () => {
      const mockAds = [
        {
          id: "ad-1",
          title: "Test Ad",
          targetUrl: "https://example.com",
          type: "banner",
          status: "active",
          placements: [],
        },
      ]

      vi.mocked(prisma.advertisement.findMany).mockResolvedValue(mockAds as never)

      const req = new NextRequest("http://localhost:3000/api/admin/ads")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAds)
    })

    it("should filter by status", async () => {
      vi.mocked(prisma.advertisement.findMany).mockResolvedValue([] as never)

      const req = new NextRequest("http://localhost:3000/api/admin/ads?status=active")
      await GET(req)

      expect(prisma.advertisement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "active",
          }),
        })
      )
    })

    it("should filter by type", async () => {
      vi.mocked(prisma.advertisement.findMany).mockResolvedValue([] as never)

      const req = new NextRequest("http://localhost:3000/api/admin/ads?type=popup")
      await GET(req)

      expect(prisma.advertisement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "popup",
          }),
        })
      )
    })

    it("should return 500 on database error", async () => {
      vi.mocked(prisma.advertisement.findMany).mockRejectedValue(new Error("DB error"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      const req = new NextRequest("http://localhost:3000/api/admin/ads")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("獲取廣告列表失敗")

      consoleError.mockRestore()
    })
  })

  describe("POST /api/admin/ads", () => {
    it("should create a new ad", async () => {
      const mockAdmin = { id: "admin-1", email: "admin@test.com", isActive: true }
      const mockAd = {
        id: "ad-1",
        title: "New Ad",
        targetUrl: "https://example.com",
        type: "banner",
        status: "draft",
        placements: [{ placement: "dashboard" }],
      }

      vi.mocked(prisma.admin.findFirst).mockResolvedValue(mockAdmin as never)
      vi.mocked(prisma.advertisement.create).mockResolvedValue(mockAd as never)

      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "New Ad",
          targetUrl: "https://example.com",
          placements: ["dashboard"],
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.title).toBe("New Ad")
    })

    it("should return 400 if title is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.com",
          placements: ["dashboard"],
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請輸入廣告標題")
    })

    it("should return 400 if title is empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "   ",
          targetUrl: "https://example.com",
          placements: ["dashboard"],
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請輸入廣告標題")
    })

    it("should return 400 if targetUrl is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Ad",
          placements: ["dashboard"],
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請輸入目標連結")
    })

    it("should return 400 if placements are empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Ad",
          targetUrl: "https://example.com",
          placements: [],
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請選擇至少一個投放版位")
    })

    it("should return 400 if placements are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Ad",
          targetUrl: "https://example.com",
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("請選擇至少一個投放版位")
    })

    it("should create default admin if none exists", async () => {
      const mockNewAdmin = { id: "admin-new", email: "admin@wanderwallet.app", isActive: true }
      const mockAd = { id: "ad-1", title: "Ad" }

      vi.mocked(prisma.admin.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.admin.create).mockResolvedValue(mockNewAdmin as never)
      vi.mocked(prisma.advertisement.create).mockResolvedValue(mockAd as never)

      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Ad",
          targetUrl: "https://example.com",
          placements: ["dashboard"],
        }),
      })

      await POST(req)

      expect(prisma.admin.create).toHaveBeenCalled()
    })

    it("should return 500 on database error", async () => {
      vi.mocked(prisma.admin.findFirst).mockRejectedValue(new Error("DB error"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Ad",
          targetUrl: "https://example.com",
          placements: ["dashboard"],
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("建立廣告失敗")

      consoleError.mockRestore()
    })

    it("should pass all optional fields to create", async () => {
      const mockAdmin = { id: "admin-1" }
      const mockAd = { id: "ad-1" }

      vi.mocked(prisma.admin.findFirst).mockResolvedValue(mockAdmin as never)
      vi.mocked(prisma.advertisement.create).mockResolvedValue(mockAd as never)

      const req = new NextRequest("http://localhost:3000/api/admin/ads", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Ad",
          description: "Ad description",
          imageUrl: "https://example.com/image.jpg",
          targetUrl: "https://example.com",
          type: "popup",
          status: "active",
          priority: 5,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          placements: ["dashboard", "project_list"],
        }),
      })

      await POST(req)

      expect(prisma.advertisement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Test Ad",
            description: "Ad description",
            imageUrl: "https://example.com/image.jpg",
            targetUrl: "https://example.com",
            type: "popup",
            status: "active",
            priority: 5,
          }),
        })
      )
    })
  })
})
