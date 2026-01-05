import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  createSessionToken: vi.fn(),
  getLineProfile: vi.fn(),
}))

import { POST } from "@/app/api/auth/liff/route"
import { prisma } from "@/lib/db"
import { createSessionToken, getLineProfile } from "@/lib/auth"

const mockLineProfile = {
  userId: "U123456789",
  displayName: "LINE User",
  pictureUrl: "https://example.com/avatar.jpg",
}

const mockUser = {
  id: "user-123",
  lineUserId: "U123456789",
  name: "LINE User",
  image: "https://example.com/avatar.jpg",
}

describe("POST /api/auth/liff", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 400 for empty request body", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: "",
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Request body is empty")
  })

  it("should return 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: "not valid json",
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid JSON body")
  })

  it("should return 400 if accessToken is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Access token is required")
  })

  it("should return 401 if LINE profile is invalid", async () => {
    vi.mocked(getLineProfile).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: JSON.stringify({ accessToken: "invalid-token" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Invalid access token or failed to get LINE profile")
  })

  it("should create new user if not exists", async () => {
    vi.mocked(getLineProfile).mockResolvedValue(mockLineProfile)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never)
    vi.mocked(createSessionToken).mockResolvedValue("mock-session-token")

    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: JSON.stringify({ accessToken: "valid-token" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        lineUserId: mockLineProfile.userId,
        name: mockLineProfile.displayName,
        image: mockLineProfile.pictureUrl,
      },
    })
    expect(data.user.id).toBe("user-123")
    expect(data.sessionToken).toBe("mock-session-token")
  })

  it("should update existing user", async () => {
    vi.mocked(getLineProfile).mockResolvedValue(mockLineProfile)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never)
    vi.mocked(createSessionToken).mockResolvedValue("mock-session-token")

    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: JSON.stringify({ accessToken: "valid-token" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: {
        name: mockLineProfile.displayName,
        image: mockLineProfile.pictureUrl,
      },
    })
    expect(data.user.id).toBe("user-123")
  })

  it("should return 500 on error", async () => {
    vi.mocked(getLineProfile).mockRejectedValue(new Error("API error"))

    const req = new NextRequest("http://localhost:3000/api/auth/liff", {
      method: "POST",
      body: JSON.stringify({ accessToken: "valid-token" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Authentication failed")
  })
})
