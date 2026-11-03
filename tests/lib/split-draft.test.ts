import { describe, expect, it } from "vitest"
import { deriveSplit } from "@/lib/split-draft"

describe("deriveSplit — fixed members", () => {
  it("keeps a fixed member exact and gives the remainder only to auto members", () => {
    const derived = deriveSplit(
      1280,
      ["me", "ming", "kai", "ting"],
      {
        pool: ["me", "ming", "kai", "ting"],
        personalMode: true,
        personalMembers: ["me"],
        personalItems: { me: [{ id: "i1", name: "咖啡", amount: "123" }] },
        customShares: { me: "90" },
      },
      { currency: "JPY", projectCurrency: "JPY", rate: 1, discrepancy: {} },
    )

    expect(derived.shares.find((share) => share.memberId === "me")?.shareAmount).toBe(213)
    expect(derived.remainderMembers).not.toContain("me")
    expect(derived.shares.reduce((sum, share) => sum + share.shareAmount, 0)).toBe(1280)
  })
})
