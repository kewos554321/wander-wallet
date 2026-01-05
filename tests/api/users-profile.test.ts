import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET, PUT } from "@/app/api/users/profile/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

const mockAuthUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

const mockDbUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  email: "test@example.com",
  image: null,
}

describe("GET /api/users/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/users/profile")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未登入")
  })

  it("should return 404 if user not found in database", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/users/profile")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("用戶不存在")
  })

  it("should return user profile", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser as never)

    const req = new NextRequest("http://localhost:3000/api/users/profile")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe("user-123")
    expect(data.name).toBe("Test User")
    expect(data.email).toBe("test@example.com")
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/users/profile")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取失敗")
  })
})

describe("PUT /api/users/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未登入")
  })

  it("should update user name", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockDbUser,
      name: "New Name",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe("New Name")
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { name: "New Name" },
      select: expect.any(Object),
    })
  })

  it("should update user image with URL", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockDbUser,
      image: "https://example.com/avatar.jpg",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ image: "https://example.com/avatar.jpg" }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { image: "https://example.com/avatar.jpg" },
      select: expect.any(Object),
    })
  })

  it("should update user image with avatar format", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockDbUser,
      image: "avatar:smile:blue",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ image: "avatar:smile:blue" }),
    })
    const response = await PUT(req)

    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { image: "avatar:smile:blue" },
      select: expect.any(Object),
    })
  })

  it("should return 400 for invalid image format", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ image: "invalid-image-format" }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的圖片格式")
  })

  it("should allow empty image to clear avatar", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockDbUser,
      image: "",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ image: "" }),
    })
    const response = await PUT(req)

    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { image: "" },
      select: expect.any(Object),
    })
  })

  it("should update both name and image", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockDbUser,
      name: "New Name",
      image: "https://example.com/avatar.jpg",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: "New Name",
        image: "https://example.com/avatar.jpg",
      }),
    })
    const response = await PUT(req)

    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: {
        name: "New Name",
        image: "https://example.com/avatar.jpg",
      },
      select: expect.any(Object),
    })
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAuthUser)
    vi.mocked(prisma.user.update).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("更新失敗")
  })
})
