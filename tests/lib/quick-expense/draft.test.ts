import { describe, it, expect } from "vitest"
import { fromParsed, validateItems, itemTotals, type QuickItem } from "@/lib/quick-expense/draft"

const base = { id: "x", amount: 100, description: "早餐", category: "food" as const, currency: "TWD", payerId: "a", participantIds: ["a", "b"], selected: true }
const item = (o: Partial<QuickItem> = {}): QuickItem => ({ ...fromParsed([base])[0], ...o })

describe("fromParsed", () => {
  it("fills defaults and stringifies amount", () => {
    const today = new Date("2026-09-28T10:00:00Z")
    const [q] = fromParsed([base], today)
    expect(q.amount).toBe("100")
    expect(q.expenseDate).toEqual(today)
    expect(q.expenseDate).not.toBe(today)
    expect(q).toMatchObject({
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
})

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

describe("validateItems", () => {
  it("returns null when valid", () => expect(validateItems([item()], members)).toBeNull())
  it("checks amount first", () => {
    for (const amount of ["", "0", "abc"]) {
      expect(validateItems([item(), item({ amount, payerId: "" })], members)).toEqual({ index: 1, message: "第 2 筆請輸入有效金額" })
    }
  })
  it("checks payer then participants", () => {
    expect(validateItems([item({ payerId: "" })], members)).toEqual({ index: 0, message: "第 1 筆請選擇付款成員" })
    expect(validateItems([item({ participantIds: [] })], members)).toEqual({ index: 0, message: "第 1 筆請選擇至少一位分攤成員" })
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
