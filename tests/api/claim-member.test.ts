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
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { POST } from "@/app/api/projects/[id]/members/claim/route"
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
  joinMode: "both",
}

const mockUnclaimedMember = {
  id: "member-unclaimed",
  projectId: "project-123",
  userId: null,
  displayName: "Placeholder Member",
  role: "member",
}

const mockClaimedMember = {
  id: "member-claimed",
  projectId: "project-123",
  userId: "user-789",
  displayName: "Claimed User",
  role: "member",
}

describe("POST /api/projects/[id]/members/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 400 if memberId is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("成員ID必填")
  })

  it("should return 404 if project does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/non-existent/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "non-existent" }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return 400 if project joinMode is create_only", async () => {
    const createOnlyProject = {
      ...mockProject,
      joinMode: "create_only",
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(createOnlyProject as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("此專案僅允許建立新成員，不支援認領佔位成員")
  })

  it("should allow claim when joinMode is claim_only", async () => {
    const claimOnlyProject = {
      ...mockProject,
      joinMode: "claim_only",
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(claimOnlyProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null) // User is not already a member
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockUnclaimedMember as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.projectMember.update).mockResolvedValue({
      ...mockUnclaimedMember,
      userId: mockUser.id,
      displayName: mockUser.name,
      claimedAt: new Date(),
      user: mockUser,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })

    expect(response.status).toBe(200)
    expect(prisma.projectMember.update).toHaveBeenCalled()
  })

  it("should allow claim when joinMode is both", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockUnclaimedMember as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.projectMember.update).mockResolvedValue({
      ...mockUnclaimedMember,
      userId: mockUser.id,
      displayName: mockUser.name,
      claimedAt: new Date(),
      user: mockUser,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })

    expect(response.status).toBe(200)
    expect(prisma.projectMember.update).toHaveBeenCalled()
  })

  it("should return 400 if user is already a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue({
      id: "existing-member",
      userId: mockUser.id,
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("您已經是此專案的成員，無法認領其他身份")
  })

  it("should return 404 if member to claim does not exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "non-existent-member" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("成員不存在")
  })

  it("should return 400 if member belongs to different project", async () => {
    const memberFromDifferentProject = {
      ...mockUnclaimedMember,
      projectId: "different-project",
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(memberFromDifferentProject as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("成員不屬於此專案")
  })

  it("should return 400 if member is already claimed", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockClaimedMember as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-claimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("此成員已被認領")
  })

  it("should successfully claim member and update displayName", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(mockUnclaimedMember as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.projectMember.update).mockResolvedValue({
      ...mockUnclaimedMember,
      userId: mockUser.id,
      displayName: mockUser.name,
      claimedAt: new Date(),
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        image: mockUser.image,
      },
    } as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/members/claim", {
      method: "POST",
      body: JSON.stringify({ memberId: "member-unclaimed" }),
    })
    const response = await POST(req, { params: Promise.resolve({ id: "project-123" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.userId).toBe(mockUser.id)
    expect(data.displayName).toBe(mockUser.name)
    expect(prisma.projectMember.update).toHaveBeenCalledWith({
      where: { id: "member-unclaimed" },
      data: {
        userId: mockUser.id,
        displayName: mockUser.name,
        claimedAt: expect.any(Date),
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
})
