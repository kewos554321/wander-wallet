import { describe, it, expect } from "vitest"
import { fromParsed, validateItems, itemTotals, itemDerivedPayers, type QuickItem } from "@/lib/quick-expense/draft"

const base = { id: "x", amount: 100, description: "早餐", category: "food" as const, currency: "TWD", payers: [{ memberId: "a", amount: 100 }], participantIds: ["a", "b"], selected: true }
const item = (o: Partial<QuickItem> = {}): QuickItem => ({ ...fromParsed([base])[0], ...o })

describe("fromParsed", () => {
  it("fills defaults and stringifies amount", () => {
    const today = new Date("2026-09-28T10:00:00Z")
    const [q] = fromParsed([base], today)
    expect(q.amount).toBe("100")
    expect(q.expenseDate).toEqual(today)
    expect(q.expenseDate).not.toBe(today)
    expect(q).toMatchObject({
      payerIds: ["a"],
      pinnedPayerAmounts: {},
      location: null,
      latitude: null,
      longitude: null,
      image: { image: null, pendingFile: null, preview: null },
      personalMode: false,
      personalItems: {},
      personalMembers: [],
      customShares: {},
    })
    expect("selected" in q).toBe(false)
  })

  it("keeps an explicit multi-payer split as pinned amounts", () => {
    const [q] = fromParsed([
      { ...base, amount: 1280, payers: [{ memberId: "a", amount: 800 }, { memberId: "b", amount: 480 }] },
    ])
    expect(q.payerIds).toEqual(["a", "b"])
    expect(q.pinnedPayerAmounts).toEqual({ a: "800", b: "480" })
  })

  it("leaves an equal multi-payer split unpinned", () => {
    const [q] = fromParsed([
      { ...base, amount: 100, payers: [{ memberId: "a", amount: 50 }, { memberId: "b", amount: 50 }] },
    ])
    expect(q.payerIds).toEqual(["a", "b"])
    expect(q.pinnedPayerAmounts).toEqual({})
  })

  it("seeds personal items and enables personal mode", () => {
    const [q] = fromParsed([
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

describe("itemDerivedPayers", () => {
  it("derives an equal split for a single payer", () => {
    expect(itemDerivedPayers(item()).payers).toEqual([{ memberId: "a", amount: 100 }])
  })

  it("derives pinned multi-payer amounts", () => {
    const derived = itemDerivedPayers(item({ amount: "1280", payerIds: ["a", "b"], pinnedPayerAmounts: { a: "800", b: "480" } }))
    expect(derived.payers).toEqual([
      { memberId: "a", amount: 800 },
      { memberId: "b", amount: 480 },
    ])
    expect(derived.payerMatches).toBe(true)
  })
})

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

describe("validateItems", () => {
  it("returns null when valid", () => expect(validateItems([item()], members)).toBeNull())
  it("checks amount first", () => {
    for (const amount of ["", "0", "abc"]) {
      expect(validateItems([item(), item({ amount, payerIds: [] })], members)).toEqual({ index: 1, message: "第 2 筆請輸入有效金額" })
    }
  })
  it("checks payer then participants", () => {
    expect(validateItems([item({ payerIds: [] })], members)).toEqual({ index: 0, message: "第 1 筆請選擇付款成員" })
    expect(validateItems([item({ participantIds: [] })], members)).toEqual({ index: 0, message: "第 1 筆請選擇至少一位分攤成員" })
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
    expect(validateItems([item({ participantIds: ["a"], customShares: { a: "10" } })], members)).toEqual({
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
