import { describe, it, expect } from "vitest"
import {
  toMinorUnits,
  fromMinorUnits,
  roundMajorToMinor,
  allocate,
  rollbackAllocation,
  resolveRate,
  previewRate,
  roundRateForDisplay,
} from "@/lib/currency-conversion"
import { computeProjectAmounts } from "@/lib/expense-project-amounts"

// Deterministic PRNG so fuzz tests never flake.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min

describe("allocate — invariants (fuzz)", () => {
  it("always sums to totalMinor and never deviates from floor/ceil by more than 1 unit", () => {
    const rng = mulberry32(1234)
    for (let iter = 0; iter < 5000; iter++) {
      const n = randInt(rng, 1, 8)
      const total = randInt(rng, 0, 100000)
      const weights = Array.from({ length: n }, (_, i) => ({
        id: `m${i}`,
        weight: rng() < 0.1 ? 0 : randInt(rng, 0, 1000),
      }))
      const discrepancy = new Map(weights.map((w) => [w.id, randInt(rng, -5, 5)]))

      const { allocations, bumped } = allocate(total, weights, discrepancy)

      const sum = [...allocations.values()].reduce((s, v) => s + v, 0)
      expect(sum).toBe(total)

      const totalWeight = weights.reduce((s, w) => s + w.weight, 0)
      const effTotal = totalWeight === 0 ? n : totalWeight
      for (const w of weights) {
        const effWeight = totalWeight === 0 ? 1 : w.weight
        const exact = (total * effWeight) / effTotal
        const value = allocations.get(w.id)!
        expect(value).toBeGreaterThanOrEqual(Math.floor(exact))
        expect(value).toBeLessThanOrEqual(Math.ceil(exact))
      }
      expect(bumped.length).toBe(total - weights.reduce((s, w) => s + Math.floor((total * (totalWeight === 0 ? 1 : w.weight)) / effTotal), 0))
    }
  })

  it("hands the remainder to the lowest-discrepancy members first", () => {
    const weights = [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 1 }]
    const { allocations } = allocate(1001, weights, new Map([["a", 5], ["b", -2], ["c", 0]]))
    // exact 333.67 → everyone floored to 333, remainder 2 → lowest ledger first: b, then c
    expect(allocations.get("b")).toBe(334)
    expect(allocations.get("c")).toBe(334)
    expect(allocations.get("a")).toBe(333)
  })
})

describe("allocate — long-run fairness", () => {
  it("keeps the spread of total allocations within 1 minor unit over many expenses", () => {
    const members = ["a", "b", "c", "d"]
    const ledger = new Map(members.map((m) => [m, 0]))
    const totals = new Map(members.map((m) => [m, 0]))

    for (let i = 0; i < 300; i++) {
      const total = 1000 + (i % 13)
      const { allocations, bumped } = allocate(
        total,
        members.map((m) => ({ id: m, weight: 1 })),
        ledger,
      )
      for (const m of members) totals.set(m, totals.get(m)! + allocations.get(m)!)
      for (const id of bumped) ledger.set(id, ledger.get(id)! + 1)
    }

    const values = [...totals.values()]
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })

  it("keeps the ledger bounded (max − min ≤ 1) at every step", () => {
    const members = ["a", "b", "c"]
    const ledger = new Map(members.map((m) => [m, 0]))
    for (let i = 0; i < 200; i++) {
      const r = allocate(1000 + (i % 5), members.map((m) => ({ id: m, weight: 1 })), ledger)
      for (const id of r.bumped) ledger.set(id, ledger.get(id)! + 1)
      const vals = [...ledger.values()]
      expect(Math.max(...vals) - Math.min(...vals)).toBeLessThanOrEqual(1)
    }
  })
})

describe("rollbackAllocation — inverts allocate exactly (fuzz)", () => {
  it("restores the original ledger for random inputs", () => {
    const rng = mulberry32(99)
    for (let iter = 0; iter < 5000; iter++) {
      const n = randInt(rng, 1, 6)
      const total = randInt(rng, 0, 50000)
      const weights = Array.from({ length: n }, (_, i) => ({ id: `m${i}`, weight: randInt(rng, 0, 500) }))
      const before = new Map(weights.map((w) => [w.id, randInt(rng, -10, 10)]))

      const { allocations, bumped } = allocate(total, weights, before)
      const after = new Map(before)
      for (const id of bumped) after.set(id, after.get(id)! + 1)

      const restored = rollbackAllocation(total, weights, allocations, after)
      for (const w of weights) {
        expect(restored.get(w.id)).toBe(before.get(w.id))
      }
    }
  })
})

