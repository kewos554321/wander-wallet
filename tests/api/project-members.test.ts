import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    expense: {
      count: vi.fn(),
    },
    expenseParticipant: {
      count: vi.fn(),
    },
  },
}))

import { GET, POST, DELETE } from "@/app/api/projects/[id]/members/route"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

const mockUser = {
  id: "user-123",
  lineUserId: "line-123",
  name: "Test User",
  image: null,
}

const mockMembership = {
  id: "member-1",
  projectId: "project-123",
  userId: "user-123",
  displayName: "Test User",
  role: "owner",
}

const mockMembers = [
  {
    id: "member-1",
    projectId: "project-123",
    userId: "user-123",
    displayName: "Test User",
    role: "owner",
    user: { id: "user-123", name: "Test User", email: null, image: null },
  },
  {
    id: "member-2",
    projectId: "project-123",
    userId: null,
    displayName: "小明",
    role: "member",
    user: null,
  },
]

const createParams = (id: string) => Promise.resolve({ id })

describe("GET /api/projects/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members")
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members")
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return members list", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members")
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].displayName).toBe("Test User")
    expect(data[1].displayName).toBe("小明")
  })

  it("should handle database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members")
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取成員列表失敗")
  })
})

describe("POST /api/projects/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({ name: "新成員" }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({ name: "新成員" }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 400 if name is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("名稱必填")
  })

  it("should return 400 if name is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("名稱不能為空")
  })

  it("should create placeholder member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({
      id: "member-new",
      projectId: "project-123",
      userId: null,
      displayName: "新成員",
      role: "member",
      user: null,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({ name: "新成員" }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.displayName).toBe("新成員")
    expect(data.role).toBe("member")
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: {
        projectId: "project-123",
        displayName: "新成員",
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

  it("should trim whitespace from name", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue({
      id: "member-new",
      displayName: "新成員",
      role: "member",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({ name: "  新成員  " }),
    })
    await POST(req, { params: createParams("project-123") })

    expect(prisma.projectMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: "新成員",
        }),
      })
    )
  })

  it("should handle database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.create).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "POST",
      body: JSON.stringify({ name: "新成員" }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("新增成員失敗")
  })
})

describe("DELETE /api/projects/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if memberId is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({}),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("成員ID必填")
  })

  it("should return 404 if project not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 403 if not the project creator", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "other-user",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("只有創建者可以移除成員")
  })

  it("should return 404 if member not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-invalid" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("成員不存在")
  })

  it("should return 404 if member belongs to different project", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-2",
      projectId: "other-project",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("成員不存在")
  })

  it("should return 400 if trying to remove self", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-1",
      projectId: "project-123",
      userId: "user-123",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-1" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("不能移除自己")
  })

  it("should return 400 if member has paid expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-2",
      projectId: "project-123",
      userId: null,
    } as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(3)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(0)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("3 筆付款記錄")
  })

  it("should return 400 if member has participated expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-2",
      projectId: "project-123",
      userId: null,
    } as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(5)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("5 筆分擔記錄")
  })

  it("should return 400 if member has both paid and participated expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-2",
      projectId: "project-123",
      userId: null,
    } as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(2)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(4)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("2 筆付款記錄")
    expect(data.error).toContain("4 筆分擔記錄")
  })

  it("should delete member successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-2",
      projectId: "project-123",
      userId: null,
    } as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(0)
    vi.mocked(prisma.projectMember.delete).mockResolvedValue({} as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("成員已移除")
    expect(prisma.projectMember.delete).toHaveBeenCalledWith({
      where: { id: "member-2" },
    })
  })

  it("should handle database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members", {
      method: "DELETE",
      body: JSON.stringify({ memberId: "member-2" }),
    })
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("移除成員失敗")
  })
})
