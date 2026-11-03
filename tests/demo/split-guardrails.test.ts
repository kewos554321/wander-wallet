import { describe, expect, it } from "vitest"
import { DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { describeSplitIssue } from "@/app/demo/expense-prototype/guardrails"

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
})
