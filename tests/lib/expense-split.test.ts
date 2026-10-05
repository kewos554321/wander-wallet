import { describe, it, expect } from "vitest"
import {
  buildSplitDetail,
  computeShares,
  getV1SplitMode,
  isSameSplitDetail,
  splitDetailToInput,
  validateSplitDetail,
  SPLIT_DETAIL_AMOUNT_ERROR,
  SPLIT_DETAIL_COUNT_ERROR,
  SPLIT_DETAIL_FORMAT_ERROR,
  SPLIT_DETAIL_MEMBER_ERROR,
  SPLIT_DETAIL_MISMATCH_ERROR,
  SPLIT_DETAIL_NAME_ERROR,
  type SplitInput,
} from "@/lib/expense-split"

const ids = ["a", "b", "c"]
const input = (overrides: Partial<SplitInput>): SplitInput => ({
  amount: 100,
  participantIds: ids,
  personalItems: {},
  customShares: {},
  ...overrides,
})

describe("computeShares — v1 equal mode", () => {
  it("gives the rounding remainder to the first member (same as v1)", () => {
    expect(computeShares(input({}))).toEqual([
      { memberId: "a", shareAmount: 33.34 },
      { memberId: "b", shareAmount: 33.33 },
      { memberId: "c", shareAmount: 33.33 },
    ])
  })

  it("returns [] without participants", () => {
    expect(computeShares(input({ participantIds: [] }))).toEqual([])
  })
})

describe("computeShares — v1 fixed (custom) mode", () => {
  it("splits the remainder among non-fixed members (same as v1)", () => {
    // v1: fixed b=30; remaining 70 over a,c → per 35
    expect(computeShares(input({ customShares: { b: 30 } }))).toEqual([
      { memberId: "a", shareAmount: 35 },
      { memberId: "b", shareAmount: 30 },
      { memberId: "c", shareAmount: 35 },
    ])
  })

  it("keeps odd remainders on the first auto member (same as v1)", () => {
    // fixed a=1 → remaining 100 over b,c,d → per 33.33; v1 gives b = round2(100 - 33.33*2) = 33.34
    expect(
      computeShares(input({ amount: 101, participantIds: ["a", "b", "c", "d"], customShares: { a: 1 } }))
    ).toEqual([
      { memberId: "a", shareAmount: 1 },
      { memberId: "b", shareAmount: 33.34 },
      { memberId: "c", shareAmount: 33.33 },
      { memberId: "d", shareAmount: 33.33 },
    ])
  })

  it("does not absorb a mismatch when everyone is fixed", () => {
    expect(computeShares(input({ customShares: { a: 10, b: 10, c: 10 } }))).toEqual([
      { memberId: "a", shareAmount: 10 },
      { memberId: "b", shareAmount: 10 },
      { memberId: "c", shareAmount: 10 },
    ])
  })
})

describe("computeShares — personal items", () => {
  it("adds personal items and splits the rest; total always equals amount", () => {
    const shares = computeShares(
      input({ personalItems: { b: [{ name: "計程車", amount: 10 }] } })
    )
    expect(shares).toEqual([
      { memberId: "a", shareAmount: 30 },
      { memberId: "b", shareAmount: 40 },
      { memberId: "c", shareAmount: 30 },
    ])
    const total = shares.reduce((s, x) => s + x.shareAmount, 0)
    expect(Math.round(total * 100) / 100).toBe(100)
  })

  it("fixes v1's 0.01 drift: 100 with no items over 3 still sums to 100", () => {
    const shares = computeShares(input({ personalItems: { a: [] } }))
    expect(Math.round(shares.reduce((s, x) => s + x.shareAmount, 0) * 100) / 100).toBe(100)
  })

  it("combines personal items and custom shares", () => {
    // a: item 20 + auto; b: item 10 + custom 30; c: auto. auto pool = 100-30-30=40 → a,c 20 each
    expect(
      computeShares(
        input({
          personalItems: { a: [{ name: "x", amount: 20 }], b: [{ name: "y", amount: 10 }] },
          customShares: { b: 30 },
        })
      )
    ).toEqual([
      { memberId: "a", shareAmount: 40 },
      { memberId: "b", shareAmount: 40 },
      { memberId: "c", shareAmount: 20 },
    ])
  })

  it("personal-only member (custom 0) pays only their items", () => {
    expect(
      computeShares(
        input({ personalItems: { c: [{ name: "紀念品", amount: 10 }] }, customShares: { c: 0 } })
      )
    ).toEqual([
      { memberId: "a", shareAmount: 45 },
      { memberId: "b", shareAmount: 45 },
      { memberId: "c", shareAmount: 10 },
    ])
  })
})

