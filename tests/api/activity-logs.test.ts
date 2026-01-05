import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    projectMember: {
      findFirst: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET } from "@/app/api/projects/[id]/activity-logs/route"
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

const mockLogs = [
  {
    id: "log-1",
    projectId: "project-123",
    actorMemberId: "member-123",
    entityType: "expense",
    entityId: "expense-123",
    action: "create",
    changes: null,
    metadata: null,
    createdAt: new Date(),
    actor: {
      id: "member-123",
      displayName: "Test User",
      user: { image: null },
    },
  },
]

const createParams = (id: string) => Promise.resolve({ id })

describe("GET /api/projects/[id]/activity-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs"
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
      "http://localhost:3000/api/projects/project-123/activity-logs"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return activity logs", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.logs).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(data.hasMore).toBe(false)
  })

  it("should support pagination with limit and offset", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)
    vi.mocked(prisma.activityLog.count).mockResolvedValue(100)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs?limit=10&offset=0"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.hasMore).toBe(true)
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 0,
      })
    )
  })

  it("should filter by entityType", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs?entityType=expense"
    )
    const response = await GET(req, { params: createParams("project-123") })

    expect(response.status).toBe(200)
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entityType: "expense",
        }),
      })
    )
  })

  it("should filter by action", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs?action=create"
    )
    const response = await GET(req, { params: createParams("project-123") })

    expect(response.status).toBe(200)
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: "create",
        }),
      })
    )
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取歷史紀錄失敗")
  })

  it("should order logs by createdAt desc", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/activity-logs"
    )
    await GET(req, { params: createParams("project-123") })

    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    )
  })
})
