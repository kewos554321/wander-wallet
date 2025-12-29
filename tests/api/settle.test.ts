import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    projectMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

import { GET } from "@/app/api/projects/[id]/settle/route"
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

const mockMembers = [
  {
    id: "member-123",
    projectId: "project-123",
    userId: "user-123",
    displayName: "User 1",
    user: { image: null },
  },
  {
    id: "member-456",
    projectId: "project-123",
    userId: "user-456",
    displayName: "User 2",
    user: { image: "http://example.com/avatar.jpg" },
  },
]

const mockExpense = {
  id: "expense-123",
  projectId: "project-123",
  paidByMemberId: "member-123",
  amount: 1000,
  description: "Test Expense",
  category: "food",
  deletedAt: null,
  payer: {
    id: "member-123",
    displayName: "User 1",
    user: { image: null },
  },
  participants: [
    {
      id: "participant-1",
      expenseId: "expense-123",
      memberId: "member-123",
      shareAmount: 500,
      member: {
        id: "member-123",
        displayName: "User 1",
        user: { image: null },
      },
    },
    {
      id: "participant-2",
      expenseId: "expense-123",
      memberId: "member-456",
      shareAmount: 500,
      member: {
        id: "member-456",
        displayName: "User 2",
        user: { image: "http://example.com/avatar.jpg" },
      },
    },
  ],
}

// Helper to create params promise
const createParams = (id: string) => Promise.resolve({ id })

describe("GET /api/projects/[id]/settle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
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
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return settlement data when user is a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockExpense] as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty("balances")
    expect(data).toHaveProperty("settlements")
    expect(data).toHaveProperty("summary")
    expect(data.summary.totalExpenses).toBe(1)
    expect(data.summary.totalAmount).toBe(1000)
  })

  it("should only fetch non-deleted expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockExpense] as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    await GET(req, { params: createParams("project-123") })

    // Verify that deletedAt: null is used in the query
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project-123",
          deletedAt: null,
        },
      })
    )
  })

  it("should return empty settlements when no expenses", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([])
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.settlements).toEqual([])
    expect(data.summary.totalExpenses).toBe(0)
    expect(data.summary.totalAmount).toBe(0)
  })

  it("should calculate correct balances for single payer multiple participants", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockExpense] as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    // member-123 paid 1000, owes 500, balance = +500
    // member-456 paid 0, owes 500, balance = -500
    const member123Balance = data.balances.find(
      (b: { memberId: string }) => b.memberId === "member-123"
    )
    const member456Balance = data.balances.find(
      (b: { memberId: string }) => b.memberId === "member-456"
    )

    expect(member123Balance.balance).toBe(500)
    expect(member456Balance.balance).toBe(-500)
  })

  it("should generate settlement from debtor to creditor", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockExpense] as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(data.settlements).toHaveLength(1)
    expect(data.settlements[0].from.memberId).toBe("member-456")
    expect(data.settlements[0].to.memberId).toBe("member-123")
    expect(data.settlements[0].amount).toBe(500)
  })

  it("should handle multiple expenses correctly", async () => {
    const expense1 = {
      ...mockExpense,
      id: "expense-1",
      amount: 1000,
      paidByMemberId: "member-123",
      participants: [
        { memberId: "member-123", shareAmount: 500 },
        { memberId: "member-456", shareAmount: 500 },
      ],
    }
    const expense2 = {
      ...mockExpense,
      id: "expense-2",
      amount: 600,
      paidByMemberId: "member-456",
      payer: {
        id: "member-456",
        displayName: "User 2",
        user: { image: "http://example.com/avatar.jpg" },
      },
      participants: [
        { memberId: "member-123", shareAmount: 300 },
        { memberId: "member-456", shareAmount: 300 },
      ],
    }

    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([expense1, expense2] as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.summary.totalExpenses).toBe(2)
    expect(data.summary.totalAmount).toBe(1600)

    // member-123: paid 1000, owes 800 (500+300), net = +200
    // member-456: paid 600, owes 800 (500+300), net = -200
    const member123Balance = data.balances.find(
      (b: { memberId: string }) => b.memberId === "member-123"
    )
    const member456Balance = data.balances.find(
      (b: { memberId: string }) => b.memberId === "member-456"
    )

    expect(member123Balance.balance).toBe(200)
    expect(member456Balance.balance).toBe(-200)
  })

  it("should exclude soft-deleted expenses from settlement calculation", async () => {
    // This test verifies that when we mock findMany to return no expenses,
    // it simulates the behavior of deleted expenses being filtered out
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    // Return empty array to simulate all expenses being soft-deleted
    vi.mocked(prisma.expense.findMany).mockResolvedValue([])
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.summary.totalExpenses).toBe(0)
    expect(data.settlements).toHaveLength(0)

    // All balances should be 0
    data.balances.forEach((balance: { balance: number }) => {
      expect(balance.balance).toBe(0)
    })
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("計算結算失敗")
  })

  it("should mark as balanced when total paid equals total shared", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockExpense] as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/settle"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(data.summary.isBalanced).toBe(true)
  })
})
