import { describe, it, expect } from "vitest"
import { buildSettlementShareText } from "@/lib/settlement-share"
import type { SettleData } from "@/lib/hooks/useSettlement"

const base: Pick<SettleData, "settlements" | "summary"> = {
  settlements: [
    {
      from: { memberId: "ting", displayName: "小婷", userImage: null },
      to: { memberId: "me", displayName: "我", userImage: null },
      amount: 1270,
    },
  ],
  summary: { totalExpenses: 12, totalAmount: 48600, totalShared: 48600, isBalanced: true, currency: "TWD" },
}

describe("buildSettlementShareText", () => {
  it("lists the transfers without payout details", () => {
    expect(buildSettlementShareText(base, "TWD")).toBe(
      [
        "💰 結算明細",
        "總支出：TWD 48,600",
        "",
        "📋 轉帳清單：",
        "1. 小婷 ➡️ 我：TWD 1,270",
      ].join("\n")
    )
  })

  it("reports the settled state when there are no transfers", () => {
    expect(buildSettlementShareText({ ...base, settlements: [] }, "TWD")).toBe(
      ["💰 結算明細", "總支出：TWD 48,600", "", "✅ 所有人都已結清！"].join("\n")
    )
  })
})
