import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the Gemini module
vi.mock("@/lib/ai/gemini", () => ({
  createGeminiModel: vi.fn(() => ({
    invoke: vi.fn(),
  })),
}))

// Mock langchain
vi.mock("@langchain/core/messages", () => ({
  HumanMessage: class MockHumanMessage {
    content: unknown[]
    constructor(data: { content: unknown[] }) {
      this.content = data.content
    }
  },
}))

import { ParsedReceiptSchema, getCategoryLabel } from "@/lib/ai/receipt-parser"
import type { ExpenseCategory } from "@/lib/constants/expenses"

describe("ParsedReceiptSchema", () => {
  it("should validate correct receipt data", () => {
    const validData = {
      amount: 350,
      description: "7-11",
      category: "food",
      date: "2024-12-01",
      confidence: 0.9,
    }

    const result = ParsedReceiptSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should validate receipt with null date", () => {
    const validData = {
      amount: 500,
      description: "商店購物",
      category: "shopping",
      date: null,
      confidence: 0.8,
    }

    const result = ParsedReceiptSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("should reject invalid category", () => {
    const invalidData = {
      amount: 350,
      description: "Test",
      category: "invalid_category",
      date: "2024-12-01",
      confidence: 0.9,
    }

    const result = ParsedReceiptSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject confidence above 1", () => {
    const invalidData = {
      amount: 350,
      description: "Test",
      category: "food",
      date: "2024-12-01",
      confidence: 1.5,
    }

    const result = ParsedReceiptSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should reject confidence below 0", () => {
    const invalidData = {
      amount: 350,
      description: "Test",
      category: "food",
      date: "2024-12-01",
      confidence: -0.1,
    }

    const result = ParsedReceiptSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should validate all expense categories", () => {
    const categories = ["food", "transport", "accommodation", "ticket", "shopping", "entertainment", "gift", "other"]

    categories.forEach((category) => {
      const data = {
        amount: 100,
        description: "Test",
        category,
        date: null,
        confidence: 0.5,
      }

      const result = ParsedReceiptSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  it("should require amount field", () => {
    const invalidData = {
      description: "Test",
      category: "food",
      date: null,
      confidence: 0.5,
    }

    const result = ParsedReceiptSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should require description field", () => {
    const invalidData = {
      amount: 100,
      category: "food",
      date: null,
      confidence: 0.5,
    }

    const result = ParsedReceiptSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it("should accept boundary confidence values", () => {
    const dataWithZero = {
      amount: 100,
      description: "Test",
      category: "food",
      date: null,
      confidence: 0,
    }

    const dataWithOne = {
      amount: 100,
      description: "Test",
      category: "food",
      date: null,
      confidence: 1,
    }

    expect(ParsedReceiptSchema.safeParse(dataWithZero).success).toBe(true)
    expect(ParsedReceiptSchema.safeParse(dataWithOne).success).toBe(true)
  })
})

describe("getCategoryLabel", () => {
  it("should return 餐飲 for food", () => {
    expect(getCategoryLabel("food")).toBe("餐飲")
  })

  it("should return 交通 for transport", () => {
    expect(getCategoryLabel("transport")).toBe("交通")
  })

  it("should return 住宿 for accommodation", () => {
    expect(getCategoryLabel("accommodation")).toBe("住宿")
  })

  it("should return 票券 for ticket", () => {
    expect(getCategoryLabel("ticket")).toBe("票券")
  })

  it("should return 購物 for shopping", () => {
    expect(getCategoryLabel("shopping")).toBe("購物")
  })

  it("should return 娛樂 for entertainment", () => {
    expect(getCategoryLabel("entertainment")).toBe("娛樂")
  })

  it("should return 禮品 for gift", () => {
    expect(getCategoryLabel("gift")).toBe("禮品")
  })

  it("should return 其他 for other", () => {
    expect(getCategoryLabel("other")).toBe("其他")
  })

  it("should return 其他 for unknown category", () => {
    expect(getCategoryLabel("unknown" as ExpenseCategory)).toBe("其他")
  })
})

describe("exports", () => {
  it("should export ParsedReceiptSchema", () => {
    expect(ParsedReceiptSchema).toBeDefined()
  })

  it("should export getCategoryLabel function", () => {
    expect(getCategoryLabel).toBeDefined()
    expect(typeof getCategoryLabel).toBe("function")
  })
})
