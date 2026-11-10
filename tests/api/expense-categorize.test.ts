import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

vi.mock("@/lib/ai/category-classifier", () => ({
  classifyExpenseCategory: vi.fn(),
}))

import { POST } from "@/app/api/expenses/categorize/route"
import { getAuthUser } from "@/lib/auth"
import { classifyExpenseCategory } from "@/lib/ai/category-classifier"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/expenses/categorize", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/expenses/categorize", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const response = await POST(makeRequest({ description: "計程車" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "未授權" })
    expect(classifyExpenseCategory).not.toHaveBeenCalled()
  })

  it("returns 400 for an empty description", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const response = await POST(makeRequest({ description: "   " }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "請提供描述" })
    expect(classifyExpenseCategory).not.toHaveBeenCalled()
  })

  it("returns 400 when the description is too long", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const response = await POST(makeRequest({ description: "一".repeat(201) }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "描述過長" })
    expect(classifyExpenseCategory).not.toHaveBeenCalled()
  })

  it("returns the classification for a valid description", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(classifyExpenseCategory).mockResolvedValue({ category: "transport", confidence: 0.82 })

    const response = await POST(makeRequest({ description: "  計程車  " }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { category: "transport", confidence: 0.82 },
    })
    expect(classifyExpenseCategory).toHaveBeenCalledWith("計程車")
  })

  it("returns 500 when classification fails", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(classifyExpenseCategory).mockRejectedValue(new Error("模型錯誤"))

    const response = await POST(makeRequest({ description: "計程車" }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "模型錯誤" })
  })
})
