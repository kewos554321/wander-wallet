import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ExpenseFilterBar } from "@/components/v2/expenses/expense-filter-bar"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"

const baseFilters: ExpenseFilters = {
  searchQuery: "",
  selectedCategories: new Set(),
  selectedPayers: new Set(),
  selectedParticipants: new Set(),
  selectedCurrencies: new Set(),
  amountRange: [0, 0],
  createdDateRange: undefined,
  expenseDateRange: undefined,
}

function renderBar(overrides: Partial<Parameters<typeof ExpenseFilterBar>[0]> = {}) {
  const props: Parameters<typeof ExpenseFilterBar>[0] = {
    filters: baseFilters,
    currency: "TWD",
    maxAmount: 6400,
    payers: [
      { id: "me", displayName: "我" },
      { id: "chi", displayName: "志明" },
    ],
    participants: [
      { id: "me", displayName: "我" },
      { id: "chi", displayName: "志明" },
    ],
    currencies: ["TWD"],
    hasActiveFilters: false,
    currentMemberId: "me",
    onSearch: vi.fn(),
    onToggleCategory: vi.fn(),
    onClearCategories: vi.fn(),
    onSetPayers: vi.fn(),
    onClearPayers: vi.fn(),
    onToggleParticipant: vi.fn(),
    onClearParticipants: vi.fn(),
    onToggleCurrency: vi.fn(),
    onClearCurrencies: vi.fn(),
    onAmountRange: vi.fn(),
    onExpenseRange: vi.fn(),
    onClearFilters: vi.fn(),
    ...overrides,
  }
  const { unmount } = render(<ExpenseFilterBar {...props} />)
  return { ...props, unmount }
}

