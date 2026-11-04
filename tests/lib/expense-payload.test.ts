import { describe, it, expect } from "vitest"
import {
  createDraftActions,
  deriveExpenseDraft,
  initialState,
  type Draft,
  type DraftState,
} from "@/lib/expense-draft"
import { buildExpensePayload } from "@/lib/expense-payload"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

function makeDraft(overrides: Partial<DraftState> = {}): Draft {
  const state: DraftState = {
    ...initialState({ members, currency: "TWD", paidBy: "a", projectCurrency: "TWD" }),
    amount: "1280",
    description: "晚餐",
    category: "food",
    pool: ["a", "b"],
    ...overrides,
  }
  const actions = createDraftActions(() => {}, members)
  const derived = deriveExpenseDraft({
    state,
    members,
    projectCurrency: "TWD",
    participantOrder: ["a", "b"],
    previewRateInfo: () => ({ rate: 0.21, source: "live" }),
  })
  return { state, actions, derived }
}

describe("buildExpensePayload", () => {
  it("builds the same payload the create form sent", () => {
    const draft = makeDraft({
      currency: "JPY",
      exchangeRate: "0.21",
      ratePinned: true,
      rateKind: "custom",
    })
    expect(buildExpensePayload(draft)).toMatchObject({
      amount: 1280,
      currency: "JPY",
      exchangeRate: 0.21,
      rateKind: "custom",
      description: "晚餐",
      category: "food",
      participants: [
        { memberId: "a", shareAmount: 640 },
        { memberId: "b", shareAmount: 640 },
      ],
    })
  })

  it("omits exchangeRate when the rate is not pinned", () => {
    const draft = makeDraft({ exchangeRate: "", ratePinned: false, rateKind: null })
    expect(buildExpensePayload(draft).exchangeRate).toBeUndefined()
    expect(buildExpensePayload(draft).rateKind).toBeUndefined()
  })

  it("only sends rateDate for a pinned market rate", () => {
    const custom = makeDraft({ exchangeRate: "0.21", ratePinned: true, rateKind: "custom", rateDate: "2026-01-01" })
    expect(buildExpensePayload(custom).rateDate).toBeUndefined()
    const market = makeDraft({ exchangeRate: "0.21", ratePinned: true, rateKind: "market", rateDate: "2026-01-01" })
    expect(buildExpensePayload(market).rateDate).toBe("2026-01-01")
  })

  it("falls back to other when the category is empty", () => {
    expect(buildExpensePayload(makeDraft({ category: "" })).category).toBe("other")
  })
})
