import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useExpenseDraft, type DraftInit } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
  { id: "c", displayName: "阿凱" },
]
const init: DraftInit = { members, currency: "TWD", paidBy: "a" }

function setup(extra: Partial<DraftInit> = {}) {
  return renderHook(() => useExpenseDraft({ ...init, ...extra }))
}

describe("useExpenseDraft", () => {
  it("starts with only the current user in the pool and split", () => {
    const { result } = setup()
    act(() => result.current.actions.setAmount("300"))
    expect(result.current.state.pool).toEqual(["a"])
    expect(result.current.derived.shares.map((s) => s.shareAmount)).toEqual([300])
    expect(result.current.derived.splitDetail).toBeNull()
    expect(result.current.derived.matches).toBe(true)
    expect(result.current.derived.error).toBeNull()
  })

  it("falls back to the first member for the pool when no payer is given", () => {
    const { result } = setup({ paidBy: "" })
    expect(result.current.state.pool).toEqual(["a"])
  })

  it("adds personal items and builds splitDetail", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("300")
      result.current.actions.togglePool("b")
      result.current.actions.togglePool("c")
      result.current.actions.setPersonalMode(true)
      result.current.actions.togglePersonalMember("b")
    })
    const itemId = result.current.state.personalItems.b[0].id
    act(() => {
      result.current.actions.updateItem("b", itemId, "name", "咖啡")
      result.current.actions.updateItem("b", itemId, "amount", "60")
    })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 80 },
      { memberId: "b", shareAmount: 140 },
      { memberId: "c", shareAmount: 80 },
    ])
    expect(result.current.derived.splitDetail).toEqual({
      version: 1,
      personalItems: { b: [{ name: "咖啡", amount: 60 }] },
      customShares: {},
    })
    expect(result.current.derived.personalTotal).toBe(60)
    expect(result.current.derived.itemCount).toBe(1)
  })

  it("treats a personal-only member as custom 0", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePool("b")
      result.current.actions.setPersonalMode(true)
      result.current.actions.togglePersonalMember("c")
    })
    const itemId = result.current.state.personalItems.c[0].id
    act(() => {
      result.current.actions.updateItem("c", itemId, "name", "紀念品")
      result.current.actions.updateItem("c", itemId, "amount", "10")
    })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 45 },
      { memberId: "b", shareAmount: 45 },
      { memberId: "c", shareAmount: 10 },
    ])
    expect(result.current.derived.splitDetail?.customShares).toEqual({ c: 0 })
  })

  it("applies a custom share and reports the auto remainder", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePool("b")
      result.current.actions.togglePool("c")
      result.current.actions.setCustomShare("a", "40")
    })
    expect(result.current.derived.autoRemaining).toBe(60)
    expect(result.current.derived.shares.map((s) => s.shareAmount)).toEqual([40, 30, 30])
    act(() => result.current.actions.clearCustomShare("a"))
    expect(result.current.derived.splitDetail).toBeNull()
  })

  it.each([
    ["invalid amount", (d: ReturnType<typeof useExpenseDraft>) => d.actions.setAmount("abc"), "請輸入有效金額"],
    ["no payer", (d: ReturnType<typeof useExpenseDraft>) => d.actions.togglePayer("a"), "請選擇付款成員"],
    ["no participants", (d: ReturnType<typeof useExpenseDraft>) => d.actions.setPoolAll(false), "請選擇至少一位分擔者"],
  ])("reports %s", (_label, act_, message) => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
    })
    act(() => act_(result.current))
    expect(result.current.derived.error).toBe(message)
  })

  it("blocks personal items above the total and unnamed items", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("50")
      result.current.actions.setPersonalMode(true)
      result.current.actions.togglePersonalMember("a")
    })
    const itemId = result.current.state.personalItems.a[0].id
    act(() => result.current.actions.updateItem("a", itemId, "amount", "60"))
    expect(result.current.derived.error).toBe("小雨 有個人項目未填寫名稱")
    act(() => result.current.actions.updateItem("a", itemId, "name", "晚餐"))
    expect(result.current.derived.error).toBe("個人項目總額不可超過支出總額")
  })

  it("restores an existing expense with personal items and custom shares", () => {
    const { result } = setup({
      expense: {
        amount: 100,
        currency: "JPY",
        description: "晚餐",
        category: "food",
        payers: [{ memberId: "b", amount: 100 }],
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        location: null,
        latitude: null,
        longitude: null,
        image: null,
        participants: [
          { memberId: "a", shareAmount: 40 },
          { memberId: "b", shareAmount: 50 },
          { memberId: "c", shareAmount: 10 },
        ],
        splitDetail: {
          version: 1,
          personalItems: { c: [{ name: "紀念品", amount: 10 }] },
          customShares: { c: 0, a: 40 },
        },
      },
    })
    expect(result.current.state.pool).toEqual(["a", "b"])
    expect(result.current.state.personalMode).toBe(true)
    expect(result.current.state.personalMembers).toEqual(["c"])
    expect(result.current.state.customShares).toEqual({ a: "40" })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 40 },
      { memberId: "b", shareAmount: 50 },
      { memberId: "c", shareAmount: 10 },
    ])
  })

  it("keeps a legacy custom split (no stored splitDetail) instead of flattening it to equal", () => {
    const { result } = setup({
      expense: {
        amount: 100,
        currency: "TWD",
        description: "計程車",
        category: "transport",
        payers: [{ memberId: "a", amount: 100 }],
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        location: null,
        latitude: null,
        longitude: null,
        image: null,
        participants: [
          { memberId: "a", shareAmount: 60 },
          { memberId: "b", shareAmount: 40 },
        ],
        splitDetail: null,
      },
    })
    expect(result.current.state.pool).toEqual(["a", "b"])
    expect(result.current.state.customShares).toEqual({ a: "60", b: "40" })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 60 },
      { memberId: "b", shareAmount: 40 },
    ])
  })

  it("keeps a legacy equal split (no stored splitDetail) in equal mode with empty customShares", () => {
    const { result } = setup({
      expense: {
        amount: 90,
        currency: "TWD",
        description: "午餐",
        category: "food",
        payers: [{ memberId: "a", amount: 90 }],
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        location: null,
        latitude: null,
        longitude: null,
        image: null,
        participants: [
          { memberId: "a", shareAmount: 30 },
          { memberId: "b", shareAmount: 30 },
          { memberId: "c", shareAmount: 30 },
        ],
        splitDetail: null,
      },
    })
    expect(result.current.state.customShares).toEqual({})
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 30 },
      { memberId: "b", shareAmount: 30 },
      { memberId: "c", shareAmount: 30 },
    ])
    expect(result.current.derived.splitDetail).toBeNull()
  })

  it("keeps a seeded 0 share (no personal items) in the pool instead of treating it as personal-only", () => {
    const { result } = setup({
      expense: {
        amount: 100,
        currency: "TWD",
        description: "計程車",
        category: "transport",
        payers: [{ memberId: "a", amount: 100 }],
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        location: null,
        latitude: null,
        longitude: null,
        image: null,
        // Legacy split: b intentionally pays nothing, but has no personal
        // items (unlike the detail-driven personal-only case), so b must
        // stay a normal (fixed-at-0) pool member, not be dropped from it.
        participants: [
          { memberId: "a", shareAmount: 100 },
          { memberId: "b", shareAmount: 0 },
        ],
        splitDetail: null,
      },
    })
    expect(result.current.state.pool).toEqual(["a", "b"])
    expect(result.current.state.customShares).toEqual({ a: "100", b: "0" })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 100 },
      { memberId: "b", shareAmount: 0 },
    ])
  })

  it("keeps the stored participant order so the rounding remainder stays put", () => {
    const { result } = setup({
      expense: {
        amount: 100,
        currency: "TWD",
        description: "住宿",
        category: "accommodation",
        payers: [{ memberId: "a", amount: 100 }],
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        location: null,
        latitude: null,
        longitude: null,
        image: null,
        // Stored in a different order than the project's member list (a, b, c):
        // the rounding remainder was originally assigned to c.
        participants: [
          { memberId: "c", shareAmount: 33.34 },
          { memberId: "a", shareAmount: 33.33 },
          { memberId: "b", shareAmount: 33.33 },
        ],
        splitDetail: null,
      },
    })
    expect(result.current.derived.shares).toEqual([
      { memberId: "c", shareAmount: 34 },
      { memberId: "a", shareAmount: 33 },
      { memberId: "b", shareAmount: 33 },
    ])
  })
})
