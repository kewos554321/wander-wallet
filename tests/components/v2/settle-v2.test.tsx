import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { SettleV2View } from "@/components/v2/settle/settle-v2-view"
import type { SettleData } from "@/lib/hooks/useSettlement"

const data: SettleData = {
  balances: [
    { memberId: "me", displayName: "Emma", userImage: null, balance: 3370, totalPaid: 18200, totalShare: 14830 },
    { memberId: "mei", displayName: "小美", userImage: null, balance: -2400, totalPaid: 12430, totalShare: 14830 },
  ],
  settlements: [
    { from: { memberId: "mei", displayName: "小美", userImage: null }, to: { memberId: "me", displayName: "Emma", userImage: null }, amount: 2400 },
  ],
  expenseDetails: [],
  summary: { totalExpenses: 12, totalAmount: 29660, totalShared: 29660, isBalanced: true, currency: "TWD", exchangeRatesUsed: { JPY: 0.2 } },
}

function renderView(overrides: Partial<Parameters<typeof SettleV2View>[0]> = {}) {
  const props: Parameters<typeof SettleV2View>[0] = {
    projectId: "p1",
    data,
    currentMemberId: "me",
    dailyAverage: 5932,
    displayCurrencyCode: "TWD",
    currencyOptions: ["TWD", "JPY"],
    onDisplayCurrency: vi.fn(),
    toDisplay: (n: number) => n,
    adSlot: <div>ad</div>,
    onShowCalc: vi.fn(),
    onShare: vi.fn(),
    ...overrides,
  }
  render(<SettleV2View {...props} />)
  return props
}

describe("SettleV2View", () => {
  it("shows the four summary tiles", () => {
    renderView()
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("12")).toBeInTheDocument()
    expect(within(grid).getByText("29,660")).toBeInTheDocument()
    expect(within(grid).getByText("5,932")).toBeInTheDocument()
    expect(within(grid).getByText("14,830")).toBeInTheDocument()
    expect(within(grid).getByText("總金額 (TWD)")).toBeInTheDocument()
  })

  it("lists transfers with 我 for the current member", () => {
    renderView()
    const row = screen.getByTestId("settlement-0")
    expect(within(row).getByText("小美")).toBeInTheDocument()
    expect(within(row).getByText("我", { selector: "span.font-medium" })).toBeInTheDocument()
    expect(within(row).getByText("TWD 2,400")).toBeInTheDocument()
  })

  it("shows the settled state without transfers", () => {
    renderView({ data: { ...data, settlements: [] } })
    expect(screen.getByText("所有人都已結清")).toBeInTheDocument()
  })

  it("shows per-member balances", () => {
    renderView()
    const section = screen.getByRole("region", { name: "各人收支" })
    expect(within(section).getByText("+TWD 3,370")).toBeInTheDocument()
    expect(within(section).getByText("−TWD 2,400")).toBeInTheDocument()
  })

  it("wires calc, share, stats link and currency select", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: "計算說明" }))
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    expect(props.onShowCalc).toHaveBeenCalled()
    expect(props.onShare).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: /查看統計/ })).toHaveAttribute("href", "/projects/p1/stats")
    expect(screen.getByLabelText("顯示幣別")).toBeInTheDocument()
  })

  it("hides the currency select with a single currency", () => {
    renderView({ currencyOptions: ["TWD"] })
    expect(screen.queryByLabelText("顯示幣別")).not.toBeInTheDocument()
  })

  it("shows the exchange-rate note and sponsor card", () => {
    renderView()
    expect(screen.getByRole("link", { name: /前往專案設定調整匯率/ })).toHaveAttribute("href", "/projects/p1/settings")
    expect(screen.getByText("喜歡 Wander Wallet 嗎？")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Buy Me a Coffee/ })).toBeInTheDocument()
  })

  it("shows 0 per person without balances", () => {
    renderView({ data: { ...data, balances: [], settlements: [] } })
    expect(within(screen.getByTestId("settle-summary")).getAllByText("0").length).toBeGreaterThan(0)
  })
})