describe("computeProjectAmounts — invariants (fuzz)", () => {
  it("keeps Σ participants = Σ payers = totalMinor and integer minor units", () => {
    const rng = mulberry32(7)
    for (let iter = 0; iter < 2000; iter++) {
      const nPart = randInt(rng, 1, 5)
      const nPay = randInt(rng, 1, 3)
      const amount = randInt(rng, 1, 10000)
      const rate = (500 + randInt(rng, 0, 900)) / 10000 // 0.05 .. 0.14
      const participants = Array.from({ length: nPart }, (_, i) => ({
        memberId: `p${i}`,
        shareAmount: amount / nPart,
      }))
      const payers = Array.from({ length: nPay }, (_, i) => ({
        memberId: `y${i}`,
        amount: amount / nPay,
      }))
      const discrepancy = new Map<string, number>()

      const r = computeProjectAmounts({
        amount,
        currency: "TWD",
        projectCurrency: "USD",
        rate,
        participants,
        payers,
        discrepancy,
      })

      expect(r.totalMinor).toBe(
        toMinorUnits(roundMajorToMinor(amount * rate, "USD"), "USD"),
      )
      expect(r.participants.reduce((s, p) => s + p.shareAmountProject, 0)).toBe(r.totalMinor)
      expect(r.payers.reduce((s, p) => s + p.amountProject, 0)).toBe(r.totalMinor)
      for (const p of r.participants) expect(Number.isInteger(p.shareAmountProject)).toBe(true)
      for (const p of r.payers) expect(Number.isInteger(p.amountProject)).toBe(true)
    }
  })

  it("same-currency expense keeps integer amounts and equals the total", () => {
    const r = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "TWD",
      rate: 1,
      participants: [
        { memberId: "a", shareAmount: 333 },
        { memberId: "b", shareAmount: 333 },
        { memberId: "c", shareAmount: 334 },
      ],
      payers: [{ memberId: "a", amount: 600 }, { memberId: "b", amount: 400 }],
      discrepancy: new Map(),
    })
    expect(r.totalMinor).toBe(1000)
    expect(r.participants.reduce((s, p) => s + p.shareAmountProject, 0)).toBe(1000)
    expect(r.payers.reduce((s, p) => s + p.amountProject, 0)).toBe(1000)
  })

  it("recomputing the same split with `previous` is idempotent (no ledger drift)", () => {
    const participants = [
      { memberId: "a", shareAmount: 333.33 },
      { memberId: "b", shareAmount: 333.33 },
      { memberId: "c", shareAmount: 333.34 },
    ]
    const payers = [{ memberId: "a", amount: 1000 }]

    let result = computeProjectAmounts({
      amount: 1000,
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.031715,
      participants,
      payers,
      discrepancy: new Map(),
    })
    const ledgerAfterFirst = new Map(result.discrepancy)

    for (let i = 0; i < 5; i++) {
      const before = new Map(result.discrepancy)
      result = computeProjectAmounts({
        amount: 1000,
        currency: "TWD",
        projectCurrency: "USD",
        rate: 0.031715,
        participants,
        payers,
        discrepancy: before,
        previous: {
          totalMinor: result.totalMinor,
          participants: result.participants.map((p) => ({
            memberId: p.memberId,
            shareAmount: participants.find((x) => x.memberId === p.memberId)!.shareAmount,
            shareAmountProject: p.shareAmountProject,
          })),
          payers: result.payers.map((p) => ({
            memberId: p.memberId,
            amount: 1000,
            amountProject: p.amountProject,
          })),
        },
      })
    }

    for (const [id, value] of ledgerAfterFirst) {
      expect(result.discrepancy.get(id)).toBe(value)
    }
    expect(result.participants.reduce((s, p) => s + p.shareAmountProject, 0)).toBe(result.totalMinor)
  })

  it("spreads the remainder fairly across many sequential expenses (spread ≤ 1)", () => {
    const members = ["a", "b", "c"]
    const totals = new Map(members.map((m) => [m, 0]))
    let discrepancy = new Map<string, number>()
    for (let i = 0; i < 150; i++) {
      const r = computeProjectAmounts({
        amount: 100,
        currency: "EUR",
        projectCurrency: "USD",
        rate: 1.07,
        participants: members.map((m) => ({ memberId: m, shareAmount: 100 / members.length })),
        payers: [{ memberId: "a", amount: 100 }],
        discrepancy,
      })
      discrepancy = r.discrepancy
      for (const p of r.participants) totals.set(p.memberId, totals.get(p.memberId)! + p.shareAmountProject)
    }
    const values = [...totals.values()]
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(members.length === 2 ? 1 : members.length - 1)
  })
})

