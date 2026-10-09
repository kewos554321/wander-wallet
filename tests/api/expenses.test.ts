import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    expenseParticipant: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    expensePayer: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}))

// Mock activity-log
vi.mock("@/lib/activity-log", () => ({
  createActivityLog: vi.fn().mockResolvedValue({ id: "log-123" }),
  createActivityLogInTransaction: vi.fn().mockResolvedValue({ id: "log-123" }),
  diffChanges: vi.fn().mockReturnValue(null),
}))

// Mock exchange-rate service
vi.mock("@/lib/services/exchange-rate", () => ({
  getExchangeRate: vi.fn(),
  convertCurrency: vi.fn(),
  getExchangeRates: vi.fn(),
  isUsingFallbackRates: vi.fn().mockReturnValue(false),
}))

import { GET, POST } from "@/app/api/projects/[id]/expenses/route"
import {
  GET as GET_EXPENSE,
  PUT as PUT_EXPENSE,
  DELETE as DELETE_EXPENSE,
} from "@/app/api/projects/[id]/expenses/[expenseId]/route"
import { DELETE as DELETE_BATCH } from "@/app/api/projects/[id]/expenses/batch/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createActivityLog } from "@/lib/activity-log"
import { getExchangeRate } from "@/lib/services/exchange-rate"

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

const _mockMember2 = {
  id: "member-456",
  projectId: "project-123",
  userId: "user-456",
  displayName: "Member 2",
  role: "member",
}

const mockExpense = {
  id: "expense-123",
  projectId: "project-123",
  amount: 1000,
  description: "Test Expense",
  category: "food",
  image: null,
  expenseDate: new Date("2024-12-01"),
  createdAt: new Date(),
  updatedAt: new Date(),
  payers: [
    {
      id: "payer-1",
      expenseId: "expense-123",
      memberId: "member-123",
      amount: 1000,
      member: {
        id: "member-123",
        displayName: "Test User",
        userId: "user-123",
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      },
    },
  ],
  participants: [
    {
      id: "participant-1",
      expenseId: "expense-123",
      memberId: "member-123",
      shareAmount: 500,
      member: {
        id: "member-123",
        displayName: "Test User",
        userId: "user-123",
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      },
    },
    {
      id: "participant-2",
      expenseId: "expense-123",
      memberId: "member-456",
      shareAmount: 500,
      member: {
        id: "member-456",
        displayName: "Member 2",
        userId: "user-456",
        user: {
          id: "user-456",
          name: "Member 2",
          email: "member2@example.com",
          image: null,
        },
      },
    },
  ],
}

// Mock project for currency/precision
const mockProject = {
  id: "project-123",
  currency: "TWD",
  customRates: null,
  exchangeRatePrecision: 2,
}

// Helper to create params promise
const createParams = (id: string) => Promise.resolve({ id })
const createExpenseParams = (id: string, expenseId: string) =>
  Promise.resolve({ id, expenseId })

describe("GET /api/projects/[id]/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses"
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
      "http://localhost:3000/api/projects/project-123/expenses"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return expenses when user is a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockExpense] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("expense-123")
    expect(data[0].amount).toBe(1000)
    expect(data[0].payers).toHaveLength(1)
    expect(data[0].payers[0].memberId).toBe("member-123")
    expect(data[0].payer).toBeUndefined()
  })

  it("should return empty array when no expenses exist", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findMany).mockResolvedValue([])

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses"
    )
    const response = await GET(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取費用列表失敗")
  })
})

