import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleData } from "@/lib/hooks/useSettlement"

// Shared by the real settlement hook and the /demo fixtures so the preview and
// the copied/shared text cannot drift apart.
export function buildSettlementShareText(
  data: Pick<SettleData, "settlements" | "summary">,
  currency: string
): string {
  const lines = ["💰 結算明細", `總支出：${formatCurrency(data.summary.totalAmount, currency)}`, ""]
  if (data.settlements.length === 0) {
    lines.push("✅ 所有人都已結清！")
    return lines.join("\n")
  }

  lines.push("📋 轉帳清單：")
  data.settlements.forEach((settlement, index) => {
    lines.push(
      `${index + 1}. ${settlement.from.displayName} ➡️ ${settlement.to.displayName}：${formatCurrency(settlement.amount, currency)}`
    )
  })
  return lines.join("\n")
}
