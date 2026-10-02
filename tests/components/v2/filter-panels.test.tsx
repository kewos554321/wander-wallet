import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
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
  render(<ExpenseFilterBar {...props} />)
  return props
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

  it("toggles a category and clears the panel", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "餐飲" }))
    expect(props.onToggleCategory).toHaveBeenCalledWith("food")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearCategories).toHaveBeenCalled()
  })

  it("single-selects a payer and clears", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    fireEvent.click(screen.getByRole("radio", { name: "志明" }))
    expect(props.onSetPayers).toHaveBeenCalledWith(new Set(["chi"]))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearPayers).toHaveBeenCalled()
  })

  it("shows the empty state when there are no payers", () => {
    renderBar({ payers: [] })
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    expect(screen.getByText("沒有資料")).toBeInTheDocument()
  })

  it("multi-selects participants", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    expect(props.onToggleParticipant).toHaveBeenCalledWith("chi")
  })

  it("toggles a currency and clears", () => {
    const props = renderBar({ currencies: ["TWD", "JPY"] })
    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "JPY" }))
    expect(props.onToggleCurrency).toHaveBeenCalledWith("JPY")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearCurrencies).toHaveBeenCalled()
  })

  it("changes the amount range and clears", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    fireEvent.change(screen.getByLabelText("最低金額"), { target: { value: "100" } })
    expect(props.onAmountRange).toHaveBeenCalledWith([100, 0])
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onAmountRange).toHaveBeenCalledWith([0, 0])
  })

  it("clears the payment date range", () => {
    const props = renderBar({
      filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) } },
    })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onExpenseRange).toHaveBeenCalledWith(undefined)
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
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: /付款人/ })).toHaveAttribute("aria-expanded", "true")
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
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    expect(screen.getByRole("radio", { name: "志明" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    expect(screen.getByRole("checkbox", { name: "我" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    expect(screen.getByRole("checkbox", { name: "JPY" })).toHaveAttribute("aria-checked", "true")
    expect(props.filters.selectedPayers).toBeDefined()
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
})
