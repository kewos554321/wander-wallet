import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { SettleV2View } from "@/components/v2/settle/settle-v2-view"
import type { SettleData } from "@/lib/hooks/useSettlement"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))
vi.mock("@/components/ads/ad-container", () => ({ AdContainer: () => null }))
vi.mock("@/components/settle/share-settlement-dialog", () => ({ ShareSettlementDialog: () => null }))
vi.mock("@/components/settle/settlement-calc-dialog", () => ({ SettlementCalcDialog: () => null }))

const mockProjectData = vi.fn()
vi.mock("@/lib/hooks", () => ({ useProjectData: () => mockProjectData() }))

const mockSettlement = vi.fn()
vi.mock("@/lib/hooks/useSettlement", () => ({ useSettlement: () => mockSettlement() }))

import { SettleV2 } from "@/components/v2/settle/settle-v2"

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

  it("shows the no-expenses state when there are no expenses at all", () => {
    renderView({ data: { ...data, settlements: [], summary: { ...data.summary, totalExpenses: 0 } } })
    expect(screen.getByText("尚無支出記錄")).toBeInTheDocument()
    expect(screen.queryByText("所有人都已結清")).not.toBeInTheDocument()
  })

  it("does not render the per-member balances section", () => {
    renderView()
    expect(screen.queryByRole("region", { name: "各人收支" })).not.toBeInTheDocument()
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

  it("opens the sponsor links", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null)
    renderView()
    fireEvent.click(screen.getByRole("button", { name: /Buy Me a Coffee/ }))
    fireEvent.click(screen.getByRole("button", { name: "Ko-fi" }))
    fireEvent.click(screen.getByRole("button", { name: "PayPal" }))
    expect(open).toHaveBeenCalledTimes(3)
    open.mockRestore()
  })

  it("shows 0 per person without balances", () => {
    renderView({ data: { ...data, balances: [], settlements: [] } })
    expect(within(screen.getByTestId("settle-summary")).getAllByText("0").length).toBeGreaterThan(0)
  })

  it("uses the sky tone for the daily-average tile", () => {
    renderView()
    const tile = screen.getByTestId("settle-tile-daily")
    expect(tile.className).toContain("bg-v2-sky-soft")
    expect(tile.className).not.toContain("bg-v2-lake-soft")
    const iconCircle = tile.querySelector("div[aria-hidden='true']")
    expect(iconCircle?.className).toContain("bg-v2-sky-tint")
  })

  it("keeps the summary heading inside the summary card", () => {
    renderView()
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("計算總覽")).toBeInTheDocument()
  })

  it("renders the summary tile values in ink", () => {
    renderView()
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("29,660").className).toContain("text-v2-ink")
  })

  it("keeps the transfer heading in the same card as the rows", () => {
    renderView()
    const row = screen.getByTestId("settlement-0")
    const heading = screen.getByText("轉帳建議")
    expect(row.closest("div.rounded-2xl")).toBe(heading.closest("div.rounded-2xl"))
  })

  it("uses the gold tone for the current user avatar", () => {
    renderView()
    const row = screen.getByTestId("settlement-0")
    const meLabel = within(row).getByText("我", { selector: "span.font-medium" })
    expect(meLabel.previousElementSibling?.className).toContain("bg-v2-gold-soft")
  })
})

describe("SettleV2 container", () => {
  beforeEach(() => {
    mockProjectData.mockReset().mockReturnValue({ project: null, members: [] })
    mockSettlement.mockReset()
  })

  it("shows a back link in the error state", () => {
    mockSettlement.mockReturnValue({
      data: null,
      loading: false,
      error: "獲取結算數據失敗",
      displayCurrencyCode: "TWD",
      setDisplayCurrency: vi.fn(),
      toDisplay: (n: number) => n,
      shareText: "",
    })
    render(<SettleV2 projectId="p1" />)
    expect(screen.getByText("結算")).toBeInTheDocument()
    expect(screen.getByText("結算").className).toContain("font-bold")
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByText("獲取結算數據失敗")).toBeInTheDocument()
  })

  it("shows a back link while loading", () => {
    mockSettlement.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      displayCurrencyCode: "TWD",
      setDisplayCurrency: vi.fn(),
      toDisplay: (n: number) => n,
      shareText: "",
    })
    render(<SettleV2 projectId="p1" />)
    expect(screen.getByText("結算").className).toContain("font-bold")
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByTestId("v2-settle-skeleton")).toBeInTheDocument()
  })
})
