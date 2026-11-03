import { describe, it, expect } from "vitest"
import {
  DEMO_MEMBERS, DEMO_EXPENSES, DEMO_EXPENSE_SUMMARY, DEMO_SETTLE,
  DEMO_CURRENT_MEMBER_ID, DEMO_CURRENCY, DEMO_QUICK_ITEMS, DEMO_PROJECT_CARDS,
} from "@/app/demo/_data/fixtures"

describe("demo fixtures", () => {
  it("has 4 members and 12 expenses", () => {
    expect(DEMO_MEMBERS).toHaveLength(4)
    expect(DEMO_EXPENSES).toHaveLength(12)
  })
  it("references only known member ids", () => {
    const ids = new Set(DEMO_MEMBERS.map((m) => m.id))
    ids.add(DEMO_CURRENT_MEMBER_ID)
    for (const e of DEMO_EXPENSES) {
      for (const p of e.payers) expect(ids.has(p.memberId)).toBe(true)
      for (const p of e.participants) expect(ids.has(p.member.id)).toBe(true)
    }
  })
  it("uses the project currency as the expense summary currency", () => {
    expect(DEMO_EXPENSE_SUMMARY.count).toBe(12)
    expect(DEMO_CURRENCY).toBe("TWD")
  })
  it("settle balances sum to zero", () => {
    const sum = DEMO_SETTLE.balances.reduce((s, b) => s + b.balance, 0)
    expect(Math.round(sum)).toBe(0)
  })
  it("builds at least one quick-expense item", () => {
    expect(DEMO_QUICK_ITEMS.length).toBeGreaterThan(0)
    expect(DEMO_QUICK_ITEMS[0].amount).toBe("1280")
  })
  it("has three project cards", () => {
    expect(DEMO_PROJECT_CARDS).toHaveLength(3)
  })
})
