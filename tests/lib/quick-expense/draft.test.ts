import { describe, it, expect } from "vitest"
import { deriveExpenseDraft } from "@/lib/expense-draft"
import {
  parsedToQuickItems,
  validateItems,
  itemTotals,
  type QuickItem,
} from "@/lib/quick-expense/draft"

const base = {
  id: "x",
  amount: 100,
  description: "早餐",
  category: "food" as const,
  currency: "TWD",
  payers: [{ memberId: "a", amount: 100 }],
  participantIds: ["a", "b"],
  selected: true,
}
const item = (o: Partial<QuickItem> = {}): QuickItem => ({
  ...parsedToQuickItems([base], new Date("2026-09-28T10:00:00Z"))[0],
  ...o,
})

describe("parsedToQuickItems", () => {
  it("maps an AI result into the shared draft shape", () => {
    const today = new Date("2026-09-28T10:00:00Z")
    const [q] = parsedToQuickItems([base], today)
    expect(q.id).toBe("x")
    expect(q.amount).toBe("100")
    expect(q.expenseDate).toEqual(today)
    expect(q.expenseDate).not.toBe(today)
    expect(q).toMatchObject({
      currency: "TWD",
      pool: ["a", "b"],
      payerIds: ["a"],
      pinnedPayerAmounts: {},
      location: { location: null, latitude: null, longitude: null },
      image: { image: null, pendingFile: null, preview: null },
      personalMode: false,
      personalItems: {},
      personalMembers: [],
      customShares: {},
      ratePinned: false,
      rateKind: null,
      notifyLine: true,
    })
    expect("participantIds" in q).toBe(false)
    expect("selected" in q).toBe(false)
  })

  it("keeps an explicit multi-payer split as pinned amounts", () => {
    const [q] = parsedToQuickItems([
      { ...base, amount: 1280, payers: [{ memberId: "a", amount: 800 }, { memberId: "b", amount: 480 }] },
    ])
    expect(q.payerIds).toEqual(["a", "b"])
    expect(q.pinnedPayerAmounts).toEqual({ a: "800", b: "480" })
  })

  it("leaves an equal multi-payer split unpinned", () => {
    const [q] = parsedToQuickItems([
      { ...base, amount: 100, payers: [{ memberId: "a", amount: 50 }, { memberId: "b", amount: 50 }] },
    ])
    expect(q.payerIds).toEqual(["a", "b"])
    expect(q.pinnedPayerAmounts).toEqual({})
  })

  it("keeps a missing payers list editable instead of throwing", () => {
    const [q] = parsedToQuickItems([{ ...base, payers: undefined as unknown as typeof base.payers }])
    expect(q.payerIds).toEqual([])
    expect(validateItems([q], members)).toEqual({ index: 0, message: "第 1 筆請選擇付款成員" })
  })

  it("seeds personal items and enables personal mode", () => {
    const [q] = parsedToQuickItems([
      {
        ...base,
        amount: 1200,
        payers: [{ memberId: "a", amount: 700 }, { memberId: "b", amount: 500 }],
        personalItems: [
          { memberId: "b", name: "飲料", amount: 200 },
          { memberId: "b", name: "甜點", amount: 100 },
        ],
      },
    ])
    expect(q.personalMode).toBe(true)
    expect(q.personalMembers).toEqual(["b"])
    expect(q.personalItems.b.map((i) => ({ name: i.name, amount: i.amount }))).toEqual([
      { name: "飲料", amount: "200" },
      { name: "甜點", amount: "100" },
    ])
  })
})

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

describe("deriveExpenseDraft on a quick item", () => {
  it("derives an equal split for a single payer", () => {
    const derived = deriveExpenseDraft({
      state: item(),
      members,
      projectCurrency: "TWD",
      participantOrder: ["a", "b"],
    })
    expect(derived.payers).toEqual([{ memberId: "a", amount: 100 }])
  })

  it("derives pinned multi-payer amounts", () => {
    const derived = deriveExpenseDraft({
      state: item({ amount: "1280", payerIds: ["a", "b"], pinnedPayerAmounts: { a: "800", b: "480" } }),
      members,
      projectCurrency: "TWD",
      participantOrder: ["a", "b"],
    })
    expect(derived.payers).toEqual([
      { memberId: "a", amount: 800 },
      { memberId: "b", amount: 480 },
    ])
    expect(derived.payerMatches).toBe(true)
  })
})

describe("validateItems", () => {
  it("returns null when valid", () => expect(validateItems([item()], members)).toBeNull())
  it("checks amount first", () => {
    for (const amount of ["", "0", "abc"]) {
      expect(validateItems([item(), item({ amount, payerIds: [] })], members)).toEqual({ index: 1, message: "第 2 筆請輸入有效金額" })
    }
  })
  it("checks payer then participants", () => {
    expect(validateItems([item({ payerIds: [] })], members)).toEqual({ index: 0, message: "第 1 筆請選擇付款成員" })
    expect(validateItems([item({ pool: [] })], members)).toEqual({ index: 0, message: "第 1 筆請選擇至少一位分攤成員" })
  })
  it("validates the payer sum against the amount", () => {
    expect(validateItems([item({ amount: "100", payerIds: ["a", "b"], pinnedPayerAmounts: { a: "40", b: "40" } })], members)).toEqual({
      index: 0,
      message: "第 1 筆付款金額與支出金額不符",
    })
    expect(validateItems([item({ amount: "100", payerIds: ["a"], pinnedPayerAmounts: { a: "200" } })], members)).toEqual({
      index: 0,
      message: "第 1 筆付款金額合計超過支出金額",
    })
  })
  it("validates the editable split like the expense form", () => {
    // A custom share that doesn't add up to the amount is rejected.
    expect(validateItems([item({ pool: ["a"], customShares: { a: "10" } })], members)).toEqual({
      index: 0,
      message: "第 1 筆分攤金額與支出金額不符",
    })
    // Personal items must be named.
    const withItem = item({
      personalMode: true,
      personalMembers: ["a"],
      personalItems: { a: [{ id: "i1", name: "", amount: "10" }] },
    })
    expect(validateItems([withItem], members)).toEqual({ index: 0, message: "第 1 筆：小雨 有個人項目未填寫名稱" })
  })

  it("blocks a blank description like the add-expense form", () => {
    expect(validateItems([item({ description: "  " })], members)).toEqual({
      index: 0,
      message: "第 1 筆請填寫描述，讓大家知道這筆是什麼",
    })
  })

  it("blocks an amount over the currency limit", () => {
    expect(validateItems([item({ amount: "999999999" })], members)?.message).toContain("金額不可超過")
  })

  it("blocks a touched personal item with a blank amount", () => {
    const withItem = item({
      personalMode: true,
      personalMembers: ["a"],
      personalItems: { a: [{ id: "i1", name: "咖啡", amount: "" }] },
    })
    expect(validateItems([withItem], members)?.message).toContain("尚未填寫完整")
  })
})

describe("itemTotals", () => {
  it("groups by currency in first-seen order", () => {
    expect(itemTotals([item({ amount: "10.1" }), item({ currency: "JPY", amount: "500" }), item({ amount: "0.2" })])).toEqual([
      { currency: "TWD", total: 10.3 },
      { currency: "JPY", total: 500 },
    ])
  })
  it("treats invalid amounts as 0", () => expect(itemTotals([item({ amount: "" })])).toEqual([{ currency: "TWD", total: 0 }]))
})
