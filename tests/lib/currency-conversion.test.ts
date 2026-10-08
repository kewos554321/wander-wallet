import { describe, it, expect } from "vitest"
import {
  toMinorUnits,
  fromMinorUnits,
  roundMajorToMinor,
  allocate,
  rollbackAllocation,
  resolveRate,
} from "@/lib/currency-conversion"

describe("minor units", () => {
  it("uses 2 decimals for USD and 0 for TWD", () => {
    expect(toMinorUnits(10.57, "USD")).toBe(1057)
    expect(fromMinorUnits(1057, "USD")).toBeCloseTo(10.57)
    expect(toMinorUnits(310, "TWD")).toBe(310)
    expect(fromMinorUnits(310, "TWD")).toBe(310)
  })
  it("rounds to the currency's minor unit", () => {
    expect(roundMajorToMinor(31.715, "USD")).toBe(31.72)
    expect(roundMajorToMinor(999.6, "TWD")).toBe(1000)
  })
})

describe("allocate", () => {
  it("splits evenly and sums to totalMinor", () => {
    const r = allocate(
      1050,
      [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 1 }],
      new Map(),
    )
    const vals = [...r.allocations.values()]
    expect(vals.reduce((s, v) => s + v, 0)).toBe(1050)
    expect(vals.filter((v) => v === 350).length).toBe(3)
  })
  it("is deterministic and gives extras to the most-underpaid (lowest discrepancy)", () => {
    const d = new Map([["a", 0], ["b", 0], ["c", 0]])
    const r = allocate(
      1000,
      [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 1 }],
      d,
    )
    expect(r.bumped).toEqual(["a"]) // tie → original order
    expect(r.allocations.get("a")).toBe(334)
  })
  it("falls back to equal split when all weights are zero", () => {
    const r = allocate(100, [{ id: "a", weight: 0 }, { id: "b", weight: 0 }], new Map())
    expect(r.allocations.get("a")).toBe(50)
    expect(r.allocations.get("b")).toBe(50)
  })
})

describe("rollbackAllocation", () => {
  it("subtracts exactly the previous bump", () => {
    const stored = new Map([["a", 334], ["b", 333], ["c", 333]])
    const d = new Map([["a", 1], ["b", 0], ["c", 0]])
    const next = rollbackAllocation(
      1000,
      [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 1 }],
      stored,
      d,
    )
    expect(next.get("a")).toBe(0)
    expect(next.get("b")).toBe(0)
  })
})

describe("resolveRate", () => {
  it("same currency → 1 and source 'same'", () => {
    expect(resolveRate({ currency: "USD", projectCurrency: "USD", rateSource: "fixed" }))
      .toMatchObject({ rate: 1, source: "same" })
  })
  it("uses provided rate verbatim", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", provided: 0.0317, rateSource: "fixed" }).rate,
    ).toBe(0.0317)
  })
  it("fixed: uses customRate; marks seeded when only live is available", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", rateSource: "fixed", customRate: 0.03 }).source,
    ).toBe("fixed")
    const seeded = resolveRate({
      currency: "TWD",
      projectCurrency: "USD",
      rateSource: "fixed",
      customRate: null,
      liveRate: 0.0317,
    })
    expect(seeded).toMatchObject({ rate: 0.0317, source: "seeded", shouldSeedFixed: true })
  })
  it("live: uses liveRate", () => {
    expect(
      resolveRate({ currency: "TWD", projectCurrency: "USD", rateSource: "live", customRate: 0.03, liveRate: 0.0317 }).source,
    ).toBe("live")
  })
})
