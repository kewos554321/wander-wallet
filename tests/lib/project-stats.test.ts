// tests/lib/project-stats.test.ts
import { describe, it, expect } from "vitest"
import { computeProjectStats, type StatsInput } from "@/lib/project-stats"

const identity = (amount: number) => amount
const day = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString()

function expense(
  amount: number,
  category: string | null,
  date: string,
  payer: string | { memberId: string; amount: number }[],
  shares: Record<string, number>,
  currency = "TWD"
) {
  const payers = Array.isArray(payer) ? payer : [{ memberId: payer, amount }]
  return {
    amount,
    currency,
    category,
    expenseDate: date,
    createdAt: date,
    payers,
    participants: Object.entries(shares).map(([memberId, shareAmount]) => ({ memberId, shareAmount })),
  }
}

const members = [
  { id: "me", displayName: "Emma" },
  { id: "chi", displayName: "志明" },
]

describe("computeProjectStats", () => {
  it("computes category share, member totals and daily totals", () => {
    const input: StatsInput = {
      members,
      expenses: [
        expense(300, "food", day(11, 12), "me", { me: 150, chi: 150 }),
        expense(100, "transport", day(11, 12), "chi", { me: 50, chi: 50 }),
        expense(600, "food", day(11, 13), "chi", { me: 300, chi: 300 }),
      ],
    }
    const stats = computeProjectStats(input, identity)
    expect(stats.total).toBe(1000)
    expect(stats.categories).toEqual([
      { category: "food", amount: 900, percent: 90 },
      { category: "transport", amount: 100, percent: 10 },
    ])
    expect(stats.members).toEqual([
      { id: "me", name: "Emma", paid: 300, share: 500, balance: -200 },
      { id: "chi", name: "志明", paid: 700, share: 500, balance: 200 },
    ])
    expect(stats.daily).toEqual([
      { date: "11/12", amount: 400 },
      { date: "11/13", amount: 600 },
    ])
  })

  it("groups a missing category as other and converts currency", () => {
    const toTwd = (amount: number, currency: string) => (currency === "JPY" ? amount * 0.2 : amount)
    const stats = computeProjectStats(
      { members, expenses: [expense(1000, null, day(11, 12), "me", { me: 1000 }, "JPY")] },
      toTwd
    )
    expect(stats.categories).toEqual([{ category: "other", amount: 200, percent: 100 }])
    expect(stats.members[0].share).toBe(200)
  })

  it("prefers stored settlement amounts over the convert callback", () => {
    const input: StatsInput = {
      members,
      expenses: [
        {
          amount: 1000,
          currency: "TWD",
          amountProject: 3172,
          category: "food",
          expenseDate: day(11, 12),
          createdAt: day(11, 12),
          payers: [{ memberId: "me", amount: 1000, amountProject: 3172 }],
          participants: [{ memberId: "me", shareAmount: 1000, shareAmountProject: 3172 }],
        },
      ],
    }
    const stats = computeProjectStats(input, () => 999, "USD")
    expect(stats.total).toBeCloseTo(31.72)
    expect(stats.members[0].paid).toBeCloseTo(31.72)
    expect(stats.members[0].share).toBeCloseTo(31.72)
  })

  it("keeps only the last 7 expense days", () => {
    const expenses = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => expense(10, "food", day(11, d), "me", { me: 10 }))
    const stats = computeProjectStats({ members, expenses }, identity)
    expect(stats.daily.map((d) => d.date)).toEqual(["11/3", "11/4", "11/5", "11/6", "11/7", "11/8", "11/9"])
  })

  it("returns empty stats without NaN for a project with no expenses", () => {
    const stats = computeProjectStats({ members, expenses: [] }, identity)
    expect(stats).toEqual({
      total: 0,
      categories: [],
      members: [
        { id: "me", name: "Emma", paid: 0, share: 0, balance: 0 },
        { id: "chi", name: "志明", paid: 0, share: 0, balance: 0 },
      ],
      daily: [],
    })
  })

  it("skips shares of zero-amount expenses", () => {
    const stats = computeProjectStats({ members, expenses: [expense(0, "food", day(11, 1), "me", { me: 0 })] }, identity)
    expect(stats.members[0].share).toBe(0)
    expect(stats.categories[0].percent).toBe(0)
  })

  it("credits each payer's own amount for a multi-payer expense", () => {
    const stats = computeProjectStats(
      {
        members,
        expenses: [
          expense(
            300,
            "food",
            day(11, 12),
            [
              { memberId: "me", amount: 100 },
              { memberId: "chi", amount: 200 },
            ],
            { me: 150, chi: 150 }
          ),
        ],
      },
      identity
    )
    expect(stats.members).toEqual([
      { id: "me", name: "Emma", paid: 100, share: 150, balance: -50 },
      { id: "chi", name: "志明", paid: 200, share: 150, balance: 50 },
    ])
  })
})
