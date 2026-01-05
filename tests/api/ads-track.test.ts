import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    advertisement: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adAnalytics: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { POST } from "@/app/api/ads/track/route"
import { prisma } from "@/lib/db"

const mockAd = {
  id: "ad-123",
  deletedAt: null,
}

describe("POST /api/ads/track", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 400 if adId is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ event: "impression" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("缺少必要參數")
  })

  it("should return 400 if event is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("缺少必要參數")
  })

  it("should return 400 if event is invalid", async () => {
    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "invalid" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的事件類型")
  })

  it("should return 404 if ad does not exist", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "impression" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("廣告不存在")
  })

  it("should return 404 if ad is deleted", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue({
      ...mockAd,
      deletedAt: new Date(),
    } as never)

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "impression" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("廣告不存在")
  })

  it("should track impression event successfully", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue(mockAd as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "impression" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("should track click event successfully", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue(mockAd as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "click" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("should track with userId", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue(mockAd as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "impression", userId: "user-123" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)

    expect(response.status).toBe(204)
  })

  it("should handle text/plain content type (sendBeacon)", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue(mockAd as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "click" }),
      headers: { "Content-Type": "text/plain" },
    })
    const response = await POST(req)

    expect(response.status).toBe(204)
  })

  it("should return 204 on database error (silent failure)", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "impression" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)

    expect(response.status).toBe(204)
  })

  it("should return 204 on transaction error (silent failure)", async () => {
    vi.mocked(prisma.advertisement.findUnique).mockResolvedValue(mockAd as never)
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Transaction Error"))

    const req = new NextRequest("http://localhost:3000/api/ads/track", {
      method: "POST",
      body: JSON.stringify({ adId: "ad-123", event: "click" }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(req)

    expect(response.status).toBe(204)
  })
})
