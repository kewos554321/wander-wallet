import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    projectMember: {
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET, PUT } from "@/app/api/projects/[id]/memo/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

const mockMembership = {
  id: "member-123",
  projectId: "project-123",
  userId: "user-123",
  displayName: "Test User",
  role: "owner",
}

const createParams = (id: string) => Promise.resolve({ id })

describe("GET /api/projects/[id]/memo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 404 if project not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return memo content", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      memo: "Test memo content",
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.memo).toBe("Test memo content")
  })

  it("should return empty string if memo is null", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      memo: null,
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.memo).toBe("")
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取備忘錄失敗")
  })
})

describe("PUT /api/projects/[id]/memo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo",
      {
        method: "PUT",
        body: JSON.stringify({ memo: "New memo" }),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo",
      {
        method: "PUT",
        body: JSON.stringify({ memo: "New memo" }),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should update memo successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo",
      {
        method: "PUT",
        body: JSON.stringify({ memo: "Updated memo content" }),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.memo).toBe("Updated memo content")
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: "project-123" },
      data: { memo: "Updated memo content" },
    })
  })

  it("should clear memo when empty string provided", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo",
      {
        method: "PUT",
        body: JSON.stringify({ memo: "" }),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.memo).toBe("")
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: "project-123" },
      data: { memo: null },
    })
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/memo",
      {
        method: "PUT",
        body: JSON.stringify({ memo: "New memo" }),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("更新備忘錄失敗")
  })
})
