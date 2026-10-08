import { describe, it, expect } from "vitest"
import { groupExpensesByDay, formatMonthDayTime, summarizeExpenses } from "@/lib/expense-list"

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).toISOString()
const now = new Date(2026, 10, 16, 21, 0)

describe("groupExpensesByDay", () => {
  it("groups by local day, newest first, and marks today", () => {
    const list = [
      { id: "a", expenseDate: at(11, 15, 9) },
      { id: "b", expenseDate: at(11, 16, 8, 10) },
      { id: "c", expenseDate: at(11, 16, 19, 20) },
      { id: "d", expenseDate: at(11, 15, 23, 59) },
    ]
    const groups = groupExpensesByDay(list, now)
    expect(groups.map((g) => g.label)).toEqual(["11/16（今天）", "11/15"])
    expect(groups[0].expenses.map((e) => e.id)).toEqual(["c", "b"])
    expect(groups[1].expenses.map((e) => e.id)).toEqual(["d", "a"])
  })

  it("keeps an expense just after midnight on the new day", () => {
    const groups = groupExpensesByDay([{ id: "x", expenseDate: at(11, 16, 0, 5) }], now)
    expect(groups[0].label).toBe("11/16（今天）")
  })

  it("returns no groups for no expenses", () => {
    expect(groupExpensesByDay([], now)).toEqual([])
  })
})

describe("formatMonthDayTime", () => {
  it("formats local month/day and zero-padded 24h time", () => {
    expect(formatMonthDayTime(at(11, 6, 8, 5))).toBe("11/6 08:05")
    expect(formatMonthDayTime(at(1, 16, 19, 20))).toBe("1/16 19:20")
  })
})

describe("summarizeExpenses", () => {
  it("sums in project currency and averages", () => {
    const toTwd = (amount: number, currency: string) => (currency === "JPY" ? amount * 0.2 : amount)
    expect(
      summarizeExpenses(
        [
          { amount: 1000, currency: "JPY" },
          { amount: 100, currency: "TWD" },
        ],
        toTwd
      )
    ).toEqual({ total: 300, count: 2, average: 150 })
  })

  it("uses stored settlement amounts without a converter", () => {
    const result = summarizeExpenses(
      [
        { amount: 1000, currency: "TWD", amountProject: 3172 },
        { amount: 500, currency: "TWD", amountProject: 1586 },
      ],
      undefined,
      "USD"
    )
    expect(result.count).toBe(2)
    expect(result.total).toBeCloseTo(47.58)
    expect(result.average).toBeCloseTo(23.79)
  })

  it("returns zeros for an empty list", () => {
    expect(summarizeExpenses([], (a) => a)).toEqual({ total: 0, count: 0, average: 0 })
  })
})
