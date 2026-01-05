import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    adPlacement: {
      findFirst: vi.fn(),
    },
  },
}))

import { GET } from "@/app/api/ads/route"
import { prisma } from "@/lib/db"

const mockAd = {
  id: "ad-123",
  title: "測試廣告",
  description: "這是一個測試廣告",
  imageUrl: "https://example.com/ad.jpg",
  targetUrl: "https://example.com",
  type: "banner",
  status: "active",
  priority: 10,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-12-31"),
}

const mockAdPlacement = {
  id: "placement-123",
  placement: "home",
  position: 1,
  isActive: true,
  advertisement: mockAd,
}

describe("GET /api/ads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return null ad if placement is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ads")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ad).toBeNull()
    expect(data.placement).toBe("unknown")
  })

  it("should return null ad if placement is invalid", async () => {
    const req = new NextRequest("http://localhost:3000/api/ads?placement=invalid")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ad).toBeNull()
    expect(data.placement).toBe("invalid")
  })

  it("should return null ad when no ad found", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/ads?placement=home")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ad).toBeNull()
    expect(data.placement).toBe("home")
  })

  it("should return ad for home placement", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockResolvedValue(mockAdPlacement as never)

    const req = new NextRequest("http://localhost:3000/api/ads?placement=home")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ad.id).toBe("ad-123")
    expect(data.ad.title).toBe("測試廣告")
    expect(data.placement).toBe("home")
  })

  it("should return ad for project-list placement", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockResolvedValue({
      ...mockAdPlacement,
      placement: "project-list",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/ads?placement=project-list")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.placement).toBe("project-list")
  })

  it("should return ad for expense-list placement", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockResolvedValue({
      ...mockAdPlacement,
      placement: "expense-list",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/ads?placement=expense-list")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.placement).toBe("expense-list")
  })

  it("should return ad for settle placement", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockResolvedValue({
      ...mockAdPlacement,
      placement: "settle",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/ads?placement=settle")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.placement).toBe("settle")
  })

  it("should handle ad without dates", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockResolvedValue({
      ...mockAdPlacement,
      advertisement: { ...mockAd, startDate: null, endDate: null },
    } as never)

    const req = new NextRequest("http://localhost:3000/api/ads?placement=home")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ad.startDate).toBeNull()
    expect(data.ad.endDate).toBeNull()
  })

  it("should handle database error", async () => {
    vi.mocked(prisma.adPlacement.findFirst).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/ads?placement=home")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取廣告失敗")
  })
})
