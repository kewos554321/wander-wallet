import { describe, it, expect } from "vitest"
import {
  computeProjectSummary,
  getRecentExpenses,
  type OverviewExpense,
  type OverviewProject,
} from "@/lib/project-overview"

const identity = (amount: number) => amount

const member = (id: string, userId: string | null) => ({
  id,
  role: "member",
  displayName: id,
  user: userId ? { id: userId, name: id, email: `${id}@x.com`, image: null } : null,
})

function expense(id: string, payerId: string, amount: number, shares: Record<string, number>, extra: Partial<OverviewExpense> = {}): OverviewExpense {
  return {
    id,
    amount,
    currency: "TWD",
    description: id,
    category: "food",
    createdAt: "2026-11-12T10:00:00.000Z",
    payer: { id: payerId, displayName: payerId, user: null },
    participants: Object.entries(shares).map(([memberId, shareAmount]) => ({ id: `${id}-${memberId}`, memberId, shareAmount })),
    ...extra,
  }
}

function project(overrides: Partial<OverviewProject> = {}): OverviewProject {
  return {
    id: "p1",
    name: "東京",
    description: null,
    budget: null,
    currency: "TWD",
    exchangeRatePrecision: 2,
    startDate: null,
    endDate: null,
    customRates: null,
    creator: { id: "u1", name: "Emma", email: "e@x.com" },
    members: [member("me", "u1"), member("chi", "u2")],
    expenses: [],
    ...overrides,
  }
}

describe("computeProjectSummary", () => {
  it("sums totals and per-person amounts", () => {
    const p = project({ expenses: [expense("a", "me", 300, { me: 150, chi: 150 }), expense("b", "chi", 100, { me: 50, chi: 50 })] })
    const s = computeProjectSummary(p, identity, "u1")
    expect(s.totalAmount).toBe(400)
    expect(s.perPerson).toBe(200)
    expect(s.currentMemberId).toBe("me")
    // paid 300, owes 150 + 50
    expect(s.userBalance).toBe(100)
  })

  it("returns zeros for an empty project without NaN", () => {
    const s = computeProjectSummary(project({ members: [], expenses: [] }), identity, "u1")
    expect(s.totalAmount).toBe(0)
    expect(s.perPerson).toBe(0)
    expect(s.userBalance).toBe(0)
    expect(s.currentMemberId).toBeNull()
  })

  it("ignores zero-amount expenses in the balance", () => {
    const p = project({ expenses: [expense("z", "me", 0, { me: 0, chi: 0 })] })
    expect(computeProjectSummary(p, identity, "u1").userBalance).toBe(0)
  })

  it("caps budget progress at 100 and keeps the negative remainder", () => {
    const p = project({ budget: "300", expenses: [expense("a", "me", 400, { me: 200, chi: 200 })] })
    const s = computeProjectSummary(p, identity, "u1")
    expect(s.budget).toBe(300)
    expect(s.budgetProgress).toBe(100)
    expect(s.budgetRemaining).toBe(-100)
  })

  it("has no budget fields when budget is unset", () => {
    const s = computeProjectSummary(project(), identity, "u1")
    expect(s.budget).toBeNull()
    expect(s.budgetProgress).toBe(0)
    expect(s.budgetRemaining).toBeNull()
  })

  it("converts foreign currency and flags mixed currencies", () => {
    const toTwd = (amount: number, currency: string) => (currency === "JPY" ? amount * 0.2 : amount)
    const p = project({
      expenses: [expense("a", "me", 1000, { me: 500, chi: 500 }, { currency: "JPY" }), expense("b", "chi", 100, { me: 50, chi: 50 })],
    })
    const s = computeProjectSummary(p, toTwd, "u1")
    expect(s.totalAmount).toBe(300)
    expect(s.hasMixedCurrencies).toBe(true)
    // paid 200 (converted); owes 100 (half of 200) + 50
    expect(s.userBalance).toBe(50)
  })

  it("gives 0 balance to a non-member viewer", () => {
    const p = project({ expenses: [expense("a", "me", 300, { me: 150, chi: 150 })] })
    expect(computeProjectSummary(p, identity, "stranger").userBalance).toBe(0)
  })
})

describe("getRecentExpenses", () => {
  it("returns the newest first, limited", () => {
    const list = [1, 2, 3, 4, 5, 6].map((d) =>
      expense(`e${d}`, "me", 10, { me: 10 }, { createdAt: `2026-11-0${d}T00:00:00.000Z` })
    )
    expect(getRecentExpenses(list).map((e) => e.id)).toEqual(["e6", "e5", "e4", "e3", "e2"])
    expect(getRecentExpenses(list, 2).map((e) => e.id)).toEqual(["e6", "e5"])
  })
})
