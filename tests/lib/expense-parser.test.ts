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
        { amount: 280, description: "午餐拉麵", category: "food" },
        { amount: 150, description: "計程車", category: "transport" },
      ],
      sharedContext: {
        payerName: "小明",
        participantNames: ["小明", "小華"],
        splitMode: "equal",
      },
      confidence: 0.95,
    }

    const result = ParsedExpensesSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should validate single expense", () => {
    const validData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food" },
      ],
      sharedContext: {
        payerName: "小明",
        participantNames: ["小明"],
        splitMode: "equal",
      },
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should accept empty expenses array", () => {
    const data = {
      expenses: [],
      sharedContext: {
        payerName: "小明",
        participantNames: ["小明"],
        splitMode: "equal",
      },
      confidence: 0.5,
    }

    const result = ParsedExpensesSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("should reject invalid category in expenses", () => {
    const invalidData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "invalid" },
      ],
      sharedContext: {
        payerName: "小明",
        participantNames: ["小明"],
        splitMode: "equal",
      },
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject invalid splitMode", () => {
    const invalidData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food" },
      ],
      sharedContext: {
        payerName: "小明",
        participantNames: ["小明"],
        splitMode: "invalid",
      },
      confidence: 0.9,
    }

    const result = ParsedExpensesSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject confidence out of range", () => {
    const invalidData = {
      expenses: [
        { amount: 280, description: "午餐拉麵", category: "food" },
      ],
      sharedContext: {
        payerName: "小明",
        participantNames: ["小明"],
        splitMode: "equal",
      },
      confidence: 1.5,
    }

    const result = ParsedExpensesSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
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
