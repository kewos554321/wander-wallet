import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET, POST } from "@/app/api/projects/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

const mockUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  lineUserId: "line-user-123",
  image: null,
}

const mockProject = {
  id: "project-123",
  name: "Test Project",
  description: "Test Description",
  createdBy: "user-123",
  startDate: null,
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  members: [],
  expenses: [{ amount: 100 }, { amount: 200 }], // 用於計算 totalAmount
  creator: { id: "user-123", name: "Test User", email: "test@example.com" },
  _count: { members: 0 },
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return user projects when authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findMany).mockResolvedValue([mockProject] as never)

    const req = new NextRequest("http://localhost:3000/api/projects")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe("Test Project")
    expect(data[0].totalAmount).toBe(300) // 100 + 200
    expect(data[0].expenses).toBeUndefined() // expenses 被移除
  })

  it("should return empty array when user has no projects", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    const req = new NextRequest("http://localhost:3000/api/projects")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })
})

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "New Project" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if project name is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案名稱必填")
  })

  it("should return 400 if project name is empty string", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案名稱必填")
  })

  it("should return 400 if end date is before start date", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Project",
        startDate: "2024-12-20",
        endDate: "2024-12-10",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("結束日期需晚於出發日期")
  })

  it("should create project successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "New Project",
        description: "Project description",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe("Test Project")
    expect(prisma.project.create).toHaveBeenCalled()
  })

  it("should create project with joinMode", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.project.create).mockResolvedValue({
      ...mockProject,
      joinMode: "claim_only",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "New Project",
        joinMode: "claim_only",
      }),
    })
    const response = await POST(req)
    await response.json()

    expect(response.status).toBe(201)
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          joinMode: "claim_only",
        }),
      })
    )
  })

  it("should default joinMode to 'both' when not specified", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "New Project",
      }),
    })
    await POST(req)

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          joinMode: "both",
        }),
      })
    )
  })

  it("should return 401 if user does not exist in database", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "New Project" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("用戶不存在")
    expect(data.requiresLogout).toBe(true)
  })

  it("should return 400 if start date is invalid", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test", startDate: "invalid-date" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的出發日期")
  })

  it("should return 400 if end date is invalid", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test", endDate: "invalid-date" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的結束日期")
  })

  it("should handle foreign key constraint error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.create).mockRejectedValue({ code: "P2003" })

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("用戶記錄不存在")
    expect(data.requiresLogout).toBe(true)
  })

  it("should handle database table missing error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.create).mockRejectedValue({ code: "P2022" })

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("資料庫表結構不完整")
  })

  it("should handle generic database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.create).mockRejectedValue(new Error("Unknown error"))

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("創建專案失敗")
  })

  it("should create project with currency", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.create).mockResolvedValue({
      ...mockProject,
      currency: "JPY",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Japan Trip", currency: "JPY" }),
    })
    const response = await POST(req)

    expect(response.status).toBe(201)
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "JPY",
        }),
      })
    )
  })

  it("should create project with budget", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.create).mockResolvedValue({
      ...mockProject,
      budget: 50000,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Trip", budget: 50000 }),
    })
    const response = await POST(req)

    expect(response.status).toBe(201)
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budget: 50000,
        }),
      })
    )
  })

  it("should handle GET database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findMany).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/projects")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取專案失敗")
  })
})
