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

  it("returns the allocated original share alongside the settlement share", () => {
    const r = computeProjectAmounts({
      amount: 1000,
      currency: "JPY",
      projectCurrency: "TWD",
      rate: 0.1,
      participants,
      payers: [{ memberId: "a", amount: 1000 }],
      discrepancy: new Map([["a", 5], ["b", 0], ["c", 0]]),
    })
    expect(r.originalTotalMinor).toBe(1000)
    expect(r.participants.map((p) => p.shareAmount)).toEqual([333, 334, 333])
    expect(r.participants.map((p) => p.shareAmountProject)).toEqual([33, 34, 33])
  })

  it("gives identical original and settlement shares for the same currency", () => {
    const r = computeProjectAmounts({
      amount: 667,
      currency: "TWD",
      projectCurrency: "TWD",
      rate: 1,
      participants: [
        { memberId: "a", shareAmount: 222.33 },
        { memberId: "b", shareAmount: 222.33 },
        { memberId: "c", shareAmount: 222.34 },
      ],
      payers: [],
      discrepancy: new Map(),
    })
    expect(r.participants.map((p) => p.shareAmount)).toEqual(r.participants.map((p) => p.shareAmountProject))
    expect(r.participants.reduce((s, p) => s + p.shareAmount, 0)).toBe(667)
    expect(r.participants.reduce((s, p) => s + p.shareAmountProject, 0)).toBe(667)
  })

  it("does not let payer remainders touch the fairness ledger", () => {
    const r = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.031715,
      participants: [{ memberId: "a", shareAmount: 1000 }],
      payers: [
        { memberId: "a", amount: 600 },
        { memberId: "b", amount: 400 },
      ],
      discrepancy: new Map(),
    })
    // The payer split has a remainder, but it must not bump the ledger.
    expect(r.discrepancy.get("a") ?? 0).toBe(0)
    expect(r.discrepancy.get("b") ?? 0).toBe(0)
    expect(r.payers.reduce((s, p) => s + p.amountProject, 0)).toBe(3172)
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
