import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { POST } from "@/app/api/projects/join/route"
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
  createdBy: "user-456",
}

const mockMember = {
  id: "member-123",
  projectId: "project-123",
  userId: "user-123",
  displayName: "Test User",
  role: "member",
  joinedAt: new Date(),
  user: {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
}

describe("POST /api/projects/join", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if projectId is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案 ID 必填")
  })

  it("should return 404 if project does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "non-existent" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 400 if user is already a member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMember as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("您已經是此專案的成員")
  })

  it("should return 404 if user does not exist in database", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("用戶不存在")
  })

  it("should create member and return 201 on success", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    } as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue(mockMember as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe("member-123")
    expect(data.displayName).toBe("Test User")
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: "project-123",
        userId: "user-123",
        displayName: "Test User",
        role: "member",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })
  })

  it("should use email prefix as displayName if name is null", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-123",
      name: null,
      email: "testuser@example.com",
    } as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({
      ...mockMember,
      displayName: "testuser",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)

    expect(response.status).toBe(201)
    expect(prisma.projectMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: "testuser",
        }),
      })
    )
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("加入專案失敗")
  })
})
