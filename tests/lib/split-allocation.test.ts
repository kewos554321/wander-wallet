import { describe, it, expect } from "vitest"
import { allocateBothCurrencies, type WeightedMember } from "@/lib/split-allocation"

const eq = (a: number, b: number, c: number): WeightedMember[] => [
  { id: "a", weight: a },
  { id: "b", weight: b },
  { id: "c", weight: c },
]

describe("allocateBothCurrencies", () => {
  it("uses one ordering so both currencies give the remainder to the same member", () => {
    const discrepancy = new Map([["a", 5], ["b", 0], ["c", 0]])
    // a has the highest ledger, so b (lowest, index before c) absorbs the remainder.
    const result = allocateBothCurrencies(1000, 100, eq(100 / 3, 100 / 3, 100 / 3), discrepancy)
    expect(result.original.get("a")).toBe(333)
    expect(result.original.get("b")).toBe(334)
    expect(result.original.get("c")).toBe(333)
    expect(result.settlement.get("a")).toBe(33)
    expect(result.settlement.get("b")).toBe(34)
    expect(result.settlement.get("c")).toBe(33)
    expect(result.bumped).toEqual(["b"])
  })

  it("produces identical original and settlement amounts for the same total", () => {
    const result = allocateBothCurrencies(667, 667, eq(222.33, 222.33, 222.34), new Map())
    expect([...result.original.entries()]).toEqual([...result.settlement.entries()])
    expect([...result.original.values()].reduce((s, x) => s + x, 0)).toBe(667)
  })

  it("bumps nobody on an exact division", () => {
    const discrepancy = new Map([["a", 2], ["b", 1], ["c", 0]])
    const result = allocateBothCurrencies(99, 99, eq(33, 33, 33), discrepancy)
    expect(result.settlement.get("a")).toBe(33)
    expect(result.bumped).toEqual([])
  })

  it("does not mutate the passed ledger", () => {
    const discrepancy = new Map([["a", 0], ["b", 0], ["c", 0]])
    allocateBothCurrencies(1000, 100, eq(100 / 3, 100 / 3, 100 / 3), discrepancy)
    expect([...discrepancy.values()]).toEqual([0, 0, 0])
  })
})
