import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { SettleData } from "@/lib/hooks/useSettlement"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { SettlementCalcDialog } from "@/components/v2/settle/settle-calc-dialog"
import { SettleShareDialog } from "@/components/v2/settle/settle-share-dialog"

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
    const detail = screen.getByText(/一蘭拉麵晚餐 · TWD 1,280/)
    expect(detail).toBeInTheDocument()
    expect(detail.textContent).not.toContain("→")
  })

  it("shows the original amount before the converted amount for multi-currency expenses", () => {
    const data = equalSplitData()
    data.expenseDetails[0].currency = "JPY"
    data.expenseDetails[0].amount = 5000
    data.expenseDetails[0].convertedAmount = 1100
    renderDialog(data)
    const detail = screen.getByText(/一蘭拉麵晚餐/)
    expect(detail.textContent).toContain("JPY 5,000")
    expect(detail.textContent).toContain("TWD 1,100")
    expect(detail.textContent).toContain("→")
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

const SHARE_TEXT = "💰 結算明細\n總支出：TWD 15,280\n\n📋 轉帳清單：\n1. 志明 ➡️ 小美：TWD 2,540"

function renderShare(shareText = SHARE_TEXT, onOpenChange = vi.fn(), open = true) {
  render(
    <UiV2Scope>
      <SettleShareDialog open={open} onOpenChange={onOpenChange} shareText={shareText} />
    </UiV2Scope>
  )
  return onOpenChange
}

describe("SettleShareDialog (A27)", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it("renders the 分享結算結果 title inside a labelled modal dialog", () => {
    renderShare()
    expect(screen.getByRole("heading", { name: "分享結算結果" })).toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-labelledby")
    expect(dialog).toHaveFocus()
  })

  it("renders the v2 overlay and card frame classes", () => {
    renderShare()
    const overlay = screen.getByTestId("settle-share-overlay")
    expect(overlay.className).toContain("bg-v2-overlay")
    const card = screen.getByRole("dialog")
    expect(card.className).toContain("bg-v2-surface")
    expect(card.className).toContain("rounded-[20px]")
    expect(card.className).toContain("w-[340px]")
  })

  it("shows the share text in the pre-line preview", () => {
    renderShare()
    const preview = screen.getByTestId("settle-share-preview")
    expect(preview).toHaveTextContent("💰 結算明細")
    expect(preview).toHaveTextContent("1. 志明 ➡️ 小美：TWD 2,540")
    expect(preview.className).toContain("whitespace-pre-line")
    expect(preview.className).toContain("bg-v2-lake-soft")
  })

  it("copies the share text and flips the button to 已複製", async () => {
    renderShare()
    fireEvent.click(screen.getByRole("button", { name: "複製文字" }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SHARE_TEXT)
    const copied = await screen.findByRole("button", { name: "已複製" })
    expect(copied.className).toContain("text-v2-lake")
    expect(screen.queryByRole("button", { name: "複製文字" })).not.toBeInTheDocument()
  })

  it("opens the LINE share URL then closes the dialog", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null)
    const onOpenChange = renderShare()
    fireEvent.click(screen.getByRole("button", { name: /LINE 分享/ }))
    expect(open).toHaveBeenCalledWith(`https://line.me/R/share?text=${encodeURIComponent(SHARE_TEXT)}`, "_blank")
    expect(onOpenChange).toHaveBeenCalledWith(false)
    open.mockRestore()
  })

  it("styles the LINE button with the v2 token and no raw hex", () => {
    renderShare()
    const line = screen.getByRole("button", { name: /LINE 分享/ })
    expect(line.className).toContain("bg-v2-line-green")
    expect(line.className).toContain("text-v2-on-lake")
    expect(line.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    const source = readFileSync("components/v2/settle/settle-share-dialog.tsx", "utf8")
    expect(source).not.toMatch(/-\[#[0-9a-fA-F]{3,8}\]/)
    expect(source).not.toContain("text-white")
  })

  it("calls onOpenChange(false) when the overlay is clicked", () => {
    const onOpenChange = renderShare()
    fireEvent.click(screen.getByTestId("settle-share-overlay"))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onOpenChange(false) when Escape is pressed", () => {
    const onOpenChange = renderShare()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("calls onOpenChange(false) from the close button", () => {
    const onOpenChange = renderShare()
    fireEvent.click(screen.getByRole("button", { name: "關閉" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("renders nothing when open is false", () => {
    renderShare(SHARE_TEXT, vi.fn(), false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("分享結算結果")).not.toBeInTheDocument()
  })
})
