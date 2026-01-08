import { describe, it, expect, vi } from "vitest"
import { EXPENSE_CATEGORIES, ParsedExpensesSchema, findMemberIdByName, mapNamesToIds } from "@/lib/ai/expense-parser"
import type {
  MemberInfo,
  ParseExpenseInput,
  ExpenseItemResult,
  ParseExpensesResult,
  ParseExpenseResult,
} from "@/lib/ai/expense-parser"

describe("expense-parser types and schemas", () => {
  describe("EXPENSE_CATEGORIES", () => {
    it("should export expense categories", () => {
      expect(EXPENSE_CATEGORIES).toContain("food")
      expect(EXPENSE_CATEGORIES).toContain("transport")
      expect(EXPENSE_CATEGORIES).toContain("accommodation")
      expect(EXPENSE_CATEGORIES).toContain("ticket")
      expect(EXPENSE_CATEGORIES).toContain("shopping")
      expect(EXPENSE_CATEGORIES).toContain("entertainment")
      expect(EXPENSE_CATEGORIES).toContain("gift")
      expect(EXPENSE_CATEGORIES).toContain("other")
    })

    it("should have 8 categories", () => {
      expect(EXPENSE_CATEGORIES.length).toBe(8)
    })
  })

  describe("ParsedExpensesSchema", () => {
    it("should validate valid expense data", () => {
      const validData = {
        expenses: [
          {
            amount: 100,
            description: "午餐",
            category: "food",
            payerName: "小明",
            participantNames: ["小明", "小華"],
          },
        ],
        confidence: 0.9,
      }

      const result = ParsedExpensesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate expense with currency", () => {
      const validData = {
        expenses: [
          {
            amount: 1000,
            description: "晚餐",
            category: "food",
            currency: "JPY",
            payerName: "小明",
            participantNames: ["小明"],
          },
        ],
        confidence: 0.8,
      }

      const result = ParsedExpensesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid category", () => {
      const invalidData = {
        expenses: [
          {
            amount: 100,
            description: "test",
            category: "invalid-category",
            payerName: "test",
            participantNames: [],
          },
        ],
        confidence: 0.5,
      }

      const result = ParsedExpensesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject confidence below 0", () => {
      const invalidData = {
        expenses: [],
        confidence: -0.5,
      }

      const result = ParsedExpensesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject confidence above 1", () => {
      const invalidData = {
        expenses: [],
        confidence: 1.5,
      }

      const result = ParsedExpensesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should allow empty expenses array", () => {
      const validData = {
        expenses: [],
        confidence: 0.5,
      }

      const result = ParsedExpensesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate multiple expenses", () => {
      const validData = {
        expenses: [
          {
            amount: 100,
            description: "早餐",
            category: "food",
            payerName: "A",
            participantNames: ["A", "B"],
          },
          {
            amount: 50,
            description: "公車",
            category: "transport",
            payerName: "B",
            participantNames: ["A", "B"],
          },
        ],
        confidence: 0.85,
      }

      const result = ParsedExpensesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe("type interfaces", () => {
    it("should define MemberInfo correctly", () => {
      const member: MemberInfo = {
        id: "user-123",
        displayName: "小明",
      }

      expect(member.id).toBe("user-123")
      expect(member.displayName).toBe("小明")
    })

    it("should define ParseExpenseInput correctly", () => {
      const input: ParseExpenseInput = {
        transcript: "午餐 100 小明付",
        members: [{ id: "1", displayName: "小明" }],
        currentUserName: "小明",
        defaultCurrency: "TWD",
      }

      expect(input.transcript).toBe("午餐 100 小明付")
      expect(input.members.length).toBe(1)
      expect(input.defaultCurrency).toBe("TWD")
    })

    it("should define ExpenseItemResult correctly", () => {
      const item: ExpenseItemResult = {
        id: "temp-123",
        amount: 100,
        description: "午餐",
        category: "food",
        currency: "TWD",
        payerId: "user-1",
        participantIds: ["user-1", "user-2"],
        selected: true,
      }

      expect(item.id).toBe("temp-123")
      expect(item.selected).toBe(true)
    })

    it("should define ParseExpensesResult correctly", () => {
      const result: ParseExpensesResult = {
        expenses: [
          {
            id: "1",
            amount: 100,
            description: "test",
            category: "food",
            currency: "TWD",
            payerId: "u1",
            participantIds: ["u1"],
            selected: true,
          },
        ],
        confidence: 0.9,
      }

      expect(result.expenses.length).toBe(1)
      expect(result.confidence).toBe(0.9)
    })

    it("should define ParseExpenseResult correctly (legacy)", () => {
      const result: ParseExpenseResult = {
        amount: 100,
        description: "午餐",
        category: "food",
        payerId: "user-1",
        participantIds: ["user-1", "user-2"],
        splitMode: "equal",
        confidence: 0.8,
      }

      expect(result.splitMode).toBe("equal")
      expect(result.payerId).toBe("user-1")
    })

    it("should allow null payerId in ParseExpenseResult", () => {
      const result: ParseExpenseResult = {
        amount: 100,
        description: "test",
        category: "other",
        payerId: null,
        participantIds: [],
        splitMode: "custom",
        confidence: 0.5,
      }

      expect(result.payerId).toBeNull()
    })
  })

  describe("all expense categories", () => {
    const categories = [
      "food",
      "transport",
      "accommodation",
      "ticket",
      "shopping",
      "entertainment",
      "gift",
      "other",
    ] as const

    categories.forEach(category => {
      it(`should accept category: ${category}`, () => {
        const data = {
          expenses: [
            {
              amount: 100,
              description: "test",
              category,
              payerName: "test",
              participantNames: [],
            },
          ],
          confidence: 0.5,
        }

        const result = ParsedExpensesSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("currency codes", () => {
    const currencies = ["USD", "EUR", "GBP", "AUD", "CAD", "TWD", "JPY", "KRW", "CNY", "HKD", "SGD", "THB", "VND"]

    currencies.forEach(currency => {
      it(`should accept currency: ${currency}`, () => {
        const data = {
          expenses: [
            {
              amount: 100,
              description: "test",
              category: "other",
              currency,
              payerName: "test",
              participantNames: [],
            },
          ],
          confidence: 0.5,
        }

        const result = ParsedExpensesSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("findMemberIdByName", () => {
    const members: MemberInfo[] = [
      { id: "user-1", displayName: "小明" },
      { id: "user-2", displayName: "小華" },
      { id: "user-3", displayName: "小美" },
    ]
    const currentUserName = "小明"

    it("should find member by exact name match", () => {
      expect(findMemberIdByName("小明", members, currentUserName)).toBe("user-1")
      expect(findMemberIdByName("小華", members, currentUserName)).toBe("user-2")
      expect(findMemberIdByName("小美", members, currentUserName)).toBe("user-3")
    })

    it("should find member by partial match (name includes query)", () => {
      const membersWithLongNames: MemberInfo[] = [
        { id: "user-1", displayName: "王小明" },
        { id: "user-2", displayName: "李小華" },
      ]
      expect(findMemberIdByName("小明", membersWithLongNames, "王小明")).toBe("user-1")
      expect(findMemberIdByName("小華", membersWithLongNames, "王小明")).toBe("user-2")
    })

    it("should find member by partial match (query includes name)", () => {
      expect(findMemberIdByName("小明同學", members, currentUserName)).toBe("user-1")
    })

    it("should return current user for '我' related keywords", () => {
      expect(findMemberIdByName("我", members, currentUserName)).toBe("user-1")
      expect(findMemberIdByName("自己", members, currentUserName)).toBe("user-1")
      expect(findMemberIdByName("本人", members, currentUserName)).toBe("user-1")
    })

    it("should return first member if no match found", () => {
      expect(findMemberIdByName("不存在的人", members, currentUserName)).toBe("user-1")
    })

    it("should return null for empty members array", () => {
      expect(findMemberIdByName("小明", [], currentUserName)).toBeNull()
    })
  })

  describe("mapNamesToIds", () => {
    const members: MemberInfo[] = [
      { id: "user-1", displayName: "小明" },
      { id: "user-2", displayName: "小華" },
      { id: "user-3", displayName: "小美" },
    ]

    it("should map multiple names to IDs", () => {
      const result = mapNamesToIds(["小明", "小華"], members)
      expect(result).toEqual(["user-1", "user-2"])
    })

    it("should map single name to ID", () => {
      const result = mapNamesToIds(["小美"], members)
      expect(result).toEqual(["user-3"])
    })

    it("should return empty array for empty names", () => {
      const result = mapNamesToIds([], members)
      expect(result).toEqual([])
    })

    it("should skip names that do not match any member", () => {
      const result = mapNamesToIds(["小明", "不存在"], members)
      expect(result).toEqual(["user-1"])
    })

    it("should avoid duplicates", () => {
      const result = mapNamesToIds(["小明", "小明"], members)
      expect(result).toEqual(["user-1"])
    })

    it("should handle partial matches", () => {
      const membersWithLongNames: MemberInfo[] = [
        { id: "user-1", displayName: "王小明" },
        { id: "user-2", displayName: "李小華" },
      ]
      const result = mapNamesToIds(["小明", "小華"], membersWithLongNames)
      expect(result).toEqual(["user-1", "user-2"])
    })
  })
})
