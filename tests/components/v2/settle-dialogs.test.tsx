import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { SettleData } from "@/lib/hooks/useSettlement"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { SettlementCalcDialog } from "@/components/v2/settle/settle-calc-dialog"
import { SettleShareDialog } from "@/components/v2/settle/settle-share-dialog"

// Capture whatever clipboard existed before any test stub, so the stub can be
// removed cleanly instead of leaking into later test files.
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard")
const originalShareDescriptor = Object.getOwnPropertyDescriptor(navigator, "share")

afterEach(() => {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor)
  } else {
    delete (navigator as { clipboard?: unknown }).clipboard
  }
  if (originalShareDescriptor) {
    Object.defineProperty(navigator, "share", originalShareDescriptor)
  } else {
    delete (navigator as { share?: unknown }).share
  }
})

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
        payers: [{ memberId: "a", displayName: "志明", amount: 1280, convertedAmount: 1280 }],
        participants: [
          { memberId: "a", displayName: "志明", shareAmount: 320, convertedShareAmount: 320 },
          { memberId: "b", displayName: "小美", shareAmount: 320, convertedShareAmount: 320 },
        ],
      },
    ],
    summary: { totalExpenses: 1, totalAmount: 1280, totalShared: 1280, isBalanced: true, currency: "TWD" },
  }
}

