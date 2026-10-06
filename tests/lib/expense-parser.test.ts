import { describe, it, expect, vi } from "vitest"

// Mock 整個 expense-parser 模組中的外部依賴
vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn(() => ({
      pipe: vi.fn(() => ({
        invoke: vi.fn(),
      })),
    })),
  },
}))

vi.mock("@langchain/deepseek", () => ({
  ChatDeepSeek: vi.fn(() => ({
    withStructuredOutput: vi.fn(() => ({})),
  })),
}))

// 在 mock 之後再 import
import {
  ParsedExpenseSchema,
  ParsedExpensesSchema,
  EXPENSE_CATEGORIES,
  resolvePayers,
  type MemberInfo,
} from "@/lib/ai/expense-parser"

describe("ParsedExpenseSchema (legacy)", () => {
  it("should validate correct expense data", () => {
    const validData = {
      amount: 280,
      description: "午餐拉麵",
      category: "food",
      payerName: "小明",
      participantNames: ["小明", "小華"],
      splitMode: "equal",
      confidence: 0.95,
    }

    const result = ParsedExpenseSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should reject invalid category", () => {
    const invalidData = {
      amount: 280,
      description: "午餐拉麵",
      category: "invalid_category",
      payerName: "小明",
      participantNames: ["小明"],
      splitMode: "equal",
      confidence: 0.95,
    }

    const result = ParsedExpenseSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe("ParsedExpensesSchema (multi-expense)", () => {
  it("should validate correct multi-expense data", () => {
    const validData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food", payers: [{ name: "小明" }], participantNames: ["小明", "小華"] },
        { amount: 150, description: "計程車", category: "transport", payers: [{ name: "小明" }], participantNames: ["小明", "小華"] },
      ],
      confidence: 0.95,
    }

    const result = ParsedExpensesSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should validate single expense", () => {
    const validData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food", payers: [{ name: "小明" }], participantNames: ["小明"] },
      ],
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should accept empty expenses array", () => {
    const data = {
      expenses: [],
      confidence: 0.5,
    }

    const result = ParsedExpensesSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("should validate expense with optional currency", () => {
    const validData = {
      expenses: [
        { amount: 1000, description: "拉麵", category: "food", payers: [{ name: "小明" }], participantNames: ["小明"], currency: "JPY" },
      ],
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should validate multiple payers with explicit amounts", () => {
    const validData = {
      expenses: [
        {
          amount: 1280,
          description: "超市",
          category: "shopping",
          payers: [{ name: "我", amount: 800 }, { name: "小明", amount: 480 }],
          participantNames: ["我", "小明"],
        },
      ],
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should reject invalid category in expenses", () => {
    const invalidData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "invalid", payers: [{ name: "小明" }], participantNames: ["小明"] },
      ],
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject invalid currency code", () => {
    const invalidData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food", payers: [{ name: "小明" }], participantNames: ["小明"], currency: "INVALID" },
      ],
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject confidence out of range", () => {
    const invalidData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food", payers: [{ name: "小明" }], participantNames: ["小明"] },
      ],
      confidence: 1.5,
    }

    const result = ParsedExpensesSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe("resolvePayers", () => {
  const members: MemberInfo[] = [
    { id: "member-1", displayName: "小雨" },
    { id: "member-2", displayName: "小明" },
    { id: "member-3", displayName: "小美" },
  ]
  const currentUserName = "小雨"

  it("splits explicit amounts: 我付 800、小明 480", () => {
    const payers = resolvePayers(
      [{ name: "我", amount: 800 }, { name: "小明", amount: 480 }],
      1280,
      members,
      currentUserName
    )
    expect(payers).toEqual([
      { memberId: "member-1", amount: 800 },
      { memberId: "member-2", amount: 480 },
    ])
  })

  it("gives the current user the full amount when only 我付 is mentioned", () => {
    expect(resolvePayers([{ name: "我" }], 600, members, currentUserName)).toEqual([
      { memberId: "member-1", amount: 600 },
    ])
  })

  it("gives the current user the full amount when no payer is mentioned", () => {
    expect(resolvePayers([], 250, members, currentUserName)).toEqual([{ memberId: "member-1", amount: 250 }])
  })

  it("splits equally when multiple names have no amounts", () => {
    expect(resolvePayers([{ name: "小明" }, { name: "小美" }], 100, members, currentUserName)).toEqual([
      { memberId: "member-2", amount: 50 },
      { memberId: "member-3", amount: 50 },
    ])
  })

  it("splits the remainder equally when only some amounts are given", () => {
    const payers = resolvePayers([{ name: "我", amount: 800 }, { name: "小明" }], 1200, members, currentUserName)
    expect(payers).toEqual([
      { memberId: "member-1", amount: 800 },
      { memberId: "member-2", amount: 400 },
    ])
  })

  it("dedupes repeated members and keeps the first amount", () => {
    const payers = resolvePayers([{ name: "我", amount: 300 }, { name: "小雨", amount: 200 }], 500, members, currentUserName)
    expect(payers).toEqual([{ memberId: "member-1", amount: 300 }])
  })
})

describe("EXPENSE_CATEGORIES", () => {
  it("should contain all expected categories", () => {
    expect(EXPENSE_CATEGORIES).toContain("food")
    expect(EXPENSE_CATEGORIES).toContain("transport")
    expect(EXPENSE_CATEGORIES).toContain("accommodation")
    expect(EXPENSE_CATEGORIES).toContain("ticket")
    expect(EXPENSE_CATEGORIES).toContain("shopping")
    expect(EXPENSE_CATEGORIES).toContain("entertainment")
    expect(EXPENSE_CATEGORIES).toContain("gift")
    expect(EXPENSE_CATEGORIES).toContain("other")
  })

  it("should have exactly 8 categories", () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(8)
  })
})