describe("POST /api/projects/[id]/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
    )
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({}),
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
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 400 if required fields are missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("金額和參與者必填")
  })

  it("should return 400 if amount is negative", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: -100 }],
          amount: -100,
          participants: [{ memberId: "member-123", shareAmount: -100 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("金額不可為負數")
  })

  it("should return 400 if no participants", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("至少需要一個參與者")
  })

  it("should return 400 if participant is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [{ memberId: "invalid-member", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("成員 invalid-member 不是專案成員")
  })

  it("should return 400 if payer is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "invalid-payer", amount: 1000 }],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("付款人必須是專案成員")
  })

  it("should return 400 if payers array is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("至少需要一位付款人")
    expect(prisma.expense.create).not.toHaveBeenCalled()
  })

  it("should return 400 if payer amounts do not sum to the expense amount", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
      { id: "member-456" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [
            { memberId: "member-123", amount: 300 },
            { memberId: "member-456", amount: 300 },
          ],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("付款金額合計必須等於費用總額")
    expect(prisma.expense.create).not.toHaveBeenCalled()
  })

  it("should return 400 if the same payer is listed twice", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [
            { memberId: "member-123", amount: 500 },
            { memberId: "member-123", amount: 500 },
          ],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("付款人不可重複")
    expect(prisma.expense.create).not.toHaveBeenCalled()
  })

  it("should return 400 if share total does not equal amount", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
      { id: "member-456" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [
            { memberId: "member-123", shareAmount: 400 },
            { memberId: "member-456", shareAmount: 400 },
          ],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("分擔總額必須等於費用總額")
  })

  it("should create expense successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
      { id: "member-456" },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          description: "Test Expense",
          category: "food",
          participants: [
            { memberId: "member-123", shareAmount: 500 },
            { memberId: "member-456", shareAmount: 500 },
          ],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe("expense-123")
    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payers: {
            create: [{ memberId: "member-123", amount: 1000, amountProject: 1000 }],
          },
        }),
      })
    )
  })

  it("stores settlement amounts and a snapshot rate for a foreign-currency expense", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "USD",
      customRates: null,
      exchangeRatePrecision: 2,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(getExchangeRate).mockResolvedValue(0.031715)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          amount: 1000,
          currency: "TWD",
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(201)

    const call = vi.mocked(prisma.expense.create).mock.calls[0][0]
    expect(call.data.exchangeRate).toBeCloseTo(0.031715)
    expect(call.data.participants.create[0].shareAmountProject).toBe(3172)
    expect(call.data.payers.create[0].amountProject).toBe(3172)
  })

  it("records a market rate meta (today) when a foreign expense falls back to the live rate", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "USD",
      customRates: null,
      exchangeRatePrecision: 2,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(getExchangeRate).mockResolvedValue(0.031715)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        amount: 1000,
        currency: "TWD",
        payers: [{ memberId: "member-123", amount: 1000 }],
        participants: [{ memberId: "member-123", shareAmount: 1000 }],
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(201)

    const data = vi.mocked(prisma.expense.create).mock.calls[0][0].data
    expect(data.rateKind).toBe("market")
    expect(data.rateDate).toBeInstanceOf(Date)
  })

  it("records a project rate meta when the project has a fixed rate for the currency", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "TWD",
      customRates: { USD: 30 },
      exchangeRatePrecision: 2,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        payers: [{ memberId: "member-123", amount: 100 }],
        participants: [{ memberId: "member-123", shareAmount: 100 }],
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(201)

    const data = vi.mocked(prisma.expense.create).mock.calls[0][0].data
    expect(data.exchangeRate).toBe(30)
    expect(data.rateKind).toBe("project")
    expect(data.rateDate).toBeNull()
  })

  it("records the queried date for a client-provided market rate", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "TWD",
      customRates: null,
      exchangeRatePrecision: 2,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        exchangeRate: 31.5,
        rateKind: "market",
        rateDate: "2026-10-06",
        payers: [{ memberId: "member-123", amount: 100 }],
        participants: [{ memberId: "member-123", shareAmount: 100 }],
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(201)

    const data = vi.mocked(prisma.expense.create).mock.calls[0][0].data
    expect(data.rateKind).toBe("market")
    expect((data.rateDate as Date).toISOString()).toBe(new Date("2026-10-06").toISOString())
  })

  it("records a custom rate meta with no market date", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "TWD",
      customRates: null,
      exchangeRatePrecision: 2,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        exchangeRate: 30,
        rateKind: "custom",
        payers: [{ memberId: "member-123", amount: 100 }],
        participants: [{ memberId: "member-123", shareAmount: 100 }],
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(201)

    const data = vi.mocked(prisma.expense.create).mock.calls[0][0].data
    expect(data.rateKind).toBe("custom")
    expect(data.rateDate).toBeNull()
  })

  it("allocates and updates the ledger for a same-currency expense", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "TWD",
      customRates: null,
      exchangeRatePrecision: 2,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 5 },
      { id: "member-456", remainderDiscrepancy: 0 },
      { id: "member-789", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          amount: 1000,
          currency: "TWD",
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [
            { memberId: "member-123", shareAmount: 333.33 },
            { memberId: "member-456", shareAmount: 333.33 },
            { memberId: "member-789", shareAmount: 333.34 },
          ],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(201)

    const call = vi.mocked(prisma.expense.create).mock.calls[0][0]
    // Same currency: no snapshot rate, but the settlement amounts are written.
    expect(call.data.exchangeRate).toBeNull()
    expect(call.data.rateKind).toBeNull()
    const created = call.data.participants.create as {
      memberId: string
      shareAmount: number
      shareAmountProject: number
    }[]
    // member-456 has the lowest ledger, so the remainder lands on them in both.
    expect(created.map((p) => p.shareAmountProject)).toEqual([333, 334, 333])
    // shareAmount stays the submitted weight (not the allocation), so rollback and v1 reads keep working.
    expect(created.map((p) => p.shareAmount)).toEqual([333.33, 333.33, 333.34])
    expect(prisma.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "member-456" }, data: { remainderDiscrepancy: 1 } }),
    )
  })

  it("should create activity log after creating expense", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    await POST(req, { params: createParams("project-123") })

    expect(createActivityLog).toHaveBeenCalledWith({
      projectId: "project-123",
      actorMemberId: "member-123",
      entityType: "expense",
      entityId: "expense-123",
      action: "create",
      changes: null,
      metadata: {
        description: mockExpense.description,
        amount: mockExpense.amount,
        currency: undefined, // mockExpense doesn't have currency
        category: mockExpense.category,
        payerName: mockExpense.payers[0].member.displayName,
        expenseDate: mockExpense.expenseDate.toISOString(),
      },
    })
  })

  it("should create expense with custom expense date", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
          expenseDate: "2024-12-01",
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })

    expect(response.status).toBe(201)
    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expenseDate: expect.any(Date),
        }),
      })
    )
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          amount: 1000,
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("創建費用失敗")
  })

  it("stores a valid splitDetail", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const splitDetail = { version: 1, personalItems: { "member-123": [{ name: "咖啡", amount: 100 }] }, customShares: {} }
    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        payers: [{ memberId: "member-123", amount: 1000 }],
        amount: 1000,
        participants: [
          { memberId: "member-123", shareAmount: 550 },
          { memberId: "member-456", shareAmount: 450 },
        ],
        splitDetail,
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })

    expect(response.status).toBe(201)
    expect(vi.mocked(prisma.expense.create).mock.calls[0][0].data).toMatchObject({ splitDetail })
  })

  it("normalizes an empty splitDetail (no personal items, no custom shares) to no splitDetail field", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        payers: [{ memberId: "member-123", amount: 1000 }],
        amount: 1000,
        participants: [
          { memberId: "member-123", shareAmount: 500 },
          { memberId: "member-456", shareAmount: 500 },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: {} },
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })

    expect(response.status).toBe(201)
    expect(vi.mocked(prisma.expense.create).mock.calls[0][0].data).not.toHaveProperty("splitDetail")
  })

  it("rejects an inconsistent splitDetail with 400", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        payers: [{ memberId: "member-123", amount: 1000 }],
        amount: 1000,
        participants: [
          { memberId: "member-123", shareAmount: 500 },
          { memberId: "member-456", shareAmount: 500 },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: { "member-456": 300 } },
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("分攤明細與分攤金額不一致")
    expect(prisma.expense.create).not.toHaveBeenCalled()
  })
})

