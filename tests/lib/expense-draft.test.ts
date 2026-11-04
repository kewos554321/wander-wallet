import { describe, it, expect } from "vitest"
import {
  createDraftActions,
  deriveExpenseDraft,
  initialState,
  type DraftInit,
} from "@/lib/expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]
const init: DraftInit = { members, currency: "TWD", paidBy: "a" }

describe("initialState", () => {
  it("seeds a new expense from the payer", () => {
    const state = initialState(init)
    expect(state.amount).toBe("")
    expect(state.payerIds).toEqual(["a"])
    expect(state.pool).toEqual(["a"])
    expect(state.description).toBe("")
    expect(state.notifyLine).toBe(true)
  })
})

describe("createDraftActions", () => {
  it("applies sequential updates through one functional updater", () => {
    let state = initialState(init)
    const actions = createDraftActions((updater) => {
      state = updater(state)
    }, members)
    actions.setAmount("100")
    actions.setDescription("午餐")
    actions.togglePool("b")
    expect(state.amount).toBe("100")
    expect(state.description).toBe("午餐")
    expect(state.pool).toEqual(["a", "b"])
  })
})

describe("deriveExpenseDraft", () => {
  it("derives an equal split that sums to the amount", () => {
    const base = initialState(init)
    const state = { ...base, amount: "100", pool: ["a", "b"] }
    const draft = deriveExpenseDraft({
      state,
      members,
      projectCurrency: "TWD",
      participantOrder: ["a", "b"],
    })
    expect(draft.splitInput.amount).toBe(100)
    expect(draft.shares.map((s) => s.shareAmount)).toEqual([50, 50])
    expect(draft.error).toBeNull()
  })
})
