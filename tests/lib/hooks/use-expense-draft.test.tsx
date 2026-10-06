import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useExpenseDraft, type DraftInit, type DraftExpense } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

function setup(extra: Partial<DraftInit> = {}) {
  return renderHook(() => useExpenseDraft({ members, currency: "TWD", paidBy: "a", ...extra }))
}

function storedExpense(overrides: Partial<DraftExpense> = {}): DraftExpense {
  return {
    amount: 100,
    currency: "TWD",
    description: null,
    category: "food",
    payers: [{ memberId: "a", amount: 100 }],
    expenseDate: new Date(2026, 10, 16, 19).toISOString(),
    location: null,
    latitude: null,
    longitude: null,
    image: null,
    participants: [
      { memberId: "a", shareAmount: 50 },
      { memberId: "b", shareAmount: 50 },
    ],
    splitDetail: null,
    ...overrides,
  }
}

describe("useExpenseDraft payers", () => {
  it("defaults to the current user as the single payer", () => {
    const { result } = setup()
    act(() => result.current.actions.setAmount("100"))
    expect(result.current.state.payerIds).toEqual(["a"])
    expect(result.current.derived.payers).toEqual([{ memberId: "a", amount: 100 }])
    expect(result.current.derived.payerTotal).toBe(100)
    expect(result.current.derived.primaryPayerId).toBe("a")
    expect(result.current.derived.error).toBeNull()
  })

  it("splits the amount equally between two payers by default", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
    })
    expect(result.current.derived.payers).toEqual([
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ])
    expect(result.current.derived.payerTotal).toBe(100)
    expect(result.current.derived.payerMatches).toBe(true)
    expect(result.current.derived.error).toBeNull()
  })

  it("pins a manually entered amount and gives the remainder to the auto payer", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
    })
    act(() => result.current.actions.setPayerAmount("b", "70"))
    expect(result.current.state.pinnedPayerAmounts).toEqual({ b: "70" })
    expect(result.current.derived.payers).toEqual([
      { memberId: "a", amount: 30 },
      { memberId: "b", amount: 70 },
    ])
    expect(result.current.derived.payerMatches).toBe(true)
  })

  it("clears a pin and returns that payer to an equal split", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
      result.current.actions.setPayerAmount("b", "70")
    })
    act(() => result.current.actions.clearPayerAmount("b"))
    expect(result.current.state.pinnedPayerAmounts).toEqual({})
    expect(result.current.derived.payers).toEqual([
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ])
  })

  it("re-splits the amount among the remaining payers when one is removed", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
    })
    act(() => result.current.actions.togglePayer("b"))
    expect(result.current.state.payerIds).toEqual(["a"])
    expect(result.current.derived.payers).toEqual([{ memberId: "a", amount: 100 }])
  })

  it("drops the pin for a removed payer", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
      result.current.actions.setPayerAmount("b", "70")
    })
    act(() => result.current.actions.togglePayer("b"))
    expect(result.current.state.pinnedPayerAmounts).toEqual({})
  })

  it("selects and clears every member with setPayersAll", () => {
    const { result } = setup()
    act(() => result.current.actions.setPayersAll(true))
    expect(result.current.state.payerIds).toEqual(["a", "b"])
    act(() => result.current.actions.setPayersAll(false))
    expect(result.current.state.payerIds).toEqual([])
  })

  it("reports the over-total error when pinned amounts exceed the amount", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
      result.current.actions.setPayerAmount("b", "120")
    })
    expect(result.current.derived.payerMatches).toBe(false)
    expect(result.current.derived.error).toBe("付款金額合計超過支出金額")
  })

  it("reports a mismatch when every payer is pinned below the amount", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePayer("b")
      result.current.actions.setPayerAmount("a", "30")
      result.current.actions.setPayerAmount("b", "30")
    })
    expect(result.current.derived.payerMatches).toBe(false)
    expect(result.current.derived.error).toBe("付款金額與支出金額不符")
  })

  it("reports a missing-payer error when the last payer is removed", () => {
    const { result } = setup()
    act(() => result.current.actions.setAmount("100"))
    act(() => result.current.actions.togglePayer("a"))
    expect(result.current.derived.error).toBe("請選擇付款成員")
  })

  it("restores payers from an existing expense and keeps the stored order", () => {
    const { result } = setup({
      expense: storedExpense({
        payers: [
          { memberId: "b", amount: 100 },
          { memberId: "a", amount: 0 },
        ],
        // Keep b as the only meaningful payer while exercising order/pins.
        amount: 100,
      }),
    })
    expect(result.current.state.payerIds).toEqual(["b", "a"])
    expect(result.current.derived.payers).toEqual([
      { memberId: "b", amount: 100 },
      { memberId: "a", amount: 0 },
    ])
  })

  it("restores custom payer amounts as pinned", () => {
    const { result } = setup({
      expense: storedExpense({
        amount: 100,
        payers: [
          { memberId: "b", amount: 30 },
          { memberId: "a", amount: 70 },
        ],
      }),
    })
    expect(result.current.state.payerIds).toEqual(["b", "a"])
    expect(result.current.state.pinnedPayerAmounts).toEqual({ b: "30", a: "70" })
    expect(result.current.derived.payers).toEqual([
      { memberId: "b", amount: 30 },
      { memberId: "a", amount: 70 },
    ])
    expect(result.current.derived.payerMatches).toBe(true)
  })

  it("does not pin a stored equal payer split", () => {
    const { result } = setup({
      expense: storedExpense({
        amount: 100,
        payers: [
          { memberId: "a", amount: 50 },
          { memberId: "b", amount: 50 },
        ],
      }),
    })
    expect(result.current.state.pinnedPayerAmounts).toEqual({})
    expect(result.current.derived.payers).toEqual([
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ])
  })
})
