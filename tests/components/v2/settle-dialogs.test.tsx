import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { SettleData } from "@/lib/hooks/useSettlement"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { SettlementCalcDialog } from "@/components/v2/settle/settle-calc-dialog"

function equalSplitData(): SettleData {
  return {
    balances: [
      { memberId: "a", displayName: "志明", userImage: null, balance: -2540, totalPaid: 1280, totalShare: 3820 },
      { memberId: "b", displayName: "小美", userImage: null, balance: 2540, totalPaid: 14000, totalShare: 3820 },
    ],
    settlements: [
      { from: { memberId: "a", displayName: "志明", userImage: null }, to: { memberId: "b", displayName: "小美", userImage: null }, amount: 2540 },
    ],
    expenseDetails: [
      {
        id: "e1",
        description: "一蘭拉麵晚餐",
        amount: 1280,
        currency: "TWD",
        convertedAmount: 1280,
        payer: { memberId: "a", displayName: "志明" },
        participants: [
          { memberId: "a", displayName: "志明", shareAmount: 320, convertedShareAmount: 320 },
          { memberId: "b", displayName: "小美", shareAmount: 320, convertedShareAmount: 320 },
        ],
      },
    ],
    summary: { totalExpenses: 1, totalAmount: 1280, totalShared: 1280, isBalanced: true, currency: "TWD" },
  }
}

function renderDialog(data: SettleData, onOpenChange = vi.fn(), open = true) {
  render(
    <UiV2Scope>
      <SettlementCalcDialog open={open} onOpenChange={onOpenChange} data={data} />
    </UiV2Scope>
  )
  return onOpenChange
}

describe("SettlementCalcDialog (A26)", () => {
  it("renders the 計算過程 title inside a labelled modal dialog", () => {
    renderDialog(equalSplitData())
    expect(screen.getByRole("heading", { name: "計算過程" })).toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-labelledby")
    expect(dialog).toHaveFocus()
  })

  it("renders the v2 overlay and card frame classes", () => {
    renderDialog(equalSplitData())
    const overlay = screen.getByTestId("settle-calc-overlay")
    expect(overlay.className).toContain("bg-v2-overlay")
    const card = screen.getByRole("dialog")
    expect(card.className).toContain("bg-v2-surface")
    expect(card.className).toContain("rounded-[20px]")
    expect(card.className).toContain("w-[350px]")
  })

  it("renders the expense detail heading, payer and converted amount", () => {
    renderDialog(equalSplitData())
    expect(screen.getByText("支出明細（共 1 筆）")).toBeInTheDocument()
    expect(screen.getByText(/付款：志明/)).toBeInTheDocument()
    expect(screen.getByText(/一蘭拉麵晚餐 · TWD 1,280/)).toBeInTheDocument()
  })

  it("renders the member balance table headers", () => {
    renderDialog(equalSplitData())
    expect(screen.getByRole("columnheader", { name: "成員" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "已付" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "應付" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "餘額" })).toBeInTheDocument()
  })

  it("colours negative balances danger and positive balances lake", () => {
    renderDialog(equalSplitData())
    const negative = screen.getByTestId("balance-a")
    expect(negative.className).toContain("text-v2-danger")
    expect(negative.textContent).toContain("TWD -2,540")
    const positive = screen.getByTestId("balance-b")
    expect(positive.className).toContain("text-v2-lake")
    expect(positive.className).not.toContain("text-v2-danger")
  })

  it("renders the settlement plan row and the transfer count note", () => {
    renderDialog(equalSplitData())
    const plan = screen.getByTestId("plan-0")
    expect(within(plan).getByText("志明")).toBeInTheDocument()
    expect(within(plan).getByText("小美")).toBeInTheDocument()
    expect(within(plan).getByText("TWD 2,540")).toBeInTheDocument()
    expect(screen.getByText(/共需 1 筆轉帳/)).toBeInTheDocument()
  })

  it("shows the division form when all participant shares are equal", () => {
    renderDialog(equalSplitData())
    expect(screen.getByText("分攤：TWD 320（1280 ÷ 2）")).toBeInTheDocument()
  })

  it("lists per-member amounts when participant shares are unequal", () => {
    const data = equalSplitData()
    data.expenseDetails[0].convertedAmount = 320
    data.expenseDetails[0].participants = [
      { memberId: "a", displayName: "志明", shareAmount: 100, convertedShareAmount: 100 },
      { memberId: "b", displayName: "小美", shareAmount: 220, convertedShareAmount: 220 },
    ]
    renderDialog(data)
    const split = screen.getByTestId("split-line")
    expect(split.textContent).toContain("分攤：志明 TWD 100、小美 TWD 220")
    expect(split.textContent).not.toContain("÷")
  })

  it("renders the all-settled empty state without a transfer plan", () => {
    const data = equalSplitData()
    data.settlements = []
    renderDialog(data)
    expect(screen.getByText("所有人都已結清，無需轉帳！")).toBeInTheDocument()
    expect(screen.queryByText(/共需/)).not.toBeInTheDocument()
  })

  it("renders a placeholder split for an expense with no participants", () => {
    const data = equalSplitData()
    data.expenseDetails = [{ ...data.expenseDetails[0], id: "e2", participants: [], convertedAmount: 0 }]
    renderDialog(data)
    expect(screen.getByText("分攤：—")).toBeInTheDocument()
  })

  it("shows the no-expenses placeholders when there are no details", () => {
    const data = equalSplitData()
    data.expenseDetails = []
    data.settlements = []
    data.summary.totalExpenses = 0
    renderDialog(data)
    expect(screen.getAllByText("尚無支出記錄")).toHaveLength(2)
  })

  it("calls onOpenChange(false) when the overlay is clicked", () => {
    const onOpenChange = renderDialog(equalSplitData())
    fireEvent.click(screen.getByTestId("settle-calc-overlay"))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onOpenChange(false) when Escape is pressed", () => {
    const onOpenChange = renderDialog(equalSplitData())
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onOpenChange(false) from the close button", () => {
    const onOpenChange = renderDialog(equalSplitData())
    fireEvent.click(screen.getByRole("button", { name: "關閉" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("renders nothing when open is false", () => {
    renderDialog(equalSplitData(), vi.fn(), false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("計算過程")).not.toBeInTheDocument()
  })
})
