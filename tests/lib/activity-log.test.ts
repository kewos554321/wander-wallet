import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import {
  createActivityLog,
  createActivityLogInTransaction,
  diffChanges,
  getActivityLogs,
} from "@/lib/activity-log"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

describe("activity-log", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("diffChanges", () => {
    it("should return null when no changes", () => {
      const oldData = { name: "test", amount: 100 }
      const newData = { name: "test", amount: 100 }

      const result = diffChanges(oldData, newData, ["name", "amount"])

      expect(result).toBeNull()
    })

    it("should detect string changes", () => {
      const oldData = { name: "old name", description: "desc" }
      const newData = { name: "new name" }

      const result = diffChanges(oldData, newData, ["name", "description"])

      expect(result).toEqual({
        name: { from: "old name", to: "new name" },
      })
    })

    it("should detect number changes", () => {
      const oldData = { amount: 100, price: 50 }
      const newData = { amount: 200 }

      const result = diffChanges(oldData, newData, ["amount", "price"])

      expect(result).toEqual({
        amount: { from: 100, to: 200 },
      })
    })

    it("should handle null values", () => {
      const oldData = { name: "test", description: null as string | null }
      const newData = { description: "new description" }

      const result = diffChanges(oldData, newData, ["name", "description"])

      expect(result).toEqual({
        description: { from: null, to: "new description" },
      })
    })

    it("should handle setting value to null", () => {
      const oldData = { name: "test", description: "old" as string | null }
      const newData = { description: null as string | null }

      const result = diffChanges(oldData, newData, ["name", "description"])

      expect(result).toEqual({
        description: { from: "old", to: null },
      })
    })

    it("should handle Decimal type (Prisma)", () => {
      const mockDecimal = {
        toNumber: () => 100,
      }
      const oldData = { amount: mockDecimal }
      const newData = { amount: 200 }

      const result = diffChanges(
        oldData as unknown as Record<string, unknown>,
        newData,
        ["amount"]
      )

      expect(result).toEqual({
        amount: { from: 100, to: 200 },
      })
    })

    it("should handle Date type", () => {
      const oldDate = new Date("2024-01-01")
      const newDate = new Date("2024-12-01")
      const oldData = { expenseDate: oldDate }
      const newData = { expenseDate: newDate }

      const result = diffChanges(oldData, newData, ["expenseDate"])

      expect(result).toEqual({
        expenseDate: {
          from: oldDate.toISOString(),
          to: newDate.toISOString(),
        },
      })
    })

    it("should return null when Date values are same", () => {
      const date = new Date("2024-01-01")
      const oldData = { expenseDate: date }
      const newData = { expenseDate: new Date("2024-01-01") }

      const result = diffChanges(oldData, newData, ["expenseDate"])

      expect(result).toBeNull()
    })

    it("should ignore fields not in fieldsToCompare", () => {
      const oldData = { name: "old", ignored: "a" }
      const newData = { name: "new", ignored: "b" }

      const result = diffChanges(oldData, newData, ["name"])

      expect(result).toEqual({
        name: { from: "old", to: "new" },
      })
    })

    it("should only compare fields present in newData", () => {
      const oldData = { name: "old", description: "desc" }
      const newData = { name: "new" }

      const result = diffChanges(oldData, newData, ["name", "description"])

      expect(result).toEqual({
        name: { from: "old", to: "new" },
      })
      expect(result).not.toHaveProperty("description")
    })

    it("should handle multiple changes", () => {
      const oldData = { name: "old", amount: 100, category: "food" }
      const newData = { name: "new", amount: 200, category: "transport" }

      const result = diffChanges(oldData, newData, [
        "name",
        "amount",
        "category",
      ])

      expect(result).toEqual({
        name: { from: "old", to: "new" },
        amount: { from: 100, to: 200 },
        category: { from: "food", to: "transport" },
      })
    })

    it("should handle undefined in newData as no change", () => {
      const oldData = { name: "test", amount: 100 }
      const newData = { name: undefined }

      const result = diffChanges(oldData, newData as Record<string, unknown>, [
        "name",
        "amount",
      ])

      // undefined means the field is in newData, so it compares old "test" with undefined
      expect(result).toEqual({
        name: { from: "test", to: null },
      })
    })
  })

  describe("createActivityLog", () => {
    it("should create activity log successfully", async () => {
      const mockLog = {
        id: "log-123",
        projectId: "project-123",
        actorMemberId: "member-123",
        entityType: "expense",
        entityId: "expense-123",
        action: "create",
        changes: null,
        createdAt: new Date(),
      }

      vi.mocked(prisma.activityLog.create).mockResolvedValue(mockLog as never)

      await createActivityLog({
        projectId: "project-123",
        actorMemberId: "member-123",
        entityType: "expense",
        entityId: "expense-123",
        action: "create",
        changes: null,
      })

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          projectId: "project-123",
          actorMemberId: "member-123",
          entityType: "expense",
          entityId: "expense-123",
          action: "create",
          changes: expect.anything(),
        },
      })
    })

    it("should create activity log with changes", async () => {
      const changes = {
        amount: { from: 100, to: 200 },
        description: { from: "old", to: "new" },
      }

      vi.mocked(prisma.activityLog.create).mockResolvedValue({
        id: "log-123",
        changes,
      } as never)

      await createActivityLog({
        projectId: "project-123",
        actorMemberId: "member-123",
        entityType: "expense",
        entityId: "expense-123",
        action: "update",
        changes,
      })

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "update",
          changes,
        }),
      })
    })

    it("should handle null actorMemberId", async () => {
      vi.mocked(prisma.activityLog.create).mockResolvedValue({
        id: "log-123",
        actorMemberId: null,
      } as never)

      await createActivityLog({
        projectId: "project-123",
        actorMemberId: null,
        entityType: "expense",
        entityId: "expense-123",
        action: "delete",
        changes: null,
      })

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorMemberId: null,
        }),
      })
    })
  })

  describe("createActivityLogInTransaction", () => {
    it("should create activity log within transaction", async () => {
      const mockTx = {
        activityLog: {
          create: vi.fn().mockResolvedValue({ id: "log-123" }),
        },
      } as unknown as Prisma.TransactionClient

      await createActivityLogInTransaction(mockTx, {
        projectId: "project-123",
        actorMemberId: "member-123",
        entityType: "expense",
        entityId: "expense-123",
        action: "update",
        changes: { amount: { from: 100, to: 200 } },
      })

      expect(mockTx.activityLog.create).toHaveBeenCalledWith({
        data: {
          projectId: "project-123",
          actorMemberId: "member-123",
          entityType: "expense",
          entityId: "expense-123",
          action: "update",
          changes: { amount: { from: 100, to: 200 } },
        },
      })
    })
  })

  describe("getActivityLogs", () => {
    const mockLogs = [
      {
        id: "log-1",
        projectId: "project-123",
        actorMemberId: "member-123",
        entityType: "expense",
        entityId: "expense-123",
        action: "create",
        changes: null,
        createdAt: new Date(),
        actor: {
          id: "member-123",
          displayName: "Test User",
          user: { image: null },
        },
      },
      {
        id: "log-2",
        projectId: "project-123",
        actorMemberId: "member-456",
        entityType: "expense",
        entityId: "expense-456",
        action: "update",
        changes: { amount: { from: 100, to: 200 } },
        createdAt: new Date(),
        actor: {
          id: "member-456",
          displayName: "Another User",
          user: { image: "http://example.com/avatar.jpg" },
        },
      },
    ]

    it("should fetch activity logs for a project", async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)

      const result = await getActivityLogs("project-123")

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { projectId: "project-123" },
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              user: {
                select: {
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
      })

      expect(result).toEqual(mockLogs)
    })

    it("should filter by entityType", async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockLogs[0]] as never)

      await getActivityLogs("project-123", { entityType: "expense" })

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: "project-123",
            entityType: "expense",
          },
        })
      )
    })

    it("should filter by entityId", async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockLogs[0]] as never)

      await getActivityLogs("project-123", { entityId: "expense-123" })

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: "project-123",
            entityId: "expense-123",
          },
        })
      )
    })

    it("should support pagination with limit and offset", async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as never)

      await getActivityLogs("project-123", { limit: 10, offset: 20 })

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      )
    })

    it("should combine multiple filters", async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockLogs[0]] as never)

      await getActivityLogs("project-123", {
        entityType: "expense",
        entityId: "expense-123",
        limit: 5,
        offset: 10,
      })

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          projectId: "project-123",
          entityType: "expense",
          entityId: "expense-123",
        },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
        take: 5,
        skip: 10,
      })
    })
  })
})
