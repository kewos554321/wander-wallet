import { describe, expect, it } from "vitest"
import { DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { amountIssueFor, describeSplitIssue, expenseFormIssues } from "@/components/v2/expense-form/split-guardrails"

type Draft = Parameters<typeof describeSplitIssue>[0]

function draftWith(items: { name: string; amount: string }[]): Draft {
  return {
    state: {
      personalMode: true,
      personalItems: { me: items.map((item, index) => ({ id: `i${index}`, ...item })) },
      customShares: {},
    },
    derived: {
      splitInput: { amount: 320 },
      shares: [{ memberId: "me", shareAmount: 320 }],
      error: null,
    },
  } as unknown as Draft
}

describe("split guardrails", () => {
  it("ignores blank placeholder items", () => {
    expect(describeSplitIssue(draftWith([{ name: "", amount: "" }]), DEMO_MEMBERS)).toBeNull()
  })

  it("reports a name-only touched item", () => {
    expect(describeSplitIssue(draftWith([{ name: "咖啡", amount: "" }]), DEMO_MEMBERS)).toContain("尚未填寫完整")
  })

  it("reports an amount-only touched item", () => {
    expect(describeSplitIssue(draftWith([{ name: "", amount: "120" }]), DEMO_MEMBERS)).toContain("尚未填寫完整")
  })

  it("accepts a complete item", () => {
    expect(describeSplitIssue(draftWith([{ name: "咖啡", amount: "120" }]), DEMO_MEMBERS)).toBeNull()
  })

  it("reports an empty or non-positive amount", () => {
    expect(amountIssueFor("", "TWD")).toBe("請輸入金額")
    expect(amountIssueFor("0", "TWD")).toBe("金額必須大於 0")
    expect(amountIssueFor("12", "TWD")).toBeNull()
  })

  it("prioritises the amount issue and treats whitespace as a missing description", () => {
    const draft = {
      state: {
        amount: "",
        currency: "TWD",
        description: "  ",
        personalMode: false,
        personalItems: {},
        customShares: {},
      },
      derived: { splitInput: { amount: 0 }, shares: [], error: "請選擇付款成員" },
    } as unknown as Draft
    const issues = expenseFormIssues(draft, DEMO_MEMBERS)
    expect(issues.amountIssue).toBe("請輸入金額")
    expect(issues.blockingError).toBe("請輸入金額")
    expect(issues.descMissing).toBe(true)
  })

  it("falls back to the draft error when there is no amount or split issue", () => {
    const draft = {
      state: {
        amount: "10",
        currency: "TWD",
        description: "午餐",
        personalMode: false,
        personalItems: {},
        customShares: {},
      },
      derived: { splitInput: { amount: 10 }, shares: [], error: "請選擇付款成員" },
    } as unknown as Draft
    expect(expenseFormIssues(draft, DEMO_MEMBERS).blockingError).toBe("請選擇付款成員")
  })
})
