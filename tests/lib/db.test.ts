import { describe, it, expect, vi, beforeEach } from "vitest"

// Create mock instance
const mockPrismaInstance = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}

// Mock PrismaClient as a constructor class
vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    constructor() {
      return mockPrismaInstance
    }
  },
}))

describe("Database Client (lib/db.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should export prisma client", async () => {
    const { prisma } = await import("@/lib/db")
    expect(prisma).toBeDefined()
  })

  it("should have $connect method", async () => {
    const { prisma } = await import("@/lib/db")
    expect(prisma.$connect).toBeDefined()
    expect(typeof prisma.$connect).toBe("function")
  })

  it("should have $disconnect method", async () => {
    const { prisma } = await import("@/lib/db")
    expect(prisma.$disconnect).toBeDefined()
    expect(typeof prisma.$disconnect).toBe("function")
  })
})
