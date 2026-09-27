import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ExpensesV2View } from "@/components/v2/expenses/expenses-v2-view"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).toISOString()
const now = new Date(2026, 10, 16, 21, 0)
const zhi = { id: "chi", displayName: "志明", userId: null, user: null }
const me = { id: "me", displayName: "Emma", userId: "u1", user: null }

function expense(overrides: Partial<ProjectExpense>): ProjectExpense {
  return {
    id: "e",
    amount: 1280,
    currency: "TWD",
    description: "一蘭拉麵晚餐",
    category: "food",
    image: null,
    location: null,
    latitude: null,
    longitude: null,
    expenseDate: at(11, 16, 19, 20),
    createdAt: at(11, 16, 19, 22),
    payer: zhi,
    participants: [
      { id: "p1", shareAmount: 640, member: zhi },
      { id: "p2", shareAmount: 640, member: me },
    ],
    ...overrides,
  }
}

const expenses = [
  expense({ id: "e1" }),
  expense({ id: "e2", description: null, category: "transport", amount: 6400, payer: me, expenseDate: at(11, 15, 9), createdAt: at(11, 15, 9, 3), location: "京都市內", image: "https://example.com/r.jpg" }),
]

function renderView(overrides: Partial<Parameters<typeof ExpensesV2View>[0]> = {}) {
  const props: Parameters<typeof ExpensesV2View>[0] = {
    projectId: "p1",
    currency: "TWD",
    dateRangeLabel: "11/12 – 11/16",
    allCount: expenses.length,
    expenses,
    summary: { total: 7680, count: 2, average: 3840 },
    currentMemberId: "me",
    now,
    filterBar: <div>filters</div>,
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    selectMode: false,
    selectedIds: new Set<string>(),
    onToggleSelectMode: vi.fn(),
    onToggleSelect: vi.fn(),
    onRequestDelete: vi.fn(),
    onRequestBatchDelete: vi.fn(),
    onViewImage: vi.fn(),
    onVoice: vi.fn(),
    ...overrides,
  }
  render(<ExpensesV2View {...props} />)
  return props
}

describe("ExpensesV2View", () => {
  it("shows the summary card", () => {
    renderView()
    expect(screen.getByText("11/12 – 11/16")).toBeInTheDocument()
    expect(screen.getByText("TWD 7,680")).toBeInTheDocument()
    expect(screen.getByText("2 筆")).toBeInTheDocument()
    expect(screen.getByText("TWD 3,840")).toBeInTheDocument()
  })

  it("groups by payment day and renders card details", () => {
    renderView()
    expect(screen.getByText("11/16（今天）")).toBeInTheDocument()
    expect(screen.getByText("11/15")).toBeInTheDocument()
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(card).toHaveAttribute("href", "/projects/p1/expenses/e1/edit")
    expect(within(card).getByText("付款 11/16 19:20")).toBeInTheDocument()
    expect(within(card).getByText("建立 11/16 19:22")).toBeInTheDocument()
    expect(screen.getByText("TWD 1,280")).toBeInTheDocument()
  })

  it("falls back to the category label, shows location, payer as 我 and head count", () => {
    renderView()
    const card = screen.getByRole("link", { name: /交通/ })
    expect(within(card).getByText("京都市內")).toBeInTheDocument()
    const footer = screen.getByTestId("expense-footer-e2")
    expect(within(footer).getByText("我", { selector: "span.font-medium" })).toBeInTheDocument()
    expect(within(footer).getByText("2人")).toBeInTheDocument()
  })

  it("shows the count line and wires clear, batch, delete, image and voice", () => {
    const props = renderView({ hasActiveFilters: true })
    expect(screen.getByText(/顯示/).textContent).toBe("顯示 2 / 2 筆")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    fireEvent.click(screen.getByRole("button", { name: "批次" }))
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    fireEvent.click(screen.getByRole("button", { name: "查看圖片" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(props.onClearFilters).toHaveBeenCalled()
    expect(props.onToggleSelectMode).toHaveBeenCalled()
    expect(props.onRequestDelete).toHaveBeenCalledWith(expenses[0])
    expect(props.onViewImage).toHaveBeenCalledWith("https://example.com/r.jpg")
    expect(props.onVoice).toHaveBeenCalled()
  })

  it("hides the clear button without active filters", () => {
    renderView()
    expect(screen.queryByRole("button", { name: "清除" })).not.toBeInTheDocument()
  })

  it("switches cards to checkboxes in select mode", () => {
    const props = renderView({ selectMode: true, selectedIds: new Set(["e1"]) })
    expect(screen.queryAllByRole("button", { name: "刪除" })).toHaveLength(0)
    const boxes = screen.getAllByRole("checkbox")
    expect(boxes[0]).toBeChecked()
    fireEvent.click(boxes[1])
    expect(props.onToggleSelect).toHaveBeenCalledWith("e2")
    fireEvent.click(screen.getByRole("button", { name: "刪除 1 筆" }))
    expect(props.onRequestBatchDelete).toHaveBeenCalled()
  })

  it("shows empty states", () => {
    renderView({ expenses: [], allCount: 0, summary: { total: 0, count: 0, average: 0 } })
    expect(screen.getByText("尚無支出記錄")).toBeInTheDocument()
  })

  it("shows the no-match state when filters remove everything", () => {
    renderView({ expenses: [], allCount: 2, summary: { total: 0, count: 0, average: 0 } })
    expect(screen.getByText("找不到符合的支出")).toBeInTheDocument()
  })
})
