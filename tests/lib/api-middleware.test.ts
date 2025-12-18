import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    projectMember: {
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
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

import {
  withAuth,
  withProjectMember,
  withProjectCreator,
  requireProjectMember,
  requireProjectCreator,
  requireUserExists,
} from "@/lib/api-middleware"
import { ApiResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

const mockUser = {
  id: "user-123",
  lineUserId: "line-user-123",
  name: "Test User",
  image: null,
}

const mockMembership = {
  id: "member-123",
  projectId: "project-123",
  userId: "user-123",
  displayName: "Test User",
  role: "owner",
  createdAt: new Date(),
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
}

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call handler with user context when authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    const handler = vi.fn().mockResolvedValue(ApiResponse.success({ test: true }))
    const wrappedHandler = withAuth(handler)

    const req = new NextRequest("http://localhost:3000/api/test")
    const response = await wrappedHandler(req)

    expect(handler).toHaveBeenCalledWith({
      user: mockUser,
      req: expect.any(NextRequest),
    })
    expect(response.status).toBe(200)
  })

  it("should return 401 when no auth", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const handler = vi.fn()
    const wrappedHandler = withAuth(handler)

    const req = new NextRequest("http://localhost:3000/api/test")
    const response = await wrappedHandler(req)
    const json = await response.json()

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
    expect(json.error.message).toBe("未授權")
  })

  it("should pass original request to context", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    const handler = vi.fn().mockResolvedValue(ApiResponse.success({}))
    const wrappedHandler = withAuth(handler)

    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    await wrappedHandler(req)

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        req: expect.any(NextRequest),
      })
    )
  })
})

describe("requireProjectMember", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return membership when user is member", async () => {
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const result = await requireProjectMember("project-123", "user-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.member).toEqual(mockMembership)
    }
  })

  it("should return error response when user is not member", async () => {
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null as never)

    const result = await requireProjectMember("project-123", "user-123")

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.status).toBe(403)
    }
  })
})

describe("requireProjectCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return project and membership when user is creator", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const result = await requireProjectCreator("project-123", "user-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.project).toEqual(mockProject)
      expect(result.member).toEqual(mockMembership)
    }
  })

  it("should return 404 when project does not exist", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null as never)

    const result = await requireProjectCreator("project-123", "user-123")

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.status).toBe(404)
    }
  })

  it("should return 403 when user is not creator", async () => {
    const projectWithDifferentCreator = { ...mockProject, createdBy: "other-user" }
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithDifferentCreator as never)

    const result = await requireProjectCreator("project-123", "user-123")

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.status).toBe(403)
    }
  })

  it("should return 403 when user is creator but not member", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null as never)

    const result = await requireProjectCreator("project-123", "user-123")

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.status).toBe(403)
    }
  })
})

describe("withProjectMember", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call handler with project context when member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const handler = vi.fn().mockResolvedValue(ApiResponse.success({ test: true }))
    const wrappedHandler = withProjectMember(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })

    expect(handler).toHaveBeenCalledWith({
      user: mockUser,
      req: expect.any(NextRequest),
      projectId: "project-123",
      membership: mockMembership,
    })
    expect(response.status).toBe(200)
  })

  it("should return 401 when not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const handler = vi.fn()
    const wrappedHandler = withProjectMember(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
  })

  it("should return 403 when not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null as never)

    const handler = vi.fn()
    const wrappedHandler = withProjectMember(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })
    const json = await response.json()

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    expect(json.error.message).toBe("無權限訪問此專案")
  })

  it("should correctly extract projectId from params", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const handler = vi.fn().mockResolvedValue(ApiResponse.success({}))
    const wrappedHandler = withProjectMember(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/my-project-id")
    await wrappedHandler(req, {
      params: Promise.resolve({ id: "my-project-id" }),
    })

    expect(prisma.projectMember.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "my-project-id",
        userId: "user-123",
      },
    })
  })
})

describe("withProjectCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call handler with creator context when creator", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const handler = vi.fn().mockResolvedValue(ApiResponse.success({ test: true }))
    const wrappedHandler = withProjectCreator(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })

    expect(handler).toHaveBeenCalledWith({
      user: mockUser,
      req: expect.any(NextRequest),
      projectId: "project-123",
      membership: mockMembership,
      project: mockProject,
    })
    expect(response.status).toBe(200)
  })

  it("should return 401 when not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const handler = vi.fn()
    const wrappedHandler = withProjectCreator(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
  })

  it("should return 403 when member but not creator", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    const projectWithDifferentCreator = { ...mockProject, createdBy: "other-user" }
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithDifferentCreator as never)

    const handler = vi.fn()
    const wrappedHandler = withProjectCreator(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })
    const json = await response.json()

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    expect(json.error.message).toBe("只有創建者可以執行此操作")
  })

  it("should return 404 when project not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null as never)

    const handler = vi.fn()
    const wrappedHandler = withProjectCreator(handler)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await wrappedHandler(req, {
      params: Promise.resolve({ id: "project-123" }),
    })

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
  })
})

describe("requireUserExists", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return success when user exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const result = await requireUserExists("user-123")

    expect(result.success).toBe(true)
  })

  it("should return 401 error when user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never)

    const result = await requireUserExists("user-123")

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.status).toBe(401)
      const json = await result.error.json()
      expect(json.error.requiresLogout).toBe(true)
    }
  })
})