describe("minor-unit helpers — boundaries", () => {
  it("handles zero-decimal and two-decimal currencies exactly", () => {
    expect(toMinorUnits(1000, "TWD")).toBe(1000)
    expect(toMinorUnits(1000.5, "TWD")).toBe(1001) // rounds to nearest whole
    expect(toMinorUnits(10.005, "USD")).toBe(1001) // 10.005 → 1000.5 cents → banker-free half-up
    expect(fromMinorUnits(3172, "USD")).toBeCloseTo(31.72, 10)
    expect(fromMinorUnits(3172, "USD") * 100).toBeCloseTo(3172, 6)
  })

  it("round-trips through minor units for the new settlement currencies", () => {
    for (const code of ["USD", "EUR", "CNY", "THB", "CHF", "TWD", "JPY", "VND"]) {
      const value = code === "VND" ? 245000 : 123.45
      expect(fromMinorUnits(toMinorUnits(value, code), code)).toBeCloseTo(
        roundMajorToMinor(value, code),
        6,
      )
    }
  })

  it("roundMajorToMinor rounds half up at the currency's precision", () => {
    expect(roundMajorToMinor(31.715, "USD")).toBe(31.72)
    expect(roundMajorToMinor(31.714, "USD")).toBe(31.71)
    expect(roundMajorToMinor(999.5, "TWD")).toBe(1000)
    expect(roundMajorToMinor(999.4, "TWD")).toBe(999)
  })
})

describe("resolveRate — full branch matrix", () => {
  it("same currency", () => {
    expect(resolveRate({ currency: "USD", projectCurrency: "USD", rateSource: "live" })).toEqual({
      rate: 1,
      source: "same",
      shouldSeedFixed: false,
    })
  })
  it("explicit provided rate wins over source", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", provided: 0.0321, rateSource: "live", customRate: 0.03, liveRate: 0.0317 }),
    ).toEqual({ rate: 0.0321, source: "provided", shouldSeedFixed: false })
  })
  it("fixed with a custom rate", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", rateSource: "fixed", customRate: 0.03, liveRate: 0.0317 }),
    ).toEqual({ rate: 0.03, source: "fixed", shouldSeedFixed: false })
  })
  it("fixed with no custom rate seeds from live", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", rateSource: "fixed", customRate: null, liveRate: 0.0317 }),
    ).toEqual({ rate: 0.0317, source: "seeded", shouldSeedFixed: true })
  })
  it("live ignores the custom rate", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", rateSource: "live", customRate: 0.03, liveRate: 0.0317 }),
    ).toEqual({ rate: 0.0317, source: "live", shouldSeedFixed: false })
  })
})

describe("previewRate — display-only conversion", () => {
  it("returns null for the project currency", () => {
    expect(previewRate("USD", "USD", null, null)).toBeNull()
  })
  it("prefers the project fixed rate", () => {
    expect(previewRate("TWD", "USD", { TWD: 0.0317 }, { TWD: 31.5, USD: 1 })).toBe(0.0317)
  })
  it("derives from live rates when no fixed rate is set", () => {
    expect(previewRate("TWD", "USD", null, { TWD: 31.5, USD: 1 })).toBeCloseTo(1 / 31.5)
  })
  it("returns null when no rate is known (no misleading 1:1)", () => {
    expect(previewRate("TWD", "USD", null, null)).toBeNull()
    expect(previewRate("TWD", "USD", null, { USD: 1 })).toBeNull()
  })
})

describe("roundRateForDisplay — 6 significant digits, trimmed", () => {
  it("shortens long floats and keeps short rates", () => {
    expect(roundRateForDisplay(1 / 31.5)).toBe(0.031746)
    expect(roundRateForDisplay(149.5)).toBe(149.5)
    expect(roundRateForDisplay(0.03)).toBe(0.03)
    expect(roundRateForDisplay(1)).toBe(1)
  })
})
