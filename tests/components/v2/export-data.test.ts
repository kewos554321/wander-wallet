import { describe, it, expect } from "vitest"
import { convertToProjectCurrency, buildExportData, type ExportExpenseInput } from "@/components/v2/export/export-data"
import type { ExportFilterOptions } from "@/lib/export/types"

const ctx = { projectCurrency: "TWD", customRates: { JPY: 0.21 } as Record<string, number> | null, exchangeRates: null as Record<string, number> | null }
const members = [
  { id: "m1", displayName: "志明" },
  { id: "m2", displayName: "小美" },
]
const expenses: ExportExpenseInput[] = [
  {
    id: "e1",
    amount: 1000,
    currency: "TWD",
    description: "拉麵",
    category: "food",
    expenseDate: "2026-10-18T00:00:00.000Z",
    payers: [{ memberId: "m1", amount: 1000, member: { id: "m1", displayName: "志明" } }],
    participants: [
      { shareAmount: 500, member: { id: "m1", displayName: "志明" } },
      { shareAmount: 500, member: { id: "m2", displayName: "小美" } },
    ],
  },
  {
    id: "e2",
    amount: 10000,
    currency: "JPY",
    description: null,
    category: "accommodation",
    expenseDate: "2026-10-19T00:00:00.000Z",
    payers: [{ memberId: "m2", amount: 10000, member: { id: "m2", displayName: "小美" } }],
    participants: [{ shareAmount: 10000, member: { id: "m2", displayName: "小美" } }],
  },
]

describe("convertToProjectCurrency", () => {
  it("returns the amount unchanged for the project currency", () => {
    expect(convertToProjectCurrency(1000, "TWD", ctx)).toBe(1000)
  })

  it("uses a custom rate and rounds to 2 decimals", () => {
    expect(convertToProjectCurrency(10000, "JPY", ctx)).toBe(2100)
  })

  it("returns the original amount when no rates are available (Review Focus 1)", () => {
    expect(
      convertToProjectCurrency(10000, "JPY", { projectCurrency: "TWD", customRates: null, exchangeRates: null })
    ).toBe(10000)
  })

  it("uses live rates via to/from", () => {
    expect(
      convertToProjectCurrency(100, "JPY", { projectCurrency: "TWD", customRates: null, exchangeRates: { TWD: 31.5, JPY: 150 } })
    ).toBe(21)
  })
})

describe("buildExportData", () => {
  const build = (filters: ExportFilterOptions = {}) =>
    buildExportData({ projectName: "Trip", projectCurrency: "TWD", members, expenses, filters, ctx })

  it("converts and totals the expenses", () => {
    const data = build()
    expect(data.currency).toBe("TWD")
    expect(data.projectName).toBe("Trip")
    expect(data.expenses).toHaveLength(2)
    expect(data.expenses[1].amount).toBe(2100)
    expect(data.expenses[0].payer).toBe("志明")
    expect(data.expenses[0].participantShares).toEqual([
      { name: "志明", amount: 500 },
      { name: "小美", amount: 500 },
    ])
    expect(data.statistics.totalExpenses).toBe(2)
    expect(data.statistics.totalAmount).toBe(3100)
    expect(data.statistics.memberCount).toBe(2)
    expect(data.statistics.perPerson).toBe(1550)
  })

  it("computes member balances and greedy settlements", () => {
    const data = build()
    const chih = data.statistics.memberBreakdown.find((m) => m.name === "志明")!
    expect(chih).toEqual({ name: "志明", paid: 1000, share: 500, balance: 500 })
    expect(data.settlements).toEqual([{ from: "小美", to: "志明", amount: 500 }])
  })

  it("breaks down categories with percentages", () => {
    const data = build()
    const food = data.statistics.categoryBreakdown.find((c) => c.category === "food")!
    expect(food.amount).toBe(1000)
    expect(food.count).toBe(1)
    expect(food.percentage).toBeCloseTo(32.258, 2)
  })

  it("filters by category", () => {
    const data = build({ categories: ["food"] })
    expect(data.expenses.map((e) => e.id)).toEqual(["e1"])
    expect(data.statistics.totalAmount).toBe(1000)
  })

  it("filters by date range", () => {
    const data = build({ dateRange: { start: new Date("2026-10-19T00:00:00.000Z"), end: null } })
    expect(data.expenses.map((e) => e.id)).toEqual(["e2"])
  })

  it("does not conflate two members with the same display name", () => {
    const dupMembers = [
      { id: "m1", displayName: "志明" },
      { id: "m2", displayName: "志明" },
    ]
    const dupExpenses: ExportExpenseInput[] = [
      { id: "d1", amount: 1000, currency: "TWD", description: null, category: "food", expenseDate: "2026-10-18T00:00:00.000Z", payers: [{ memberId: "m1", amount: 1000, member: { id: "m1", displayName: "志明" } }], participants: [{ shareAmount: 1000, member: { id: "m1", displayName: "志明" } }] },
      { id: "d2", amount: 2000, currency: "TWD", description: null, category: "food", expenseDate: "2026-10-18T00:00:00.000Z", payers: [{ memberId: "m2", amount: 2000, member: { id: "m2", displayName: "志明" } }], participants: [{ shareAmount: 2000, member: { id: "m2", displayName: "志明" } }] },
    ]
    const data = buildExportData({ projectName: "Trip", projectCurrency: "TWD", members: dupMembers, expenses: dupExpenses, filters: {}, ctx })
    expect(data.statistics.memberBreakdown).toEqual([
      { name: "志明", paid: 1000, share: 1000, balance: 0 },
      { name: "志明", paid: 2000, share: 2000, balance: 0 },
    ])
  })

  it("joins payer names and accumulates each payer's own amount (multi-payer)", () => {
    const multiPayerExpenses: ExportExpenseInput[] = [
      {
        id: "mp1",
        amount: 1000,
        currency: "TWD",
        description: "共同晚餐",
        category: "food",
        expenseDate: "2026-10-18T00:00:00.000Z",
        payers: [
          { memberId: "m1", amount: 600, member: { id: "m1", displayName: "志明" } },
          { memberId: "m2", amount: 400, member: { id: "m2", displayName: "小美" } },
        ],
        participants: [
          { shareAmount: 500, member: { id: "m1", displayName: "志明" } },
          { shareAmount: 500, member: { id: "m2", displayName: "小美" } },
        ],
      },
    ]
    const data = buildExportData({ projectName: "Trip", projectCurrency: "TWD", members, expenses: multiPayerExpenses, filters: {}, ctx })
    expect(data.expenses[0].payer).toBe("志明、小美")
    expect(data.statistics.memberBreakdown).toEqual([
      { name: "志明", paid: 600, share: 500, balance: 100 },
      { name: "小美", paid: 400, share: 500, balance: -100 },
    ])
    expect(data.settlements).toEqual([{ from: "小美", to: "志明", amount: 100 }])
  })
})
