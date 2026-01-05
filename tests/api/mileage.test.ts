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

import { GET, PUT } from "@/app/api/projects/[id]/mileage/route"
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

const mockMileageData = {
  waypoints: ["台北", "台中", "高雄"],
  totalKm: 350,
  fuelPrice: 32,
  fuelEfficiency: 12,
  participants: 4,
}

const createParams = (id: string) => Promise.resolve({ id })

describe("GET /api/projects/[id]/mileage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage"
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
      "http://localhost:3000/api/projects/project-123/mileage"
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
      "http://localhost:3000/api/projects/project-123/mileage"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("專案不存在")
  })

  it("should return mileage data", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      mileageData: mockMileageData,
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.waypoints).toEqual(["台北", "台中", "高雄"])
    expect(data.totalKm).toBe(350)
    expect(data.fuelPrice).toBe(32)
    expect(data.fuelEfficiency).toBe(12)
    expect(data.participants).toBe(4)
  })

  it("should return default data if mileageData is null", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      mileageData: null,
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.waypoints).toEqual(["", ""])
    expect(data.totalKm).toBe(0)
    expect(data.fuelPrice).toBe(32)
    expect(data.fuelEfficiency).toBe(12)
    expect(data.participants).toBe(2)
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取里程資料失敗")
  })
})

describe("PUT /api/projects/[id]/mileage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage",
      {
        method: "PUT",
        body: JSON.stringify(mockMileageData),
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
      "http://localhost:3000/api/projects/project-123/mileage",
      {
        method: "PUT",
        body: JSON.stringify(mockMileageData),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should update mileage data successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage",
      {
        method: "PUT",
        body: JSON.stringify(mockMileageData),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.waypoints).toEqual(["台北", "台中", "高雄"])
    expect(data.totalKm).toBe(350)
    expect(prisma.project.update).toHaveBeenCalled()
  })

  it("should use default values for missing fields", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage",
      {
        method: "PUT",
        body: JSON.stringify({}),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.waypoints).toEqual([])
    expect(data.totalKm).toBe(0)
    expect(data.fuelPrice).toBe(32)
    expect(data.fuelEfficiency).toBe(12)
    expect(data.participants).toBe(2)
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/mileage",
      {
        method: "PUT",
        body: JSON.stringify(mockMileageData),
      }
    )
    const response = await PUT(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("更新里程資料失敗")
  })
})