describe("buildSplitDetail / splitDetailToInput / isSameSplitDetail", () => {
  it("returns null for a plain equal split", () => {
    expect(buildSplitDetail(input({}))).toBeNull()
    expect(buildSplitDetail(input({ personalItems: { a: [] } }))).toBeNull()
  })

  it("drops empty arrays and non-participants, and round-trips", () => {
    const detail = buildSplitDetail(
      input({
        personalItems: { a: [{ name: " 咖啡 ", amount: 5 }], b: [], z: [{ name: "x", amount: 1 }] },
        customShares: { c: 20, z: 3 },
      })
    )
    expect(detail).toEqual({
      version: 1,
      personalItems: { a: [{ name: "咖啡", amount: 5 }] },
      customShares: { c: 20 },
    })
    expect(splitDetailToInput(detail!)).toEqual({
      personalItems: { a: [{ name: "咖啡", amount: 5 }] },
      customShares: { c: 20 },
    })
  })

  it("compares details independent of key order", () => {
    const a = { version: 1 as const, personalItems: {}, customShares: { x: 1, y: 2 } }
    const b = { version: 1 as const, personalItems: {}, customShares: { y: 2, x: 1 } }
    expect(isSameSplitDetail(a, b)).toBe(true)
    expect(isSameSplitDetail(a, null)).toBe(false)
    expect(isSameSplitDetail(null, null)).toBe(true)
  })
})

describe("getV1SplitMode", () => {
  it.each([
    [null, "none"],
    [{ version: 1, personalItems: { a: [{ name: "x", amount: 1 }] }, customShares: {} }, "personal"],
    [{ version: 1, personalItems: {}, customShares: { a: 1 } }, "custom"],
    [{ version: 1, personalItems: { a: [{ name: "x", amount: 1 }] }, customShares: { b: 1 } }, "unsupported"],
  ] as const)("%j → %s", (detail, mode) => {
    expect(getV1SplitMode(detail as never)).toBe(mode)
  })
})

describe("validateSplitDetail", () => {
  const shares = [
    { memberId: "a", shareAmount: 40 },
    { memberId: "b", shareAmount: 40 },
    { memberId: "c", shareAmount: 20 },
  ]
  const valid = {
    version: 1,
    personalItems: { a: [{ name: "x", amount: 20 }], b: [{ name: "y", amount: 10 }] },
    customShares: { b: 30 },
  }

  it("accepts a consistent detail and normalizes names", () => {
    const r = validateSplitDetail(
      { ...valid, personalItems: { ...valid.personalItems, a: [{ name: " x ", amount: 20 }] } },
      shares
    )
    expect(r).toEqual({ ok: true, detail: valid })
  })

  it.each([
    ["not an object", "x", SPLIT_DETAIL_FORMAT_ERROR],
    ["wrong version", { ...valid, version: 2 }, SPLIT_DETAIL_FORMAT_ERROR],
    ["non-participant", { ...valid, customShares: { z: 1 } }, SPLIT_DETAIL_MEMBER_ERROR],
    ["negative amount", { ...valid, personalItems: { a: [{ name: "x", amount: -1 }] } }, SPLIT_DETAIL_AMOUNT_ERROR],
    ["empty name", { ...valid, personalItems: { a: [{ name: "  ", amount: 20 }] } }, SPLIT_DETAIL_NAME_ERROR],
    ["long name", { ...valid, personalItems: { a: [{ name: "字".repeat(31), amount: 20 }] } }, SPLIT_DETAIL_NAME_ERROR],
    [
      "too many items",
      { ...valid, personalItems: { a: Array.from({ length: 21 }, () => ({ name: "x", amount: 0 })) } },
      SPLIT_DETAIL_COUNT_ERROR,
    ],
    ["custom share mismatch", { ...valid, customShares: { b: 29 } }, SPLIT_DETAIL_MISMATCH_ERROR],
    [
      "personal items above share",
      { version: 1, personalItems: { c: [{ name: "x", amount: 25 }] }, customShares: {} },
      SPLIT_DETAIL_MISMATCH_ERROR,
    ],
  ])("rejects %s", (_label, value, error) => {
    expect(validateSplitDetail(value, shares)).toEqual({ ok: false, error })
  })
})
