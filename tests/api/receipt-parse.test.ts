import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock receipt parser
vi.mock("@/lib/ai/receipt-parser", () => ({
  parseReceipt: vi.fn(),
}))

import { POST } from "@/app/api/receipt/parse/route"
import { getAuthUser } from "@/lib/auth"
import { parseReceipt } from "@/lib/ai/receipt-parser"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

const mockParseResult = {
  amount: 1250,
  description: "全聯福利中心",
  category: "shopping",
  date: "2024-12-01",
  confidence: 0.9,
}

describe("POST /api/receipt/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "data:image/jpeg;base64,abc123",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if imageData is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請提供圖片資料")
  })

  it("should return 400 if imageData is whitespace", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "   ",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請提供圖片資料")
  })

  it("should return 400 if imageData is not a data URL", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "https://example.com/image.jpg",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請提供有效的圖片格式")
  })

  it("should return 400 if imageData is not an image data URL", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "data:application/pdf;base64,abc123",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請提供有效的圖片格式")
  })

  it("should parse receipt successfully with JPEG", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseReceipt).mockResolvedValue(mockParseResult)

    const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({ imageData }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockParseResult)
    expect(parseReceipt).toHaveBeenCalledWith(imageData)
  })

  it("should parse receipt successfully with PNG", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseReceipt).mockResolvedValue(mockParseResult)

    const imageData = "data:image/png;base64,iVBORw0KGgo="
    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({ imageData }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it("should return 500 on parse error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseReceipt).mockRejectedValue(new Error("Vision API failed"))

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "data:image/jpeg;base64,abc123",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Vision API failed")
  })

  it("should return generic error for non-Error exceptions", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseReceipt).mockRejectedValue("Unknown error")

    const req = new NextRequest("http://localhost:3000/api/receipt/parse", {
      method: "POST",
      body: JSON.stringify({
        imageData: "data:image/jpeg;base64,abc123",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("解析失敗，請重試")
  })
})