describe("GET /api/projects/[id]/expenses/[expenseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123"
    )
    const response = await GET_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123"
    )
    const response = await GET_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 404 if expense not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123"
    )
    const response = await GET_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("費用不存在")
  })

  it("should return expense details", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123"
    )
    const response = await GET_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe("expense-123")
    expect(data.amount).toBe(1000)
    expect(data.payers).toHaveLength(1)
    expect(data.payer).toBeUndefined()
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123"
    )
    const response = await GET_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("獲取費用失敗")
  })
})

describe("PUT /api/projects/[id]/expenses/[expenseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ amount: 2000 }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ amount: 2000 }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 404 if expense not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ amount: 2000 }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("費用不存在")
  })

  it("should return 400 if amount is negative", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ amount: -100 }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("金額不可為負數")
  })

  it("recomputes settlement amounts and rolls back the ledger when the rate is edited", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "USD",
      customRates: null,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 1 },
    ] as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({
      ...mockExpense,
      currency: "TWD",
      exchangeRate: 0.03,
      participants: [
        {
          id: "participant-1",
          memberId: "member-123",
          shareAmount: 1000,
          shareAmountProject: 3000,
          member: { id: "member-123", displayName: "Test User" },
        },
      ],
      payers: [
        {
          id: "payer-1",
          memberId: "member-123",
          amount: 1000,
          amountProject: 3000,
          member: { id: "member-123", displayName: "Test User" },
        },
      ],
    } as never)
    vi.mocked(getExchangeRate).mockResolvedValue(0.031715)
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as never)

    const createManyParticipant = vi.fn().mockResolvedValue({ count: 1 })
    const updateExpense = vi.fn().mockResolvedValue({})
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          expenseParticipant: {
            deleteMany: vi.fn().mockResolvedValue({}),
            createMany: createManyParticipant,
            update: vi.fn().mockResolvedValue({}),
          },
          expensePayer: {
            deleteMany: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          expense: { update: updateExpense },
          projectMember: { update: vi.fn().mockResolvedValue({}) },
          project: { update: vi.fn().mockResolvedValue({}) },
        }),
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          exchangeRate: 0.0317,
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(createManyParticipant).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ memberId: "member-123", shareAmountProject: 3170 })],
      }),
    )
    expect(updateExpense).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ exchangeRate: 0.0317 }) }),
    )
  })

  // Captures the expense.update data written inside the PUT transaction.
  function captureUpdate() {
    const update = vi.fn().mockResolvedValue({})
    vi.mocked(prisma.$transaction).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          expenseParticipant: {
            deleteMany: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
          },
          expensePayer: {
            deleteMany: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          expense: { update },
          projectMember: { update: vi.fn().mockResolvedValue({}) },
          project: { update: vi.fn().mockResolvedValue({}) },
        }),
    )
    return update
  }

  function seedForeignExpense() {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currency: "TWD",
      customRates: null,
      rateSource: "fixed",
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({
      ...mockExpense,
      currency: "USD",
      exchangeRate: 31,
      participants: [
        {
          id: "pa",
          memberId: "member-123",
          shareAmount: 1000,
          shareAmountProject: 31000,
          member: { id: "member-123", displayName: "Test User" },
        },
      ],
      payers: [
        {
          id: "py",
          memberId: "member-123",
          amount: 1000,
          amountProject: 31000,
          member: { id: "member-123", displayName: "Test User" },
        },
      ],
    } as never)
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as never)
  }

  it("records a custom rate meta when the rate is edited by hand", async () => {
    seedForeignExpense()
    const update = captureUpdate()

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          amount: 1000,
          exchangeRate: 30,
          rateKind: "custom",
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rateKind: "custom", rateDate: null }) }),
    )
  })

  it("records the queried date for an edited market rate", async () => {
    seedForeignExpense()
    const update = captureUpdate()

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          amount: 1000,
          exchangeRate: 31.5,
          rateKind: "market",
          rateDate: "2026-10-06",
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    const data = update.mock.calls[0][0].data as { rateKind: string; rateDate: Date }
    expect(data.rateKind).toBe("market")
    expect(data.rateDate.toISOString()).toBe(new Date("2026-10-06").toISOString())
  })

  it("clears rate meta when the currency changes to the settlement currency", async () => {
    seedForeignExpense()
    const update = captureUpdate()

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          amount: 1000,
          currency: "TWD",
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rateKind: null, rateDate: null }) }),
    )
  })

  it("leaves rate meta untouched when only the description changes", async () => {
    seedForeignExpense()
    const update = captureUpdate()

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ description: "gogo", payers: [{ memberId: "member-123", amount: 1000 }] }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data).not.toHaveProperty("rateKind")
  })

  it("rejects an expense with a non-positive exchange rate", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses",
      {
        method: "POST",
        body: JSON.stringify({
          amount: 1000,
          currency: "TWD",
          exchangeRate: 0,
          payers: [{ memberId: "member-123", amount: 1000 }],
          participants: [{ memberId: "member-123", shareAmount: 1000 }],
        }),
      }
    )
    const response = await POST(req, { params: createParams("project-123") })
    expect(response.status).toBe(400)
  })

  it("rolls back the ledger when deleting a foreign-currency expense", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ currency: "USD" } as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({
      ...mockExpense,
      currency: "TWD",
      exchangeRate: 0.0317,
      participants: [
        { id: "pa", memberId: "member-123", shareAmount: 333.33, shareAmountProject: 1058 },
        { id: "pb", memberId: "member-456", shareAmount: 333.33, shareAmountProject: 1057 },
        { id: "pc", memberId: "member-789", shareAmount: 333.34, shareAmountProject: 1057 },
      ],
      payers: [
        { id: "payer-1", memberId: "member-123", amount: 1000, amountProject: 3172, member: { displayName: "Test User" } },
      ],
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 1 },
      { id: "member-456", remainderDiscrepancy: 0 },
      { id: "member-789", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.update).mockResolvedValue({} as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" },
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(prisma.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-123" },
        data: { remainderDiscrepancy: 0 },
      }),
    )
  })

  it("rolls back the ledger when deleting a same-currency expense that carries a settlement allocation", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ currency: "TWD" } as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({
      ...mockExpense,
      currency: "TWD",
      participants: [
        { id: "pa", memberId: "member-123", shareAmount: 333.33, shareAmountProject: 333 },
        { id: "pb", memberId: "member-456", shareAmount: 333.33, shareAmountProject: 334 },
        { id: "pc", memberId: "member-789", shareAmount: 333.34, shareAmountProject: 333 },
      ],
      payers: [
        { id: "payer-1", memberId: "member-123", amount: 1000, amountProject: 1000, member: { displayName: "Test User" } },
      ],
    } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 0 },
      { id: "member-456", remainderDiscrepancy: 1 },
      { id: "member-789", remainderDiscrepancy: 0 },
    ] as never)
    vi.mocked(prisma.expense.update).mockResolvedValue({} as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" },
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(prisma.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-456" },
        data: { remainderDiscrepancy: 0 },
      }),
    )
  })

  it("should return 400 if participants array is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ participants: [] }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("至少需要一個參與者")
  })

  it("should return 400 if participant is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          participants: [{ memberId: "invalid-member", shareAmount: 1000 }],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("成員 invalid-member 不是專案成員")
  })

  it("should return 400 if share total does not equal amount", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
      { id: "member-456" },
    ] as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          participants: [
            { memberId: "member-123", shareAmount: 300 },
            { memberId: "member-456", shareAmount: 300 },
          ],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("分擔總額必須等於費用總額")
  })

  it("should update expense successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
      { id: "member-456" },
    ] as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        expenseParticipant: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          update: vi.fn(),
        },
        expensePayer: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          create: vi.fn(),
          count: vi.fn(),
        },
        expense: {
          update: vi.fn(),
        },
        projectMember: { update: vi.fn() },
        project: { update: vi.fn() },
      } as never)
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({
      ...mockExpense,
      amount: 2000,
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          payers: [
            { memberId: "member-123", amount: 500 },
            { memberId: "member-456", amount: 1500 },
          ],
          amount: 2000,
          participants: [
            { memberId: "member-123", shareAmount: 1000 },
            { memberId: "member-456", shareAmount: 1000 },
          ],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.amount).toBe(2000)
  })

  it("allocates original+settlement on a same-currency edit and updates the ledger", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123", remainderDiscrepancy: 5 },
      { id: "member-456", remainderDiscrepancy: 0 },
    ] as never)
    const participantCreate = vi.fn().mockResolvedValue(undefined)
    const memberUpdate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) =>
      cb({
        expenseParticipant: { deleteMany: vi.fn(), createMany: participantCreate, update: vi.fn() },
        expensePayer: { deleteMany: vi.fn(), createMany: vi.fn(), create: vi.fn(), count: vi.fn() },
        expense: { update: vi.fn() },
        projectMember: { update: memberUpdate },
        project: { update: vi.fn() },
      } as never),
    )
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({ ...mockExpense, amount: 667 } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          amount: 667,
          payers: [{ memberId: "member-123", amount: 667 }],
          participants: [
            { memberId: "member-123", shareAmount: 333.5 },
            { memberId: "member-456", shareAmount: 333.5 },
          ],
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    const created = participantCreate.mock.calls[0][0].data as {
      memberId: string
      shareAmount: number
      shareAmountProject: number
    }[]
    // member-456 has the lowest ledger → gets the extra unit in both currencies.
    expect(created.map((p) => p.shareAmount)).toEqual([333.5, 333.5])
    expect(created.map((p) => p.shareAmountProject)).toEqual([333, 334])
    expect(memberUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "member-456" }, data: { remainderDiscrepancy: 1 } }),
    )
  })

  it("should update expense with only description", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([
      { id: "member-123" },
    ] as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        expenseParticipant: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          update: vi.fn(),
        },
        expensePayer: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          create: vi.fn(),
          count: vi.fn(),
        },
        expense: {
          update: vi.fn(),
        },
        projectMember: { update: vi.fn() },
        project: { update: vi.fn() },
      } as never)
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({
      ...mockExpense,
      description: "Updated description",
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({
          payers: [{ memberId: "member-123", amount: 1000 }],
          description: "Updated description",
        }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.description).toBe("Updated description")
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      {
        method: "PUT",
        body: JSON.stringify({ amount: 2000 }),
      }
    )
    const response = await PUT_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("更新費用失敗")
  })

  function mockUpdateTransaction() {
    const update = vi.fn()
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) =>
      cb({
        expenseParticipant: { deleteMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
        expensePayer: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          create: vi.fn(),
          count: vi.fn(),
        },
        expense: { update },
        projectMember: { update: vi.fn() },
        project: { update: vi.fn() },
      } as never)
    )
    return update
  }

  function putRequest(body: unknown) {
    return new NextRequest("http://localhost:3000/api/projects/project-123/expenses/expense-123", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

  function mockExisting(splitDetail: unknown = null) {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({ ...mockExpense, splitDetail } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as never)
  }

  const oldDetail = { version: 1, personalItems: { "member-123": [{ name: "x", amount: 100 }] }, customShares: {} }

  it("clears splitDetail when participants change without splitDetail (old clients)", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({
        payers: [{ memberId: "member-123", amount: 1000 }],
        participants: [{ memberId: "member-123", shareAmount: 500 }, { memberId: "member-456", shareAmount: 500 }],
      }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toBe(Prisma.DbNull)
  })

  it("leaves splitDetail alone when only the description changes", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({ payers: [{ memberId: "member-123", amount: 1000 }], description: "新描述" }),
      {
        params: createExpenseParams("project-123", "expense-123"),
      }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data).not.toHaveProperty("splitDetail")
  })

  it("updates a valid splitDetail", async () => {
    mockExisting(null)
    const update = mockUpdateTransaction()
    const splitDetail = { version: 1, personalItems: {}, customShares: { "member-456": 300 } }
    const response = await PUT_EXPENSE(
      putRequest({
        payers: [{ memberId: "member-123", amount: 1000 }],
        participants: [{ memberId: "member-123", shareAmount: 700 }, { memberId: "member-456", shareAmount: 300 }],
        splitDetail,
      }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toEqual(splitDetail)
  })

  it("validates splitDetail against existing participants when participants are not sent", async () => {
    mockExisting(null)
    mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({
        payers: [{ memberId: "member-123", amount: 1000 }],
        splitDetail: { version: 1, personalItems: {}, customShares: { "member-456": 999 } },
      }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(400)
  })

  it("clears splitDetail when null is sent", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({ payers: [{ memberId: "member-123", amount: 1000 }], splitDetail: null }),
      {
        params: createExpenseParams("project-123", "expense-123"),
      }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toBe(Prisma.DbNull)
  })

  it("normalizes an empty splitDetail (no personal items, no custom shares) to clearing the column", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({
        payers: [{ memberId: "member-123", amount: 1000 }],
        participants: [
          { memberId: "member-123", shareAmount: 500 },
          { memberId: "member-456", shareAmount: 500 },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: {} },
      }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toBe(Prisma.DbNull)
  })
})

