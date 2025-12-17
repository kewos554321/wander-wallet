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
    },
    projectMember: {
      create: vi.fn(),
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
  shareCode: "ABC123DEF456",
  createdBy: "owner-123",
  members: [],
}

const mockProjectWithMembers = {
  ...mockProject,
  members: [
    { id: "member-1", userId: "user-123", displayName: "Test User" },
  ],
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

  it("should return 401 if user does not exist in database", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("用戶不存在")
  })

  it("should return 400 if neither projectId nor shareCode is provided", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案 ID 或分享碼必填")
  })

  it("should return 404 if project does not exist (by projectId)", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "non-existent-project" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 404 if project does not exist (by shareCode)", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ shareCode: "INVALID123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 200 with alreadyMember if user is already a member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProjectWithMembers as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe("project-123")
    expect(data.alreadyMember).toBe(true)
  })

  it("should join project successfully using projectId", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({
      id: "new-member-id",
      projectId: "project-123",
      userId: "user-123",
      displayName: "Test User",
      role: "member",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe("project-123")
    expect(data.joined).toBe(true)
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project-123",
        userId: "user-123",
        displayName: "Test User",
        role: "member",
      }),
    })
  })

  it("should join project successfully using shareCode", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({
      id: "new-member-id",
      projectId: "project-123",
      userId: "user-123",
      displayName: "Test User",
      role: "member",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ shareCode: "abc123def456" }), // lowercase
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe("project-123")
    expect(data.joined).toBe(true)
    // 確認 shareCode 被轉換為大寫
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { shareCode: "ABC123DEF456" },
      include: { members: true },
    })
  })

  it("should use lineUserId prefix as displayName if user has no name", async () => {
    const userWithoutName = {
      ...mockUser,
      name: null,
      lineUserId: "U1234567890abcdef",
    }
    vi.mocked(getAuthUser).mockResolvedValue(userWithoutName)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithoutName as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({} as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123" }),
    })
    await POST(req)

    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: "U1234567", // 取前 8 個字元
      }),
    })
  })

  it("should prioritize projectId over shareCode if both provided", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({} as never)

    const req = new NextRequest("http://localhost:3000/api/projects/join", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-123", shareCode: "ABC123" }),
    })
    await POST(req)

    // 應該使用 projectId 查詢，而非 shareCode
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "project-123" },
      include: { members: true },
    })
  })
})
