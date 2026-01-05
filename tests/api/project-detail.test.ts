import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectMember: {
      findFirst: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET, PUT, DELETE } from "@/app/api/projects/[id]/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

const mockUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  lineUserId: "line-user-123",
  image: null,
}

const mockProjectAsMember = {
  id: "project-123",
  name: "Test Project",
  description: "Test Description",
  createdBy: "owner-123",
  creator: { id: "owner-123", name: "Owner", email: "owner@example.com" },
  members: [
    {
      id: "member-1",
      userId: "user-123",
      displayName: "Test User",
      role: "member",
      user: { id: "user-123", name: "Test User", email: "test@example.com", image: null },
    },
  ],
  expenses: [],
  _count: { expenses: 0, members: 1 },
}

const mockProjectAsNonMember = {
  id: "project-456",
  name: "Other Project",
  description: "Other Description",
  createdBy: "owner-456",
  joinMode: "both",
  creator: { id: "owner-456", name: "Other Owner", email: "other@example.com" },
  members: [
    {
      id: "member-2",
      userId: null, // 未認領的成員
      displayName: "Placeholder Member",
      role: "member",
      user: null,
    },
    {
      id: "member-3",
      userId: "owner-456",
      displayName: "Owner",
      role: "owner",
      user: { id: "owner-456", name: "Other Owner", email: "other@example.com", image: null },
    },
  ],
  expenses: [],
  _count: { expenses: 5, members: 2 },
}

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await GET(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 404 if project does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/non-existent")
    const response = await GET(req, { params: Promise.resolve({ id: "non-existent" }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return full project data when user is a member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProjectAsMember as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await GET(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isMember).toBe(true)
    expect(data.name).toBe("Test Project")
    expect(data.members).toBeDefined()
    expect(data.expenses).toBeDefined()
  })

  it("should return limited project data when user is not a member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProjectAsNonMember as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-456")
    const response = await GET(req, { params: Promise.resolve({ id: "project-456" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isMember).toBe(false)
    expect(data.name).toBe("Other Project")
    expect(data.description).toBe("Other Description")
    expect(data.memberCount).toBe(2)
    // 應該包含未認領成員清單
    expect(data.unclaimedMembers).toBeDefined()
    expect(data.unclaimedMembers).toHaveLength(1)
    expect(data.unclaimedMembers[0].displayName).toBe("Placeholder Member")
    // 不應該包含敏感資料
    expect(data.expenses).toBeUndefined()
    expect(data.members).toBeUndefined()
    expect(data.creator).toBeUndefined()
  })

  it("should correctly identify unclaimed members for non-member view", async () => {
    const projectWithMultipleUnclaimed = {
      ...mockProjectAsNonMember,
      members: [
        { id: "m1", userId: null, displayName: "Unclaimed 1", role: "member", user: null },
        { id: "m2", userId: null, displayName: "Unclaimed 2", role: "member", user: null },
        { id: "m3", userId: "owner-456", displayName: "Owner", role: "owner", user: {} },
      ],
      _count: { expenses: 0, members: 3 },
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithMultipleUnclaimed as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-456")
    const response = await GET(req, { params: Promise.resolve({ id: "project-456" }) })
    const data = await response.json()

    expect(data.isMember).toBe(false)
    expect(data.unclaimedMembers).toHaveLength(2)
    expect(data.unclaimedMembers.map((m: { displayName: string }) => m.displayName)).toContain("Unclaimed 1")
    expect(data.unclaimedMembers.map((m: { displayName: string }) => m.displayName)).toContain("Unclaimed 2")
  })

  it("should return joinMode for non-member view", async () => {
    const projectWithClaimOnly = {
      ...mockProjectAsNonMember,
      joinMode: "claim_only",
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectWithClaimOnly as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-456")
    const response = await GET(req, { params: Promise.resolve({ id: "project-456" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isMember).toBe(false)
    expect(data.joinMode).toBe("claim_only")
  })
})

describe("PUT /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 400 if name is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ name: "   " }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("專案名稱不能為空")
  })

  it("should return 400 if end date is before start date", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({
        startDate: "2024-12-20",
        endDate: "2024-12-10",
      }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("結束日期需晚於出發日期")
  })

  it("should update project successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...mockProjectAsMember,
      name: "Updated Name",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe("Updated Name")
  })

  it("should update joinMode successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...mockProjectAsMember,
      joinMode: "claim_only",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ joinMode: "claim_only" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.joinMode).toBe("claim_only")
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          joinMode: "claim_only",
        }),
      })
    )
  })

  it("should return 400 for invalid joinMode value", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ joinMode: "invalid_mode" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的加入模式")
  })

  it("should accept all valid joinMode values", async () => {
    const validModes = ["both", "create_only", "claim_only"]

    for (const mode of validModes) {
      vi.clearAllMocks()
      vi.mocked(getAuthUser).mockResolvedValue(mockUser)
      vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
      vi.mocked(prisma.project.update).mockResolvedValue({
        ...mockProjectAsMember,
        joinMode: mode,
      } as never)

      const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
        method: "PUT",
        body: JSON.stringify({ joinMode: mode }),
      })
      const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })

      expect(response.status).toBe(200)
    }
  })
})

describe("DELETE /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "DELETE",
    })
    const response = await DELETE(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 404 if project does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/non-existent", {
      method: "DELETE",
    })
    const response = await DELETE(req, { params: Promise.resolve({ id: "non-existent" }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 403 if user is not the creator", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "other-user-456", // 不是當前用戶
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "DELETE",
    })
    const response = await DELETE(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("只有創建者可以刪除專案")
  })

  it("should delete project successfully when user is creator", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123", // 當前用戶是創建者
    } as never)
    vi.mocked(prisma.project.delete).mockResolvedValue({} as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "DELETE",
    })
    const response = await DELETE(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("專案已刪除")
    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: "project-123" },
    })
  })

  it("should handle delete error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-123",
      createdBy: "user-123",
    } as never)
    vi.mocked(prisma.project.delete).mockRejectedValue(new Error("Delete failed"))

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "DELETE",
    })
    const response = await DELETE(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("刪除專案失敗")
  })
})

describe("PUT /api/projects/[id] - additional tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should update budget to null", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...mockProjectAsMember,
      budget: null,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ budget: null }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })

    expect(response.status).toBe(200)
  })

  it("should return 400 for negative budget", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ budget: -100 }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("預算金額必須為正數")
  })

  it("should return 400 for invalid start date", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ startDate: "invalid-date" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的出發日期")
  })

  it("should return 400 for invalid end date", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ endDate: "invalid-date" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("無效的結束日期")
  })

  it("should update currency", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...mockProjectAsMember,
      currency: "USD",
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ currency: "USD" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })

    expect(response.status).toBe(200)
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "USD",
        }),
      })
    )
  })

  it("should update exchangeRatePrecision", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({
      ...mockProjectAsMember,
      exchangeRatePrecision: 4,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ exchangeRatePrecision: 4 }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })

    expect(response.status).toBe(200)
  })

  it("should handle update error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({ id: "member-1" } as never)
    vi.mocked(prisma.project.update).mockRejectedValue(new Error("Update failed"))

    const req = new NextRequest("http://localhost:3000/api/projects/project-123", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("更新專案失敗")
  })

  it("should handle GET database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error("DB Error"))

    const req = new NextRequest("http://localhost:3000/api/projects/project-123")
    const response = await GET(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取專案失敗")
  })
})