function renderDialog(
  data: SettleData,
  onOpenChange = vi.fn(),
  open = true,
  placeholderMemberIds?: ReadonlySet<string>,
  currentMemberId: string | null = "a"
) {
  render(
    <UiV2Scope>
      <SettlementCalcDialog
        open={open}
        onOpenChange={onOpenChange}
        data={data}
        placeholderMemberIds={placeholderMemberIds}
        currentMemberId={currentMemberId}
      />
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

  it("fills the viewport instead of using a small centered card", () => {
    renderDialog(equalSplitData())
    const dialog = screen.getByRole("dialog")
    expect(dialog.className).toContain("h-dvh")
    expect(dialog.className).toContain("w-full")
    expect(screen.getByTestId("settle-calc-overlay").className).toContain("justify-center")
  })

  it("stays open when the dialog card itself is clicked", () => {
    const onOpenChange = renderDialog(equalSplitData())
    fireEvent.click(screen.getByRole("dialog"))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("renders the expense detail heading, payer and converted amount", () => {
    renderDialog(equalSplitData())
    expect(screen.getByText("支出明細（共 1 筆）")).toBeInTheDocument()
    const payerLine = screen.getByTestId("payer-line")
    expect(within(payerLine).getByText("志明")).toBeInTheDocument()
    expect(payerLine.textContent).toContain("TWD 1,280")
    const detail = screen.getByText(/一蘭拉麵晚餐 · TWD 1,280/)
    expect(detail).toBeInTheDocument()
    expect(detail.textContent).not.toContain("→")
  })

  it("lists every payer with its converted amount for a multi-payer expense", () => {
    const data = equalSplitData()
    data.expenseDetails[0].payers = [
      { memberId: "a", displayName: "志明", amount: 800, convertedAmount: 800 },
      { memberId: "b", displayName: "小美", amount: 480, convertedAmount: 480 },
    ]
    renderDialog(data)
    const payerLine = screen.getByTestId("payer-line")
    expect(within(payerLine).getByText("志明")).toBeInTheDocument()
    expect(within(payerLine).getByText("小美")).toBeInTheDocument()
    expect(payerLine.textContent).toContain("TWD 800")
    expect(payerLine.textContent).toContain("TWD 480")
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
    expect(screen.getByRole("columnheader", { name: "旅伴" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "已付" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "應付" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "餘額" })).toBeInTheDocument()
  })

  it("puts both balance signs before the currency", () => {
    renderDialog(equalSplitData())
    expect(screen.getByTestId("balance-a").textContent).toBe("-TWD 2,540")
    expect(screen.getByTestId("balance-b").textContent).toBe("+TWD 2,540")
  })

  it("renders the settlement plan row and the transfer count note", () => {
    renderDialog(equalSplitData())
    const plan = screen.getByTestId("plan-0")
    expect(within(plan).getByText("志明")).toBeInTheDocument()
    expect(within(plan).getByText("小美")).toBeInTheDocument()
    expect(within(plan).getByText("TWD 2,540")).toBeInTheDocument()
    expect(screen.getByText(/共需 1 筆轉帳/)).toBeInTheDocument()
  })

  it("lists each participant's final share with their avatar", () => {
    renderDialog(equalSplitData())
    const split = screen.getByTestId("split-line")
    expect(split.textContent).toContain("分攤：")
    expect(split.textContent).toContain("志明")
    expect(split.textContent).toContain("小美")
    expect(split.textContent).toContain("TWD 320")
    expect(split.querySelectorAll("[data-split-member]")).toHaveLength(2)
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
    expect(split.textContent).toContain("志明")
    expect(split.textContent).toContain("TWD 100")
    expect(split.textContent).toContain("小美")
    expect(split.textContent).toContain("TWD 220")
    expect(split.textContent).not.toContain("÷")
  })

  it("renders the all-settled empty state without a transfer plan", () => {
    const data = equalSplitData()
    data.settlements = []
    renderDialog(data)
    expect(screen.getByText("所有人都已結清，無需轉帳！")).toBeInTheDocument()
    expect(screen.queryByText(/共需/)).not.toBeInTheDocument()
  })

  it("shows each participant's final share and keeps the payer avatar", () => {
    const data = equalSplitData()
    data.expenseDetails[0].payers[0].userImage = "https://cdn.example/zhiming.jpg"
    data.expenseDetails[0].participants = [
      { memberId: "a", displayName: "志明", userImage: "https://cdn.example/zhiming.jpg", shareAmount: 980, convertedShareAmount: 980, personalItems: [{ name: "溫泉", amount: 660, convertedAmount: 660 }], sharedAmount: 320 },
      { memberId: "b", displayName: "小美", userImage: null, shareAmount: 300, convertedShareAmount: 300, personalItems: [{ name: "紀念品", amount: 300, convertedAmount: 300 }], sharedAmount: 0 },
    ]
    renderDialog(data)
    const payer = screen.getByTestId("payer-line")
    expect(payer.querySelector('img[src="https://cdn.example/zhiming.jpg"]')).toBeInTheDocument()
    const split = screen.getByTestId("split-line")
    expect(split.textContent).toContain("志明")
    expect(split.textContent).toContain("TWD 980")
    expect(split.textContent).toContain("小美")
    expect(split.textContent).toContain("TWD 300")
    expect(split.textContent).not.toContain("個人")
    expect(split.textContent).not.toContain("共同")
    expect(split.textContent).not.toContain("溫泉")
  })

  it("does not describe split buckets when personal and custom amounts are mixed", () => {
    const data = equalSplitData()
    data.expenseDetails[0].participants = [
      { memberId: "a", displayName: "志明", shareAmount: 500, convertedShareAmount: 500, personalItems: [{ name: "溫泉", amount: 200, convertedAmount: 200 }, { name: "按摩", amount: 100, convertedAmount: 100 }], sharedAmount: 200 },
      { memberId: "b", displayName: "小美", shareAmount: 300, convertedShareAmount: 300, personalItems: [], sharedAmount: 0, customAmount: 300 },
    ]
    renderDialog(data)
    const split = screen.getByTestId("split-line")
    expect(split.textContent).toContain("志明")
    expect(split.textContent).toContain("TWD 500")
    expect(split.textContent).toContain("小美")
    expect(split.textContent).toContain("TWD 300")
    expect(split.textContent).not.toContain("個人")
    expect(split.textContent).not.toContain("共同")
    expect(split.textContent).not.toContain("指定")
  })

  it("uses different colours for names and amounts in the payer and split lines", () => {
    renderDialog(equalSplitData())
    const payer = screen.getByTestId("payer-line")
    expect(payer.querySelector("[data-payer-name]")?.className).toContain("text-v2-ink")
    expect(payer.querySelector("[data-payer-amount]")?.className).toContain("text-v2-gold")

    const split = screen.getByTestId("split-line")
    expect(split.querySelector("[data-split-name]")?.className).toContain("text-v2-ink")
    expect(split.querySelector("[data-split-amount]")?.className).toContain("text-v2-gold")
  })

  it("lets the member balance table scroll horizontally on its own", () => {
    renderDialog(equalSplitData())
    const scroller = screen.getByTestId("balance-table-scroll")
    expect(scroller.className).toContain("overflow-x-auto")
    expect(screen.getByRole("table").className).toContain("min-w-max")
    expect(screen.getByTestId("expense-detail-list").className).toContain("max-h-[40vh]")
  })

  it("filters expenses, balances and transfers to the current member", () => {
    const data = equalSplitData()
    data.expenseDetails[0].payers = [
      { memberId: "a", displayName: "志明", amount: 800, convertedAmount: 800 },
      { memberId: "b", displayName: "小美", amount: 480, convertedAmount: 480 },
    ]
    data.balances.push({ memberId: "c", displayName: "阿華", userImage: null, balance: -100, totalPaid: 0, totalShare: 100 })
    data.settlements.push({
      from: { memberId: "b", displayName: "小美", userImage: null },
      to: { memberId: "c", displayName: "阿華", userImage: null },
      amount: 100,
    })
    data.expenseDetails.push({
      id: "e2",
      description: "小美專屬",
      amount: 500,
      currency: "TWD",
      convertedAmount: 500,
      payers: [{ memberId: "b", displayName: "小美", amount: 500, convertedAmount: 500 }],
      participants: [{ memberId: "b", displayName: "小美", shareAmount: 500, convertedShareAmount: 500 }],
    })
    renderDialog(data)

    fireEvent.click(screen.getByRole("button", { name: "只看我" }))

    expect(screen.getByRole("button", { name: "只看我" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("支出明細（共 1 筆）")).toBeInTheDocument()
    expect(screen.getByText(/一蘭拉麵晚餐 · TWD 1,280/)).toBeInTheDocument()
    const payer = screen.getByTestId("payer-line")
    expect(payer.textContent).toContain("我付款：")
    expect(payer.textContent).toContain("TWD 800")
    expect(payer.textContent).not.toContain("我付款：我")
    expect(payer.textContent).not.toContain("小美")
    expect(payer.textContent).not.toContain("TWD 480")
    const split = screen.getByTestId("split-line")
    expect(split.textContent).toContain("我分攤：")
    expect(split.textContent).toContain("TWD 320")
    expect(split.querySelectorAll("[data-split-member]")).toHaveLength(1)
    expect(split.textContent).not.toContain("小美")
    expect(screen.queryByText(/小美專屬/)).not.toBeInTheDocument()
    expect(screen.getByTestId("balance-a")).toBeInTheDocument()
    expect(screen.queryByTestId("balance-b")).not.toBeInTheDocument()
    expect(screen.queryByTestId("balance-c")).not.toBeInTheDocument()
    expect(screen.getByTestId("plan-0")).toBeInTheDocument()
    expect(screen.queryByTestId("plan-1")).not.toBeInTheDocument()
    expect(screen.getByText(/與你有關的轉帳共 1 筆/)).toBeInTheDocument()
  })

  it("shows a no-related-transfer state when only my filter hides every plan", () => {
    const data = equalSplitData()
    data.settlements = [
      {
        from: { memberId: "b", displayName: "小美", userImage: null },
        to: { memberId: "c", displayName: "阿華", userImage: null },
        amount: 100,
      },
    ]
    renderDialog(data)
    fireEvent.click(screen.getByRole("button", { name: "只看我" }))
    expect(screen.getByText("目前沒有與你有關的轉帳")).toBeInTheDocument()
  })

  it("hides the only-me filter when the current member is unknown", () => {
    renderDialog(equalSplitData(), vi.fn(), true, undefined, null)
    expect(screen.queryByRole("button", { name: "只看我" })).not.toBeInTheDocument()
  })

  it("uses the sand placeholder style for a placeholder payer", () => {
    renderDialog(equalSplitData(), vi.fn(), true, new Set(["a"]))
    const payer = screen.getByTestId("payer-line")
    expect(within(payer).getByTestId("placeholder-avatar")).toHaveTextContent("志")
  })

  it("does not render a negative custom amount from a rounding remainder", () => {
    const data = equalSplitData()
    data.expenseDetails[0].participants = [
      { memberId: "a", displayName: "志明", shareAmount: 100, convertedShareAmount: 100, personalItems: [], sharedAmount: 0, customAmount: -0.01 },
      { memberId: "b", displayName: "小美", shareAmount: 220, convertedShareAmount: 220, personalItems: [{ name: "紀念品", amount: 220, convertedAmount: 220 }], sharedAmount: 0 },
    ]
    renderDialog(data)
    const split = screen.getByTestId("split-line")
    expect(split.textContent).toContain("志明")
    expect(split.textContent).toContain("TWD 100")
    expect(split.textContent).toContain("小美")
    expect(split.textContent).toContain("TWD 220")
    expect(split.textContent).not.toContain("指定")
    expect(split.textContent).not.toContain("個人")
  })

  it("renders a placeholder split for an expense with no participants", () => {
    const data = equalSplitData()
    data.expenseDetails = [{ ...data.expenseDetails[0], id: "e2", participants: [], convertedAmount: 0 }]
    renderDialog(data)
    expect(screen.getByTestId("split-line").textContent).toBe("分攤：—")
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

  it("stays open when the dialog card itself is clicked", () => {
    const onOpenChange = renderShare()
    fireEvent.click(screen.getByRole("dialog"))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("shows the share text in the preview", () => {
    renderShare()
    const preview = screen.getByTestId("settle-share-preview")
    expect(preview).toHaveTextContent("💰 結算明細")
    expect(preview).toHaveTextContent("1. 志明 ➡️ 小美：TWD 2,540")
  })

  it("copies the share text and flips the button to 已複製", async () => {
    renderShare()
    fireEvent.click(screen.getByRole("button", { name: "複製文字" }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SHARE_TEXT)
    expect(await screen.findByRole("button", { name: "已複製" })).toBeInTheDocument()
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

  it("styles the LINE button with the v2 line-green token", () => {
    renderShare()
    const line = screen.getByRole("button", { name: /LINE 分享/ })
    // Intentional token check: LINE's brand green must use the v2 token.
    expect(line.className).toContain("bg-v2-line-green")
  })

  it("shares through the Web Share API from the more button", () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "share", { configurable: true, value: share })
    renderShare()
    fireEvent.click(screen.getByRole("button", { name: "更多" }))
    expect(share).toHaveBeenCalledWith({ title: "結算結果", text: SHARE_TEXT })
  })

  it("falls back to copying when the Web Share API is unavailable", async () => {
    delete (navigator as { share?: unknown }).share
    renderShare()
    fireEvent.click(screen.getByRole("button", { name: "更多" }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SHARE_TEXT)
    expect(await screen.findByRole("button", { name: "已複製" })).toBeInTheDocument()
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
