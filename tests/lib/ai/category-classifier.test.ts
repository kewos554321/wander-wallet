import { beforeEach, describe, expect, it, vi } from "vitest"
import { EXPENSE_CATEGORIES } from "@/lib/constants/expenses"

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn(() => ({ pipe: vi.fn(() => ({ invoke: mocks.invoke })) })),
  },
}))

vi.mock("@langchain/deepseek", () => ({
  ChatDeepSeek: class MockChatDeepSeek {
    withStructuredOutput() {
      return {}
    }
  },
}))

import {
  CategoryClassificationSchema,
  classifyExpenseCategory,
} from "@/lib/ai/category-classifier"

describe("CategoryClassificationSchema", () => {
  it("accepts every expense category", () => {
    for (const category of EXPENSE_CATEGORIES) {
      expect(CategoryClassificationSchema.safeParse({ category, confidence: 0.9 }).success).toBe(true)
    }
  })

  it("rejects an unknown category", () => {
    expect(CategoryClassificationSchema.safeParse({ category: "groceries", confidence: 0.9 }).success).toBe(false)
  })

  it("rejects confidence outside 0 to 1", () => {
    expect(CategoryClassificationSchema.safeParse({ category: "food", confidence: -0.1 }).success).toBe(false)
    expect(CategoryClassificationSchema.safeParse({ category: "food", confidence: 1.1 }).success).toBe(false)
  })
})

describe("classifyExpenseCategory", () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
  })

  it("rejects a blank description before calling the model", async () => {
    await expect(classifyExpenseCategory("   ")).rejects.toThrow("請提供描述")
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it("returns the classification from the model", async () => {
    mocks.invoke.mockResolvedValue({ category: "transport", confidence: 0.82 })

    await expect(classifyExpenseCategory("  計程車  ")).resolves.toEqual({
      category: "transport",
      confidence: 0.82,
    })
    expect(mocks.invoke).toHaveBeenCalledWith({ description: "計程車" })
  })
})
