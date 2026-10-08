import { describe, it, expect } from "vitest"
import { derivePayerShares, primaryPayerId, primaryPayerName, validatePayers } from "@/lib/expense-payers"

describe("derivePayerShares", () => {
  it("gives a single payer the full amount", () => {
    const { shares, ok } = derivePayerShares({ amount: 1000, payerIds: ["a"], pinned: {} })
    expect(ok).toBe(true)
    expect(shares).toEqual([{ memberId: "a", amount: 1000 }])
  })

  it("splits equally by default", () => {
    const { shares } = derivePayerShares({ amount: 1000, payerIds: ["a", "b"], pinned: {} })
    expect(shares).toEqual([
      { memberId: "a", amount: 500 },
      { memberId: "b", amount: 500 },
    ])
  })

  it("hands the rounding remainder to the first auto payer", () => {
    const { shares } = derivePayerShares({ amount: 100, payerIds: ["a", "b", "c"], pinned: {} })
    const total = shares.reduce((s, p) => s + p.amount, 0)
    expect(total).toBe(100)
    expect(shares[0].amount).toBe(33.34)
    expect(shares[1].amount).toBe(33.33)
    expect(shares[2].amount).toBe(33.33)
  })

  it("rounds an equal split to the currency's minor unit, keeping the total exact", () => {
    const { shares } = derivePayerShares({ amount: 100, payerIds: ["a", "b", "c"], pinned: {}, currency: "TWD" })
    expect(shares).toEqual([
      { memberId: "a", amount: 34 },
      { memberId: "b", amount: 33 },
      { memberId: "c", amount: 33 },
    ])
  })

  it("keeps pinned amounts and distributes the remainder to auto payers", () => {
    const { shares, pinnedTotal, autoIds } = derivePayerShares({
      amount: 1000,
      payerIds: ["a", "b", "c"],
      pinned: { a: 300 },
    })
    expect(pinnedTotal).toBe(300)
    expect(autoIds).toEqual(["b", "c"])
    expect(shares).toEqual([
      { memberId: "a", amount: 300 },
      { memberId: "b", amount: 350 },
      { memberId: "c", amount: 350 },
    ])
  })

  it("ignores pinned entries for members that are not selected", () => {
    const { shares } = derivePayerShares({ amount: 100, payerIds: ["a"], pinned: { b: 50 } })
    expect(shares).toEqual([{ memberId: "a", amount: 100 }])
  })

  it("reports ok:false when pinned amounts exceed the total", () => {
    const { ok } = derivePayerShares({ amount: 100, payerIds: ["a", "b"], pinned: { a: 80, b: 40 } })
    expect(ok).toBe(false)
  })

  it("returns no shares for an empty payer list", () => {
    const { shares, ok } = derivePayerShares({ amount: 100, payerIds: [], pinned: {} })
    expect(shares).toEqual([])
    expect(ok).toBe(true)
  })
})

describe("primaryPayerId", () => {
  it("returns the payer with the largest amount", () => {
    expect(primaryPayerId([
      { memberId: "a", amount: 300 },
      { memberId: "b", amount: 980 },
    ])).toBe("b")
  })

  it("breaks ties by the earliest entry", () => {
    expect(primaryPayerId([
      { memberId: "a", amount: 500 },
      { memberId: "b", amount: 500 },
    ])).toBe("a")
  })

  it("returns an empty string for no payers", () => {
    expect(primaryPayerId([])).toBe("")
  })
})

describe("primaryPayerName", () => {
  it("returns the name of the largest payer", () => {
    expect(primaryPayerName([
      { memberId: "a", amount: 300, member: { displayName: "小雨" } },
      { memberId: "b", amount: 980, member: { displayName: "志明" } },
    ])).toBe("志明")
  })

  it("falls back to 未知 when members are unknown", () => {
    expect(primaryPayerName([{ memberId: "a", amount: 100 }])).toBe("未知")
  })

  it("returns 未知 for an empty list", () => {
    expect(primaryPayerName([])).toBe("未知")
  })
})

describe("validatePayers", () => {
  const members = new Set(["a", "b", "c"])

  it("accepts a valid payer list", () => {
    const result = validatePayers(
      [{ memberId: "a", amount: 300 }, { memberId: "b", amount: 700 }],
      1000,
      members
    )
    expect(result).toEqual({
      ok: true,
      payers: [
        { memberId: "a", amount: 300 },
        { memberId: "b", amount: 700 },
      ],
    })
  })

  it("rejects a missing/empty list", () => {
    expect(validatePayers(undefined, 100, members)).toEqual({ ok: false, error: "至少需要一位付款人" })
    expect(validatePayers([], 100, members)).toEqual({ ok: false, error: "至少需要一位付款人" })
  })

  it("rejects duplicate members", () => {
    const result = validatePayers([{ memberId: "a", amount: 50 }, { memberId: "a", amount: 50 }], 100, members)
    expect(result).toEqual({ ok: false, error: "付款人不可重複" })
  })

  it("rejects non-members", () => {
    const result = validatePayers([{ memberId: "z", amount: 100 }], 100, members)
    expect(result).toEqual({ ok: false, error: "付款人必須是專案成員" })
  })

  it("rejects negative amounts", () => {
    const result = validatePayers([{ memberId: "a", amount: -1 }], 100, members)
    expect(result).toEqual({ ok: false, error: "付款金額不正確" })
  })

  it("rejects a total that does not match the amount", () => {
    const result = validatePayers([{ memberId: "a", amount: 30 }], 100, members)
    expect(result).toEqual({ ok: false, error: "付款金額合計必須等於費用總額" })
  })

  it("tolerates floating point within 0.01", () => {
    const result = validatePayers([{ memberId: "a", amount: 33.33 }, { memberId: "b", amount: 33.34 }], 66.67, members)
    expect(result.ok).toBe(true)
  })
})
