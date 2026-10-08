import { describe, it, expect } from "vitest"
import { computeProjectAmounts } from "@/lib/expense-project-amounts"

const participants = [
  { memberId: "a", shareAmount: 333.33 },
  { memberId: "b", shareAmount: 333.33 },
  { memberId: "c", shareAmount: 333.34 },
]

describe("computeProjectAmounts", () => {
  it("converts TWD 1000 @ 0.031715 into US$31.72 split three ways", () => {
    const r = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.031715,
      participants,
      payers: [{ memberId: "a", amount: 600 }, { memberId: "b", amount: 400 }],
      discrepancy: new Map(),
    })
    expect(r.totalMinor).toBe(3172)
    expect(r.participants.reduce((s, p) => s + p.shareAmountProject, 0)).toBe(3172)
    expect(r.payers.reduce((s, p) => s + p.amountProject, 0)).toBe(3172)
  })

  it("keeps integers and rate 1 for a same-currency expense", () => {
    const r = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "TWD",
      rate: 1,
      participants: [{ memberId: "a", shareAmount: 1000 }],
      payers: [{ memberId: "a", amount: 1000 }],
      discrepancy: new Map(),
    })
    expect(r.totalMinor).toBe(1000)
    expect(r.participants[0].shareAmountProject).toBe(1000)
    expect(r.payers[0].amountProject).toBe(1000)
  })

  it("does not double-count when recomputing the same split", () => {
    const first = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.031715,
      participants,
      payers: [{ memberId: "a", amount: 1000 }],
      discrepancy: new Map(),
    })
    expect(first.discrepancy.get("a")).toBe(1) // a got the extra minor unit

    const second = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.031715,
      participants,
      payers: [{ memberId: "a", amount: 1000 }],
      discrepancy: new Map(first.discrepancy),
      previous: {
        totalMinor: first.totalMinor,
        participants: first.participants.map((p) => ({
          memberId: p.memberId,
          shareAmount: participants.find((x) => x.memberId === p.memberId)!.shareAmount,
          shareAmountProject: p.shareAmountProject,
        })),
        payers: first.payers.map((p) => ({ memberId: p.memberId, amount: 1000, amountProject: p.amountProject })),
      },
    })
    expect(second.discrepancy.get("a")).toBe(1) // rolled back then re-bumped → still 1
    expect(second.participants.reduce((s, p) => s + p.shareAmountProject, 0)).toBe(3172)
  })
})
