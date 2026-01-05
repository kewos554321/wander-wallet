import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock expense parser
vi.mock("@/lib/ai/expense-parser", () => ({
  parseExpenses: vi.fn(),
}))

import { POST } from "@/app/api/voice/parse/route"
import { getAuthUser } from "@/lib/auth"
import { parseExpenses } from "@/lib/ai/expense-parser"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

const mockMembers = [
  { id: "member-1", displayName: "小明" },
  { id: "member-2", displayName: "小華" },
]

const mockParseResult = {
  expenses: [
    {
      amount: 350,
      description: "午餐拉麵",
      category: "food",
      payerName: "小明",
      participantNames: ["小明", "小華"],
    },
  ],
  confidence: 0.95,
}

describe("POST /api/voice/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: mockMembers,
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if transcript is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "",
        members: mockMembers,
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請輸入或說出消費內容")
  })

  it("should return 400 if transcript is whitespace only", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "   ",
        members: mockMembers,
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請輸入或說出消費內容")
  })

  it("should return 400 if members is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: [],
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案沒有成員")
  })

  it("should return 400 if members is undefined", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案沒有成員")
  })

  it("should parse transcript successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseExpenses).mockResolvedValue(mockParseResult)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: mockMembers,
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockParseResult)
    expect(parseExpenses).toHaveBeenCalledWith({
      transcript: "午餐花了350",
      members: mockMembers,
      currentUserName: "小明",
      defaultCurrency: undefined,
    })
  })

  it("should use default name if member not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseExpenses).mockResolvedValue(mockParseResult)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: mockMembers,
        currentUserMemberId: "unknown-member",
      }),
    })
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(parseExpenses).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserName: "我",
      })
    )
  })

  it("should pass defaultCurrency to parser", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseExpenses).mockResolvedValue(mockParseResult)

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: mockMembers,
        currentUserMemberId: "member-1",
        defaultCurrency: "JPY",
      }),
    })
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(parseExpenses).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultCurrency: "JPY",
      })
    )
  })

  it("should return 500 on parse error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseExpenses).mockRejectedValue(new Error("Parse failed"))

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: mockMembers,
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Parse failed")
  })

  it("should return generic error message for non-Error exceptions", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(parseExpenses).mockRejectedValue("string error")

    const req = new NextRequest("http://localhost:3000/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({
        transcript: "午餐花了350",
        members: mockMembers,
        currentUserMemberId: "member-1",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("解析失敗，請重試")
  })
})
