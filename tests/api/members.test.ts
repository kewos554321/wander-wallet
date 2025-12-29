import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    projectMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    expense: {
      count: vi.fn(),
    },
    expenseParticipant: {
      count: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET, POST, DELETE } from "@/app/api/projects/[id]/members/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

const mockUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  lineUserId: "line-user-123",
  image: null,
}

const mockMembership = {
  id: "member-123",
  projectId: "project-123",
  userId: "user-123",
  displayName: "Test User",
  role: "owner",
}

const mockProject = {
  id: "project-123",
  name: "Test Project",
  createdBy: "user-123",
}

const mockMember = {
  id: "member-456",
  projectId: "project-123",
  userId: "user-456",
  displayName: "Member 2",
  role: "member",
  user: {
    id: "user-456",
    name: "Member 2",
    email: "member2@example.com",
    image: null,
  },
}

// Helper to create params promise
const createParams = (id: string) => Promise.resolve({ id })

describe("GET /api/projects/[id]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return members list when user is a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      mockMembership,
      mockMember,
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members"
    )
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

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "POST",
        body: JSON.stringify({ name: "New Member" }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "POST",
        body: JSON.stringify({ name: "New Member" }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 400 if name is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("名稱必填")
  })

  it("should return 400 if name is empty string", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("名稱不能為空")
  })

  it("should create placeholder member successfully", async () => {
    const newMember = {
      id: "new-member-123",
      projectId: "project-123",
      displayName: "New Member",
      role: "member",
      user: null,
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.create).mockResolvedValue(newMember as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "POST",
        body: JSON.stringify({ name: "New Member" }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.displayName).toBe("New Member")
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "POST",
        body: JSON.stringify({ name: "New Member" }),
      }
    )
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

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if memberId is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({}),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("成員ID必填")
  })

  it("should return 404 if project does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 403 if user is not the project creator", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject,
      createdBy: "other-user",
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("只有創建者可以移除成員")
  })

  it("should return 404 if member does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "invalid-member" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("成員不存在")
  })

  it("should return 404 if member belongs to different project", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      ...mockMember,
      projectId: "other-project",
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("成員不存在")
  })

  it("should return 400 if trying to remove self", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: "member-123",
      projectId: "project-123",
      userId: "user-123", // Same as authUser.id
      displayName: "Test User",
      role: "owner",
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-123" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("不能移除自己")
  })

  it("should return 400 if member has paid expenses (non-deleted)", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockMember as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(2)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(0)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無法移除此成員，尚有 2 筆付款記錄")
    // Verify that deletedAt: null is used in the query
    expect(prisma.expense.count).toHaveBeenCalledWith({
      where: { paidByMemberId: "member-456", deletedAt: null },
    })
  })

  it("should return 400 if member has participated expenses (non-deleted)", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockMember as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(3)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無法移除此成員，尚有 3 筆分擔記錄")
    // Verify that expense: { deletedAt: null } is used in the query
    expect(prisma.expenseParticipant.count).toHaveBeenCalledWith({
      where: { memberId: "member-456", expense: { deletedAt: null } },
    })
  })

  it("should return 400 if member has both paid and participated expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockMember as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(2)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(3)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無法移除此成員，尚有 2 筆付款記錄 和 3 筆分擔記錄")
  })

  it("should allow removal if member only has soft-deleted expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockMember as never)
    // Returns 0 because deletedAt: null filter excludes soft-deleted expenses
    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(0)
    vi.mocked(prisma.projectMember.delete).mockResolvedValue(mockMember as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("成員已移除")
    expect(prisma.projectMember.delete).toHaveBeenCalledWith({
      where: { id: "member-456" },
    })
  })

  it("should delete member successfully when no expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockMember as never)
    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expenseParticipant.count).mockResolvedValue(0)
    vi.mocked(prisma.projectMember.delete).mockResolvedValue(mockMember as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("成員已移除")
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/members",
      {
        method: "DELETE",
        body: JSON.stringify({ memberId: "member-456" }),
      }
    )
    const response = await DELETE(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("移除成員失敗")
  })
})