describe("ExpenseFilterBar panels", () => {
  it("searches by text", () => {
    const props = renderBar()
    fireEvent.change(screen.getByLabelText("搜尋支出描述"), { target: { value: "拉麵" } })
    expect(props.onSearch).toHaveBeenCalledWith("拉麵")
  })

  it("opens the category panel with one checkbox per category", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    expect(screen.getAllByRole("checkbox")).toHaveLength(8)
  })

  it("toggles a panel open and closed from its trigger", () => {
    renderBar()
    const trigger = screen.getByRole("button", { name: /類別/ })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    fireEvent.click(trigger)
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByTestId("filter-panel")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByTestId("filter-panel")).not.toBeInTheDocument()
  })

  it("keeps the date trigger's accessible name when its label becomes a range", () => {
    renderBar({
      filters: {
        ...baseFilters,
        expenseDateRange: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) },
      },
    })
    const trigger = screen.getByRole("button", { name: "付款日期" })
    expect(within(trigger).getByText("11/12~11/16")).toBeInTheDocument()
  })

  it("styles the date panel's clear control like the other panels", () => {
    renderBar({ filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12) } } })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    const clear = screen.getByRole("button", { name: "清除" })
    expect(clear.className).toContain("text-v2-danger")
    expect(clear.querySelector("svg")).toBeInTheDocument()
  })

  it("shows the chevron for an inactive trigger and the count badge once a filter is active", () => {
    const first = renderBar()
    expect(within(screen.getByRole("button", { name: /付款成員/ })).getByTestId("filter-chevron")).toBeInTheDocument()
    first.unmount()
    renderBar({ filters: { ...baseFilters, selectedPayers: new Set(["chi"]) } })
    const active = screen.getByRole("button", { name: /付款成員/ })
    expect(within(active).getByText("1")).toBeInTheDocument()
    expect(within(active).queryByTestId("filter-chevron")).not.toBeInTheDocument()
  })

  it("shows the badge and not the chevron when an active chip is open", () => {
    renderBar({ filters: { ...baseFilters, selectedCategories: new Set(["food"]) } })
    const trigger = screen.getByRole("button", { name: /類別/ })
    fireEvent.click(trigger)
    expect(within(trigger).getByText("1")).toBeInTheDocument()
    expect(within(trigger).queryByTestId("filter-chevron")).not.toBeInTheDocument()
  })

  it("navigates the date panel months with the arrow buttons", () => {
    renderBar({ filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12) } } })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    expect(screen.getByText("2026年11月")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "下個月" }))
    expect(screen.getByText("2026年12月")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "上個月" }))
    expect(screen.getByText("2026年11月")).toBeInTheDocument()
  })

  it("shows the amount panel clear action only once a range is set", () => {
    const first = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    expect(screen.queryByRole("button", { name: "清除" })).not.toBeInTheDocument()
    first.unmount()
    renderBar({ filters: { ...baseFilters, amountRange: [100, 200] } })
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    expect(screen.getByRole("button", { name: "清除" })).toBeInTheDocument()
  })

  it("hides the panel clear action when nothing is selected", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    expect(screen.queryByRole("button", { name: "清除" })).not.toBeInTheDocument()
  })

  it("toggles a category and clears the panel", () => {
    const props = renderBar({ filters: { ...baseFilters, selectedCategories: new Set(["food"]) } })
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "餐飲" }))
    expect(props.onToggleCategory).toHaveBeenCalledWith("food")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearCategories).toHaveBeenCalled()
  })

  it("single-selects a payer", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /付款成員/ }))
    fireEvent.click(screen.getByRole("radio", { name: "志明" }))
    expect(props.onSetPayers).toHaveBeenCalledWith(new Set(["chi"]))
  })

  it("clears the selected payer", () => {
    const props = renderBar({ filters: { ...baseFilters, selectedPayers: new Set(["chi"]) } })
    fireEvent.click(screen.getByRole("button", { name: /付款成員/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearPayers).toHaveBeenCalled()
  })

  it("shows the empty state when there are no payers", () => {
    renderBar({ payers: [] })
    fireEvent.click(screen.getByRole("button", { name: /付款成員/ }))
    expect(screen.getByText("沒有資料")).toBeInTheDocument()
  })

  it("multi-selects participants", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    expect(props.onToggleParticipant).toHaveBeenCalledWith("chi")
  })

  it("toggles a currency and clears", () => {
    const props = renderBar({ currencies: ["TWD", "JPY"], filters: { ...baseFilters, selectedCurrencies: new Set(["JPY"]) } })
    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "JPY" }))
    expect(props.onToggleCurrency).toHaveBeenCalledWith("JPY")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearCurrencies).toHaveBeenCalled()
  })

  it("changes the amount range and clears", () => {
    const props = renderBar({ filters: { ...baseFilters, amountRange: [100, 200] } })
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    fireEvent.change(screen.getByLabelText("最低金額"), { target: { value: "150" } })
    expect(props.onAmountRange).toHaveBeenCalledWith([150, 200])
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onAmountRange).toHaveBeenCalledWith([0, 0])
  })

  it("shows amount labels and updates the maximum", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    // Header shows the currency code; the labels use the generic "$".
    expect(screen.getByText("設定金額區間 (TWD)")).toBeInTheDocument()
    expect(screen.getByText("$0")).toBeInTheDocument()
    expect(screen.getByText("$6,400")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("最高金額"), { target: { value: "3000" } })
    expect(props.onAmountRange).toHaveBeenCalledWith([0, 3000])
  })

  it("draws a divider under the amount panel header, like the other panels", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    const panel = screen.getByTestId("filter-panel")
    expect(panel.querySelector(".h-px.bg-v2-line-soft")).toBeInTheDocument()
  })

  it("clears the payment date range", () => {
    const props = renderBar({
      filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) } },
    })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onExpenseRange).toHaveBeenCalledWith(undefined)
  })

  it("picks the range end from the date panel", () => {
    const props = renderBar({ filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12) } } })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    fireEvent.click(screen.getByRole("button", { name: "2026-11-14" }))
    expect(props.onExpenseRange).toHaveBeenCalledWith({ from: new Date(2026, 10, 12), to: new Date(2026, 10, 14) })
  })

  it("restarts the range when the picked day precedes the current start", () => {
    const props = renderBar({ filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12) } } })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    fireEvent.click(screen.getByRole("button", { name: "2026-11-05" }))
    expect(props.onExpenseRange).toHaveBeenCalledWith({ from: new Date(2026, 10, 5), to: new Date(2026, 10, 12) })
  })

  it("restarts the range when both ends are already set", () => {
    const props = renderBar({
      filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) } },
    })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    fireEvent.click(screen.getByRole("button", { name: "2026-11-20" }))
    expect(props.onExpenseRange).toHaveBeenCalledWith({ from: new Date(2026, 10, 20), to: undefined })
  })

  it("closes the open panel on outside click", () => {
    renderBar()
    const trigger = screen.getByRole("button", { name: /類別/ })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    fireEvent.mouseDown(document.body)
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
  })

  it("closes the open panel on Escape", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps only one panel open at a time", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.click(screen.getByRole("button", { name: /付款成員/ }))
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: /付款成員/ })).toHaveAttribute("aria-expanded", "true")
  })

  it("renders checked controls for preselected filters", () => {
    const props = renderBar({
      filters: {
        ...baseFilters,
        selectedCategories: new Set(["food"]),
        selectedPayers: new Set(["chi"]),
        selectedParticipants: new Set(["me"]),
        selectedCurrencies: new Set(["JPY"]),
      },
      currencies: ["TWD", "JPY"],
    })
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    expect(screen.getByRole("checkbox", { name: "餐飲" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /付款成員/ }))
    expect(screen.getByRole("radio", { name: "志明" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    expect(screen.getByRole("checkbox", { name: "我" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    expect(screen.getByRole("checkbox", { name: "JPY" })).toHaveAttribute("aria-checked", "true")
    expect(props.filters.selectedPayers).toEqual(new Set(["chi"]))
  })

  it("shows 移除篩選 only when filters are active", () => {
    renderBar()
    expect(screen.queryByRole("button", { name: /移除篩選/ })).not.toBeInTheDocument()
    renderBar({ hasActiveFilters: true })
    expect(screen.getAllByRole("button", { name: /移除篩選/ })).toHaveLength(1)
  })

  it("calls onClearFilters from the chip", () => {
    const props = renderBar({ hasActiveFilters: true })
    fireEvent.click(screen.getByRole("button", { name: /移除篩選/ }))
    expect(props.onClearFilters).toHaveBeenCalled()
  })

  it("shows an open-ended label when only the start date is chosen", () => {
    renderBar({ filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12) } } })
    expect(screen.getByText("11/12~")).toBeInTheDocument()
  })

  it("clears the payer when the selected payer is toggled again", () => {
    const props = renderBar({ filters: { ...baseFilters, selectedPayers: new Set(["chi"]) } })
    fireEvent.click(screen.getByRole("button", { name: /付款成員/ }))
    fireEvent.click(screen.getByRole("radio", { name: "志明" }))
    expect(props.onSetPayers).toHaveBeenCalledWith(new Set())
  })

  it("keeps the date panel inside the viewport (fixed, flips up)", () => {
    const rect = {
      top: 700,
      bottom: 730,
      left: 320,
      right: 400,
      width: 80,
      height: 30,
      x: 320,
      y: 700,
      toJSON: () => ({}),
    } as DOMRect
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect)
    const ow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")
    const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 236 })
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 260 })

    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    const panel = screen.getByTestId("filter-panel")
    expect(panel.className).toContain("fixed")
    // bottom 730 + 4 + 260 exceeds the jsdom viewport height → the panel opens upward.
    expect(parseFloat(panel.style.top)).toBeLessThan(700)
    expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(4)

    rectSpy.mockRestore()
    if (ow) Object.defineProperty(HTMLElement.prototype, "offsetWidth", ow)
    if (oh) Object.defineProperty(HTMLElement.prototype, "offsetHeight", oh)
  })

  it("clamps the date panel to the filter grid, not the viewport", () => {
    const domRect = (left: number, top: number, right: number, bottom: number) =>
      ({ left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) }) as DOMRect

    // 360px-wide single-currency layout: the filter grid spans 16..344, the
    // 金額 chip is column 1 and the 付款日期 chip is column 2 (128..232). A
    // 236px panel right-aligned to the trigger would reach x=4, 12px left of
    // the grid/金額 edge, so it must be clamped to the grid's content box.
    const gridRect = domRect(16, 300, 344, 376)
    const triggerRect = domRect(128, 344, 232, 376)
    const zero = domRect(0, 0, 0, 0)
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.className.includes("grid-cols-3")) return gridRect
      if (this.querySelector('button[aria-label="付款日期"]')) return triggerRect
      return zero
    })
    const ow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")
    const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 236 })
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 260 })

    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    expect(parseFloat(screen.getByTestId("filter-panel").style.left)).toBe(16)

    rectSpy.mockRestore()
    if (ow) Object.defineProperty(HTMLElement.prototype, "offsetWidth", ow)
    if (oh) Object.defineProperty(HTMLElement.prototype, "offsetHeight", oh)
  })
})
