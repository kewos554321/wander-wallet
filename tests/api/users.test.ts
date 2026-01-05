import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

import { GET } from "@/app/api/users/route"
import { prisma } from "@/lib/db"

const mockUsers = [
  {
    id: "user-1",
    name: "User One",
    email: "user1@example.com",
    image: null,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "user-2",
    name: "User Two",
    email: "user2@example.com",
    image: "https://example.com/avatar.jpg",
    createdAt: new Date("2024-01-10"),
  },
]

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return list of users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe("User One")
    expect(data[1].name).toBe("User Two")
  })

  it("should return empty array when no users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it("should order users by createdAt descending", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers)

    await GET()

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  })

  it("should limit to 50 users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers)

    await GET()

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    )
  })
})
