import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ActivityLogsV2View, type ActivityLog, type ActivityFiltersState } from "@/components/v2/activity-logs/activity-logs-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockAuthFetch = vi.hoisted(() => vi.fn())
const mockProjectData = vi.hoisted(() => vi.fn())
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1" } }),
}))
vi.mock("@/lib/hooks", () => ({ useProjectData: () => mockProjectData() }))

import { ActivityLogsV2 } from "@/components/v2/activity-logs/activity-logs-v2"

const emptyFilters: ActivityFiltersState = {
  search: "",
  actions: new Set(),
  actors: new Set(),
  payers: new Set(),
  categories: new Set(),
  currencies: new Set(),
  amountRange: [0, 0],
  createdRange: undefined,
  expenseRange: undefined,
}

const baseLog: ActivityLog = {
  id: "l1",
  entityType: "expense",
  entityId: "e1",
  action: "create",
  changes: null,
  metadata: { description: "一蘭拉麵晚餐", amount: 1280, category: "food", payerName: "志明", expenseDate: "2026-10-18", currency: "TWD" },
  createdAt: new Date("2026-10-04T11:55:00.000Z").toISOString(),
  actor: { id: "m1", displayName: "志明", user: null },
}

const updateLog: ActivityLog = {
  ...baseLog,
  id: "l2",
  action: "update",
  changes: { amount: { from: 12000, to: 14000 } },
}

function renderView(overrides: Partial<Parameters<typeof ActivityLogsV2View>[0]> = {}) {
  const props: Parameters<typeof ActivityLogsV2View>[0] = {
    projectId: "p1",
    projectCurrency: "TWD",
    logs: [baseLog, updateLog],
    filteredLogs: [baseLog, updateLog],
    total: 2,
    loading: false,
    loadingMore: false,
    hasMore: true,
    filters: emptyFilters,
    actorOptions: [{ key: "m1", label: "志明" }],
    payerOptions: [{ key: "志明", label: "志明" }],
    categoryOptions: [{ key: "food", label: "餐飲" }],
    currencyOptions: ["TWD"],
    amountMax: 14000,
    hasActiveFilters: false,
    onSearch: vi.fn(),
    onToggle: vi.fn(),
    onAmountRange: vi.fn(),
    onCreatedRange: vi.fn(),
    onExpenseRange: vi.fn(),
    onClear: vi.fn(),
    onLoadMore: vi.fn(),
    ...overrides,
  }
  render(<ActivityLogsV2View {...props} />)
  return props
}

describe("ActivityLogsV2View", () => {
  it("renders the heading and filter chips", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "歷史紀錄" })).toBeInTheDocument()
    expect(screen.getByText("操作")).toBeInTheDocument()
    expect(screen.getByText("操作者")).toBeInTheDocument()
    expect(screen.getByText("類別")).toBeInTheDocument()
    expect(screen.getByText("付款人")).toBeInTheDocument()
    expect(screen.getByText("顯示 2 / 2 筆")).toBeInTheDocument()
  })

  it("reports search input", () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText("搜尋紀錄"), { target: { value: "拉麵" } })
    expect(props.onSearch).toHaveBeenCalledWith("拉麵")
  })

  it("clears filters when active", () => {
    const props = renderView({ hasActiveFilters: true })
    fireEvent.click(screen.getByText("清除篩選"))
    expect(props.onClear).toHaveBeenCalled()
  })

  it("renders action-tinted cards and change chips", () => {
    renderView()
    expect(screen.getByTestId("activity-card-header-l1").className).toContain("bg-v2-lake-soft")
    expect(screen.getByTestId("activity-card-header-l2").className).toContain("bg-v2-gold-soft")
    expect(screen.getByTestId("activity-change-l2-0")).toHaveTextContent("12,000")
    expect(screen.getByTestId("activity-change-l2-0")).toHaveTextContent("14,000")
  })

  it("falls back to 系統 with no actor", () => {
    renderView({ logs: [{ ...baseLog, actor: null }], filteredLogs: [{ ...baseLog, actor: null }] })
    expect(screen.getByText("系統")).toBeInTheDocument()
  })

  it("loads more", () => {
    const props = renderView()
    fireEvent.click(screen.getByText("載入更多"))
    expect(props.onLoadMore).toHaveBeenCalled()
  })

  it("shows the empty states", () => {
    renderView({ logs: [], filteredLogs: [], total: 0, hasMore: false })
    expect(screen.getByText("還沒有操作紀錄")).toBeInTheDocument()
    renderView({ logs: [baseLog], filteredLogs: [], hasActiveFilters: true })
    expect(screen.getByText("沒有符合條件的紀錄")).toBeInTheDocument()
  })

  it("opens every filter panel and toggles a category", () => {
    const props = renderView({ currencyOptions: ["TWD", "JPY"] })
    for (const label of ["操作", "操作者", "類別", "付款人", "幣別", "金額", "建立日期", "付款日期"]) {
      fireEvent.click(screen.getAllByText(label)[0])
      expect(screen.getAllByTestId("filter-panel").length).toBeGreaterThan(0)
      fireEvent.click(screen.getAllByText(label)[0])
    }
    fireEvent.click(screen.getAllByText("類別")[0])
    fireEvent.click(screen.getByRole("checkbox", { name: "餐飲" }))
    expect(props.onToggle).toHaveBeenCalledWith("categories", "food")
  })

  it("hides the currency filter with a single currency", () => {
    renderView({ currencyOptions: ["TWD"] })
    expect(screen.queryByText("幣別")).not.toBeInTheDocument()
  })

  it("renders a log with no metadata and no actor", () => {
    renderView({ logs: [{ ...baseLog, id: "l3", metadata: null, actor: null }], filteredLogs: [{ ...baseLog, id: "l3", metadata: null, actor: null }] })
    expect(screen.getByTestId("activity-card-l3")).toBeInTheDocument()
    expect(screen.getByText("系統")).toBeInTheDocument()
  })
})

describe("ActivityLogsV2 container", () => {
  it("loads the logs", async () => {
    mockProjectData.mockReset().mockReturnValue({ project: { currency: "TWD" }, loading: false })
    mockAuthFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ logs: [baseLog], total: 1, hasMore: false }),
    })
    render(<ActivityLogsV2 projectId="p1" />)
    await waitFor(() => expect(screen.getByTestId("activity-card-l1")).toBeInTheDocument())
  })
})
