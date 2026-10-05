import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MapV2View, type MapExpense } from "@/components/v2/map/map-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
const mapStubProps = vi.hoisted(() => ({
  current: null as {
    expenses?: unknown[]
    mapStyle?: string
    onExpenseClick?: (id: string) => void
  } | null,
}))
vi.mock("next/dynamic", () => ({
  default: () => (props: { expenses?: unknown[]; mapStyle?: string; onExpenseClick?: (id: string) => void }) => {
    mapStubProps.current = props
    return (
      <div data-testid="expense-map-stub" data-style={props.mapStyle}>
        <button type="button" onClick={() => props.onExpenseClick?.("e1")}>
          map-open
        </button>
      </div>
    )
  },
}))

const push = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }))

const mockProjectData = vi.hoisted(() => vi.fn())
const mockProjectExpenses = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks", () => ({ useProjectData: () => mockProjectData() }))
vi.mock("@/lib/hooks/useProjectExpenses", () => ({ useProjectExpenses: () => mockProjectExpenses() }))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn(), useLiff: () => ({ user: { id: "u1" } }) }))

import { MapV2 } from "@/components/v2/map/map-v2"

const expenses: MapExpense[] = [
  { id: "e1", amount: 1280, currency: "TWD", description: "一蘭拉麵晚餐", category: "food", location: "新宿", latitude: 35.69, longitude: 139.7, expenseDate: "2026-10-18", payer: { displayName: "志明" } },
  { id: "e2", amount: 14000, currency: "TWD", description: "溫泉旅館", category: "accommodation", location: "嵐山", latitude: 35.0, longitude: 135.7, expenseDate: "2026-10-19", payer: { displayName: "小美" } },
  { id: "e3", amount: 100, currency: "TWD", description: null, category: "transport", location: null, latitude: null, longitude: null, expenseDate: "2026-10-20", payer: { displayName: "志明" } },
]

function renderView(overrides: Partial<Parameters<typeof MapV2View>[0]> = {}) {
  const props: Parameters<typeof MapV2View>[0] = { projectId: "p1", projectCurrency: "TWD", expenses, loading: false, ...overrides }
  render(<MapV2View {...props} />)
  return props
}

describe("MapV2View", () => {
  it("counts only located expenses and renders the map", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "消費地圖" })).toBeInTheDocument()
    expect(screen.getByText("2 筆消費有位置資訊")).toBeInTheDocument()
    expect(screen.getByTestId("expense-map-stub")).toBeInTheDocument()
    expect(screen.getByTestId("category-chip-food")).toHaveTextContent("餐飲 1")
  })

  it("passes numeric coordinates to the map when the API serializes them as strings", () => {
    // Prisma Decimal fields arrive from the API as JSON strings.
    const stringyExpenses = expenses.map((e) => ({
      ...e,
      latitude: (e.latitude === null ? null : String(e.latitude)) as unknown as number,
      longitude: (e.longitude === null ? null : String(e.longitude)) as unknown as number,
    }))

    renderView({ expenses: stringyExpenses })

    const passed = (mapStubProps.current?.expenses ?? []) as { latitude?: unknown; longitude?: unknown }[]
    expect(passed).toHaveLength(2)
    for (const expense of passed) {
      expect(typeof expense.latitude).toBe("number")
      expect(typeof expense.longitude).toBe("number")
      expect(Number.isNaN(expense.latitude)).toBe(false)
      expect(Number.isNaN(expense.longitude)).toBe(false)
    }
  })

  it("opens an expense from the map", () => {
    renderView()
    fireEvent.click(screen.getByText("map-open"))
    expect(push).toHaveBeenCalledWith("/projects/p1/expenses/e1/edit")
  })

  it("toggles the list", () => {
    renderView()
    fireEvent.click(screen.getByRole("button", { name: /顯示列表/ }))
    expect(screen.getByText("一蘭拉麵晚餐")).toBeInTheDocument()
  })

  it("changes the map style", async () => {
    renderView()
    fireEvent.click(screen.getByTestId("map-style-toggle"))
    fireEvent.click(screen.getByTestId("map-style-option-watercolor"))
    await waitFor(() => expect(screen.getByTestId("expense-map-stub")).toHaveAttribute("data-style", "watercolor"))
  })

  it("keeps the map expenses array stable across unrelated re-renders", () => {
    renderView()
    const first = mapStubProps.current?.expenses

    fireEvent.click(screen.getByTestId("map-style-toggle"))

    expect(mapStubProps.current?.expenses).toBe(first)
  })

  it("shows the empty state with no located expenses (Review Focus 5)", () => {
    renderView({ expenses: [expenses[2]] })
    expect(screen.getByText("尚無位置資訊")).toBeInTheDocument()
    expect(screen.queryByTestId("expense-map-stub")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "新增消費" })).toHaveAttribute("href", "/projects/p1/expenses/new")
  })
})

describe("MapV2 container", () => {
  it("renders the map page", () => {
    mockProjectData.mockReset().mockReturnValue({ project: { name: "京都", currency: "TWD" }, loading: false })
    mockProjectExpenses.mockReset().mockReturnValue({ expenses, loading: false })
    render(<MapV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "消費地圖" })).toBeInTheDocument()
  })
})