describe("DELETE /api/projects/[id]/expenses/[expenseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" }
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" }
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 404 if expense not found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" }
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("費用不存在")
  })

  it("should soft delete expense successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.expense.update).mockResolvedValue({
      ...mockExpense,
      deletedAt: new Date(),
      deletedByMemberId: "member-123",
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" }
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("費用已刪除")
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: "expense-123" },
      data: {
        deletedAt: expect.any(Date),
        deletedByMemberId: "member-123",
      },
    })
  })

  it("should create activity log on delete", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.expense.update).mockResolvedValue({
      ...mockExpense,
      deletedAt: new Date(),
    } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" }
    )
    await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })

    expect(createActivityLog).toHaveBeenCalledWith({
      projectId: "project-123",
      actorMemberId: "member-123",
      entityType: "expense",
      entityId: "expense-123",
      action: "delete",
      changes: null,
      metadata: {
        description: "Test Expense",
        amount: 1000,
        category: "food",
        payerName: "Test User",
        expenseDate: mockExpense.expenseDate.toISOString(),
      },
    })
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/expense-123",
      { method: "DELETE" }
    )
    const response = await DELETE_EXPENSE(req, {
      params: createExpenseParams("project-123", "expense-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("刪除費用失敗")
  })
})

describe("DELETE /api/projects/[id]/expenses/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
  })

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: ["expense-123"] }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("未授權")
  })

  it("should return 403 if user is not a project member", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: ["expense-123"] }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("無權限訪問此專案")
  })

  it("should return 400 if expenseIds is missing", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({}),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請提供要刪除的費用 ID")
  })

  it("should return 400 if expenseIds is empty array", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: [] }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("請提供要刪除的費用 ID")
  })

  it("should return 404 if no valid expenses found", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findMany).mockResolvedValue([])

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: ["invalid-id"] }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("找不到可刪除的費用")
  })

  it("should soft delete expenses in batch successfully", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    const batchExpense1 = {
      id: "expense-123",
      description: "Expense 1",
      amount: 100,
      category: "food",
      expenseDate: new Date("2024-12-01"),
      image: null,
      payers: [
        { memberId: "member-123", amount: 100, member: { displayName: "Test User" } },
      ],
    }
    const batchExpense2 = {
      id: "expense-456",
      description: "Expense 2",
      amount: 200,
      category: "transport",
      expenseDate: new Date("2024-12-02"),
      image: null,
      payers: [
        { memberId: "member-123", amount: 100, member: { displayName: "Test User" } },
      ],
    }
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      batchExpense1,
      batchExpense2,
    ] as never)
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 2 } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: ["expense-123", "expense-456"] }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.deleted).toBe(2)
    expect(data.message).toBe("已刪除 2 筆費用")
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["expense-123", "expense-456"] },
        projectId: "project-123",
      },
      data: {
        deletedAt: expect.any(Date),
        deletedByMemberId: "member-123",
      },
    })
  })

  it("should create activity logs for each expense in batch delete", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    const batchExpense1 = {
      id: "expense-123",
      description: "Expense 1",
      amount: 100,
      category: "food",
      expenseDate: new Date("2024-12-01"),
      image: null,
      payers: [
        { memberId: "member-123", amount: 100, member: { displayName: "Test User" } },
      ],
    }
    const batchExpense2 = {
      id: "expense-456",
      description: "Expense 2",
      amount: 200,
      category: "transport",
      expenseDate: new Date("2024-12-02"),
      image: null,
      payers: [
        { memberId: "member-123", amount: 100, member: { displayName: "Test User" } },
      ],
    }
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      batchExpense1,
      batchExpense2,
    ] as never)
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 2 } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: ["expense-123", "expense-456"] }),
      }
    )
    await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })

    expect(createActivityLog).toHaveBeenCalledTimes(2)
    expect(createActivityLog).toHaveBeenCalledWith({
      projectId: "project-123",
      actorMemberId: "member-123",
      entityType: "expense",
      entityId: "expense-123",
      action: "delete",
      changes: null,
      metadata: {
        description: "Expense 1",
        amount: 100,
        category: "food",
        payerName: "Test User",
        expenseDate: batchExpense1.expenseDate.toISOString(),
      },
    })
    expect(createActivityLog).toHaveBeenCalledWith({
      projectId: "project-123",
      actorMemberId: "member-123",
      entityType: "expense",
      entityId: "expense-456",
      action: "delete",
      changes: null,
      metadata: {
        description: "Expense 2",
        amount: 200,
        category: "transport",
        payerName: "Test User",
        expenseDate: batchExpense2.expenseDate.toISOString(),
      },
    })
  })

  it("should only soft delete valid expenses in batch", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    const validExpense = {
      id: "expense-123",
      description: "Valid Expense",
      amount: 100,
      category: "food",
      expenseDate: new Date("2024-12-01"),
      image: null,
      payers: [
        { memberId: "member-123", amount: 100, member: { displayName: "Test User" } },
      ],
    }
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      validExpense,
    ] as never)
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 1 } as never)

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({
          expenseIds: ["expense-123", "invalid-expense"],
        }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.deleted).toBe(1)
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["expense-123"] },
        projectId: "project-123",
      },
      data: {
        deletedAt: expect.any(Date),
        deletedByMemberId: "member-123",
      },
    })
  })

  it("should return 500 on database error", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockRejectedValue(
      new Error("DB Error")
    )

    const req = new NextRequest(
      "http://localhost:3000/api/projects/project-123/expenses/batch",
      {
        method: "DELETE",
        body: JSON.stringify({ expenseIds: ["expense-123"] }),
      }
    )
    const response = await DELETE_BATCH(req, {
      params: createParams("project-123"),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("批量刪除費用失敗")
  })
})
