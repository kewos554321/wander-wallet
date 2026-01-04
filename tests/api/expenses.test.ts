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
  paidByMemberId: "member-123",
  amount: 1000,
  description: "Test Expense",
  category: "food",
  image: null,
  expenseDate: new Date("2024-12-01"),
  createdAt: new Date(),
  updatedAt: new Date(),
  payer: {
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

// Helper to create params promise
const createParams = (id: string) => Promise.resolve({ id })
const createExpenseParams = (id: string, expenseId: string) =>
  Promise.resolve({ id, expenseId })

describe("GET /api/projects/[id]/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
          paidByMemberId: "member-123",
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
    expect(data.error).toBe("付款人、金額和參與者必填")
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
          paidByMemberId: "member-123",
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
          paidByMemberId: "member-123",
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
          paidByMemberId: "member-123",
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
          paidByMemberId: "invalid-payer",
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
          paidByMemberId: "member-123",
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
          paidByMemberId: "member-123",
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
    expect(prisma.expense.create).toHaveBeenCalled()
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
          paidByMemberId: "member-123",
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
          paidByMemberId: "member-123",
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
          paidByMemberId: "member-123",
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
})

describe("GET /api/projects/[id]/expenses/[expenseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        },
        expense: {
          update: vi.fn(),
        },
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

  it("should update expense with only description", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findFirst).mockResolvedValue(mockExpense as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      return cb({
        expenseParticipant: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        expense: {
          update: vi.fn(),
        },
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
})

describe("DELETE /api/projects/[id]/expenses/[expenseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: "expense-123" },
      { id: "expense-456" },
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
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: "expense-123" },
      { id: "expense-456" },
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
    })
    expect(createActivityLog).toHaveBeenCalledWith({
      projectId: "project-123",
      actorMemberId: "member-123",
      entityType: "expense",
      entityId: "expense-456",
      action: "delete",
      changes: null,
    })
  })

  it("should only soft delete valid expenses in batch", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(
      mockMembership as never
    )
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: "expense-123" },
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
