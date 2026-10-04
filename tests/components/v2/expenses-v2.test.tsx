import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react"
import { ExpensesV2View } from "@/components/v2/expenses/expenses-v2-view"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: Record<string, unknown> & { alt?: string }) => <img alt={String(alt ?? "")} {...props} />,
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  projectData: vi.fn(),
  projectExpenses: vi.fn(),
  currencyConversion: vi.fn(),
  expenseFilters: vi.fn(),
}))
vi.mock("@/lib/hooks", () => ({
  useProjectData: () => mocks.projectData(),
  useCurrencyConversion: () => mocks.currencyConversion(),
  useExpenseFilters: () => mocks.expenseFilters(),
}))
vi.mock("@/lib/hooks/useProjectExpenses", () => ({ useProjectExpenses: () => mocks.projectExpenses() }))

import { ExpensesV2 } from "@/components/v2/expenses/expenses-v2"

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).toISOString()
const now = new Date(2026, 10, 16, 21, 0)
const zhi = { id: "chi", displayName: "志明", userId: null, user: null }
const me = { id: "me", displayName: "Emma", userId: "u1", user: null }
const m2 = { id: "m2", displayName: "小美", userId: null, user: null }
const m3 = { id: "m3", displayName: "佳婷", userId: null, user: null }
const m4 = { id: "m4", displayName: "阿凱", userId: null, user: null }

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
    onRequestDelete: vi.fn(),
    onViewImage: vi.fn(),
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

  it("renders both summary stat icons as lake-tinted circles", () => {
    renderView()
    const icons = [screen.getByTestId("summary-count-icon"), screen.getByTestId("summary-average-icon")]
    for (const icon of icons) {
      expect(icon).toHaveClass("rounded-full")
      expect(icon).toHaveClass("bg-v2-lake-tint")
      expect(icon).toHaveClass("text-v2-lake")
      expect(icon).not.toHaveClass("bg-v2-surface")
      expect(icon).not.toHaveClass("text-v2-coral")
    }
  })

  it("groups by payment day and renders card details", () => {
    renderView()
    expect(screen.getByText("11/16（今天）")).toBeInTheDocument()
    expect(screen.getByText("11/15", { selector: "p" })).toBeInTheDocument()
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(card).toHaveAttribute("href", "/projects/p1/expenses/e1/edit")
    expect(within(card).getByText("付款日期")).toBeInTheDocument()
    expect(within(card).getByText("11/16")).toBeInTheDocument()
    expect(screen.getByText("TWD 1,280")).toBeInTheDocument()
  })

  it("falls back to the category label, shows location, payer as 我 and head count", () => {
    renderView()
    const card = screen.getByRole("link", { name: /交通/ })
    expect(within(card).getByText("京都市內")).toBeInTheDocument()
    expect(within(card).getByText("我付款")).toBeInTheDocument()
    expect(within(card).getByText("共2人分攤")).toBeInTheDocument()
  })

  it("always renders the footer, using placeholders without location or image", () => {
    renderView()
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(within(card).getByText("未填寫地點")).toBeInTheDocument()
    expect(within(card).getByLabelText("未附明細圖片")).toBeInTheDocument()
  })

  it("keeps the image button outside the card link", () => {
    renderView()
    const button = screen.getByRole("button", { name: "查看圖片" })
    expect(button.closest("a")).toBeNull()
    expect(screen.getByRole("link", { name: /交通/ })).toHaveAttribute("href", "/projects/p1/expenses/e2/edit")
  })

  it("renders a card with no description and a single participant", () => {
    const single = expense({ id: "e5", description: null, category: "food", location: null, image: null, participants: [{ id: "p1", shareAmount: 100, member: zhi }] })
    renderView({ expenses: [single], allCount: 1, summary: { total: 100, count: 1, average: 100 } })
    const card = screen.getByRole("link", { name: /餐飲/ })
    expect(within(card).getByText("共1人分攤")).toBeInTheDocument()
    expect(within(card).getByText("未填寫地點")).toBeInTheDocument()
  })

  it("shows a +N overflow when there are more than three participants", () => {
    const many = expense({ id: "e6", participants: [me, m2, m3, m4].map((m, i) => ({ id: `p${i}`, shareAmount: 100, member: m })) })
    renderView({ expenses: [many], allCount: 1, summary: { total: 400, count: 1, average: 400 } })
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(within(card).getByText("+1")).toBeInTheDocument()
    expect(within(card).getByText("共4人分攤")).toBeInTheDocument()
  })

  it("renders the payer avatar image in the card when present", () => {
    const withImage = expense({
      id: "e7",
      payer: { ...zhi, user: { id: "u2", name: "志明", email: "zhi@example.com", image: "https://cdn.example/zhi.jpg" } },
    })
    renderView({ expenses: [withImage], allCount: 1, summary: { total: 1280, count: 1, average: 1280 } })
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(card.querySelector('img[src="https://cdn.example/zhi.jpg"]')).toBeInTheDocument()
  })

  it("shows the count line and wires delete and image", () => {
    const props = renderView()
    expect(screen.getByText(/顯示/).textContent).toBe("顯示 2 / 2 筆")
    expect(screen.queryByRole("button", { name: /AI 快速記帳/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    fireEvent.click(screen.getByRole("button", { name: "查看圖片" }))
    expect(props.onRequestDelete).toHaveBeenCalledWith(expenses[0])
    expect(props.onViewImage).toHaveBeenCalledWith("https://example.com/r.jpg")
  })

  it("does not render its own clear button", () => {
    renderView()
    expect(screen.queryByText("清除")).not.toBeInTheDocument()
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

describe("ExpensesV2 container", () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.projectData.mockReset().mockReturnValue({
      project: { name: "東京", startDate: null, endDate: null, expenses: [] },
      members: [],
      loading: false,
      projectCurrency: "TWD",
      customRates: {},
      precision: 2,
    })
    mocks.projectExpenses.mockReset().mockReturnValue({
      expenses: [],
      loading: false,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn(),
      batchDeleteExpenses: vi.fn(),
    })
    mocks.currencyConversion.mockReset().mockReturnValue({ convert: (n: number) => n })
    mocks.expenseFilters.mockReset().mockReturnValue({
      filters: {
        searchQuery: "",
        selectedCategories: new Set<string>(),
        selectedPayers: new Set<string>(),
        selectedParticipants: new Set<string>(),
        selectedCurrencies: new Set<string>(),
        amountRange: [0, 0] as [number, number],
        createdDateRange: undefined,
        expenseDateRange: undefined,
      },
      filteredExpenses: [],
      hasActiveFilters: false,
      setSearchQuery: vi.fn(),
      toggleCategory: vi.fn(),
      setCategories: vi.fn(),
      togglePayer: vi.fn(),
      setPayers: vi.fn(),
      toggleParticipant: vi.fn(),
      setParticipants: vi.fn(),
      toggleCurrency: vi.fn(),
      setCurrencies: vi.fn(),
      setAmountRange: vi.fn(),
      setCreatedDateRange: vi.fn(),
      setExpenseDateRange: vi.fn(),
      clearFilters: vi.fn(),
      uniquePayers: [],
      uniqueParticipants: [],
      uniqueCurrencies: ["TWD"],
      maxAmount: 0,
    })
  })

  it("renders the list view through the container", () => {
    render(<ExpensesV2 projectId="p1" />)
    expect(screen.getByRole("heading", { level: 1, name: "全部支出" })).toBeInTheDocument()
    expect(screen.getByText("尚無支出記錄")).toBeInTheDocument()
  })

  it("renders the loading skeleton", () => {
    mocks.projectExpenses.mockReturnValue({
      expenses: [],
      loading: true,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn(),
      batchDeleteExpenses: vi.fn(),
    })
    render(<ExpensesV2 projectId="p1" />)
    expect(screen.getByTestId("v2-expenses-skeleton")).toBeInTheDocument()
  })

  it("opens the image lightbox", () => {
    const single = expense({ id: "e1", image: "https://example.com/x.jpg" })
    mocks.projectExpenses.mockReturnValue({
      expenses: [single],
      loading: false,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn().mockResolvedValue(true),
      batchDeleteExpenses: vi.fn(),
    })
    mocks.expenseFilters.mockReturnValue({ ...mocks.expenseFilters(), filteredExpenses: [single] })
    render(<ExpensesV2 projectId="p1" />)

    fireEvent.click(screen.getByRole("button", { name: "查看圖片" }))
    expect(screen.getByAltText("消費圖片")).toBeInTheDocument()
  })

  // Sets up the real ConfirmDeleteDialog and drives it through the rendered
  // controls (rather than a stub) so the container's delete wiring is exercised.
  async function openDeleteDialog(options: { canNotifyLine: boolean; uncheck?: boolean; cancel?: boolean }) {
    const single = expense({ id: "e1" })
    const hook = {
      expenses: [single],
      loading: false,
      deleting: false,
      canNotifyLine: options.canNotifyLine,
      refetch: vi.fn(),
      deleteExpense: vi.fn().mockResolvedValue(true),
      batchDeleteExpenses: vi.fn(),
    }
    mocks.projectExpenses.mockReturnValue(hook)
    mocks.expenseFilters.mockReturnValue({ ...mocks.expenseFilters(), filteredExpenses: [single] })
    render(<ExpensesV2 projectId="p1" />)

    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    const dialog = screen.getByRole("dialog")
    if (options.uncheck) {
      fireEvent.click(within(dialog).getByRole("checkbox", { name: /通知 LINE 群組/ }))
    }
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: options.cancel ? "取消" : "刪除" }))
    })
    return { hook, dialog }
  }

  it("deletes an expense with the LINE notification by default", async () => {
    const { hook } = await openDeleteDialog({ canNotifyLine: true })
    await waitFor(() => expect(hook.deleteExpense).toHaveBeenCalledWith("e1", { notifyLine: true }))
  })

  it("deletes an expense without the LINE notification once the checkbox is unchecked", async () => {
    const { hook } = await openDeleteDialog({ canNotifyLine: true, uncheck: true })
    await waitFor(() => expect(hook.deleteExpense).toHaveBeenCalledWith("e1", { notifyLine: false }))
  })

  it("does not delete when the confirmation is cancelled", async () => {
    const { hook } = await openDeleteDialog({ canNotifyLine: true, cancel: true })
    expect(hook.deleteExpense).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("shows the skeleton while the project itself is still loading", () => {
    mocks.projectData.mockReturnValue({
      project: null,
      members: [],
      loading: true,
      projectCurrency: "TWD",
      customRates: {},
      precision: 2,
    })
    render(<ExpensesV2 projectId="p1" />)
    expect(screen.getByTestId("v2-expenses-skeleton")).toBeInTheDocument()
  })

  it("renders the notify option only when the project supports it", () => {
    const single = expense({ id: "e1" })
    mocks.projectExpenses.mockReturnValue({
      expenses: [single],
      loading: false,
      deleting: false,
      canNotifyLine: true,
      refetch: vi.fn(),
      deleteExpense: vi.fn(),
      batchDeleteExpenses: vi.fn(),
    })
    mocks.expenseFilters.mockReturnValue({ ...mocks.expenseFilters(), filteredExpenses: [single] })
    render(<ExpensesV2 projectId="p1" />)
    expect(screen.queryByRole("checkbox", { name: /通知 LINE 群組/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    expect(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /通知 LINE 群組/ })).toBeInTheDocument()
  })

  it("hides the notify option when the project does not support it", () => {
    const single = expense({ id: "e1" })
    mocks.projectExpenses.mockReturnValue({
      expenses: [single],
      loading: false,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn(),
      batchDeleteExpenses: vi.fn(),
    })
    mocks.expenseFilters.mockReturnValue({ ...mocks.expenseFilters(), filteredExpenses: [single] })
    render(<ExpensesV2 projectId="p1" />)
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    expect(within(screen.getByRole("dialog")).queryByRole("checkbox", { name: /通知 LINE 群組/ })).not.toBeInTheDocument()
  })

  it("wires every filter control through the container", () => {
    const f = {
      filters: {
        searchQuery: "",
        selectedCategories: new Set<string>(["food"]),
        selectedPayers: new Set<string>(["chi"]),
        selectedParticipants: new Set<string>(["chi"]),
        selectedCurrencies: new Set<string>(["JPY"]),
        amountRange: [100, 200] as [number, number],
        createdDateRange: undefined,
        expenseDateRange: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) },
      },
      filteredExpenses: [],
      hasActiveFilters: true,
      setSearchQuery: vi.fn(),
      toggleCategory: vi.fn(),
      setCategories: vi.fn(),
      togglePayer: vi.fn(),
      setPayers: vi.fn(),
      toggleParticipant: vi.fn(),
      setParticipants: vi.fn(),
      toggleCurrency: vi.fn(),
      setCurrencies: vi.fn(),
      setAmountRange: vi.fn(),
      setCreatedDateRange: vi.fn(),
      setExpenseDateRange: vi.fn(),
      clearFilters: vi.fn(),
      uniquePayers: [{ id: "chi", displayName: "志明" }],
      uniqueParticipants: [{ id: "chi", displayName: "志明" }],
      uniqueCurrencies: ["TWD", "JPY"],
      maxAmount: 6400,
    }
    mocks.expenseFilters.mockReturnValue(f)
    render(<ExpensesV2 projectId="p1" />)

    fireEvent.change(screen.getByLabelText("搜尋支出描述"), { target: { value: "拉麵" } })
    expect(f.setSearchQuery).toHaveBeenCalledWith("拉麵")

    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(f.setCategories).toHaveBeenCalledWith(new Set())

    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(f.setPayers).toHaveBeenCalledWith(new Set())

    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(f.setParticipants).toHaveBeenCalledWith(new Set())

    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(f.setCurrencies).toHaveBeenCalledWith(new Set())

    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(f.setAmountRange).toHaveBeenCalledWith([0, 0])

    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    // Selecting a day exercises DatePanel's range selection, which the
    // container forwards through onExpenseRange.
    fireEvent.click(screen.getByRole("button", { name: "2026-11-05" }))
    expect(f.setExpenseDateRange).toHaveBeenCalledWith({ from: new Date(2026, 10, 5), to: undefined })
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(f.setExpenseDateRange).toHaveBeenCalledWith(undefined)

    fireEvent.click(screen.getByRole("button", { name: /移除篩選/ }))
    expect(f.clearFilters).toHaveBeenCalled()
  })

  it("restores filters saved for the project when remounting", () => {
    sessionStorage.setItem(
      "wander-wallet:expense-filters:p1",
      JSON.stringify({
        searchQuery: "拉麵",
        selectedCategories: ["food"],
        selectedPayers: [],
        selectedParticipants: [],
        selectedCurrencies: [],
        amountRange: [0, 0],
      })
    )
    const f = mocks.expenseFilters()
    render(<ExpensesV2 projectId="p1" />)
    expect(f.setSearchQuery).toHaveBeenCalledWith("拉麵")
    expect(f.setCategories).toHaveBeenCalledWith(new Set(["food"]))
  })
})
