import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExportV2View } from "@/components/v2/export/export-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockProjectData = vi.hoisted(() => vi.fn())
const mockProjectExpenses = vi.hoisted(() => vi.fn())
const mockCurrencyConversion = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks", () => ({
  useProjectData: () => mockProjectData(),
  useCurrencyConversion: () => mockCurrencyConversion(),
}))
vi.mock("@/lib/hooks/useProjectExpenses", () => ({ useProjectExpenses: () => mockProjectExpenses() }))
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => vi.fn(),
  useLiff: () => ({ user: { id: "u1" } }),
}))

import { ExportV2 } from "@/components/v2/export/export-v2"

function renderView(overrides: Partial<Parameters<typeof ExportV2View>[0]> = {}) {
  const props: Parameters<typeof ExportV2View>[0] = {
    projectId: "p1",
    projectName: "京都賞楓行",
    currency: "TWD",
    format: "csv",
    content: { expenseDetails: true, settlementInfo: true, statisticsSummary: false },
    filters: {},
    memberCount: 4,
    expenseCount: 18,
    filteredCount: 18,
    exporting: false,
    showLargeDataWarning: false,
    onFormatChange: vi.fn(),
    onContentChange: vi.fn(),
    onFiltersChange: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  }
  render(<ExportV2View {...props} />)
  return props
}

describe("ExportV2View", () => {
  it("renders format tiles and reports format changes", () => {
    const props = renderView()
    expect(screen.getByTestId("export-format-csv").className).toContain("border-v2-lake")
    fireEvent.click(screen.getByTestId("export-format-pdf"))
    expect(props.onFormatChange).toHaveBeenCalledWith("pdf")
  })

  it("toggles content options", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("checkbox", { name: /支出明細/ }))
    expect(props.onContentChange).toHaveBeenCalledWith(
      expect.objectContaining({ expenseDetails: false })
    )
  })

  it("shows the project summary", () => {
    renderView()
    const summary = screen.getByTestId("export-summary")
    expect(summary).toHaveTextContent("京都賞楓行")
    expect(summary).toHaveTextContent("18 筆")
    expect(summary).toHaveTextContent("4 人")
  })

  it("labels and enables the export button", () => {
    const props = renderView({ format: "pdf" })
    const button = screen.getByTestId("export-submit")
    expect(button).toHaveTextContent("匯出 PDF")
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(props.onExport).toHaveBeenCalled()
  })

  it("disables export with no filtered expenses", () => {
    renderView({ filteredCount: 0 })
    expect(screen.getByTestId("export-submit")).toBeDisabled()
  })

  it("shows the large-data warning", () => {
    renderView({ showLargeDataWarning: true })
    expect(screen.getByTestId("export-warning")).toBeInTheDocument()
  })

  it("adds a category filter", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: "餐飲" }))
    expect(props.onFiltersChange).toHaveBeenCalledWith({ categories: ["food"] })
  })
})

describe("ExportV2 container", () => {
  beforeEach(() => {
    mockProjectData.mockReset().mockReturnValue({
      project: { name: "京都", currency: "TWD", customRates: null, exchangeRatePrecision: 2 },
      members: [{ id: "m1", displayName: "志明" }],
      loading: false,
      projectCurrency: "TWD",
      customRates: null,
      precision: 2,
    })
    mockProjectExpenses.mockReset().mockReturnValue({
      expenses: [
        { id: "e1", amount: 1000, currency: "TWD", description: null, category: "food", image: null, location: null, latitude: null, longitude: null, expenseDate: "2026-10-18T00:00:00.000Z", createdAt: "2026-10-18T00:00:00.000Z", payers: [{ id: "ep1", memberId: "m1", amount: 1000, member: { id: "m1", displayName: "志明", userId: null, user: null } }], participants: [{ id: "x", shareAmount: 1000, member: { id: "m1", displayName: "志明", userId: null, user: null } }] },
      ],
      loading: false,
    })
    mockCurrencyConversion.mockReset().mockReturnValue({ exchangeRates: null })
  })

  it("renders the export page with the project summary", () => {
    render(<ExportV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "匯出" })).toBeInTheDocument()
    expect(screen.getByTestId("export-summary")).toHaveTextContent("京都")
  })

  it("renders with a multi-payer expense", () => {
    mockProjectExpenses.mockReturnValue({
      expenses: [
        {
          id: "e2",
          amount: 1000,
          currency: "TWD",
          description: "共同晚餐",
          category: "food",
          image: null,
          location: null,
          latitude: null,
          longitude: null,
          expenseDate: "2026-10-18T00:00:00.000Z",
          createdAt: "2026-10-18T00:00:00.000Z",
          payers: [
            { id: "ep1", memberId: "m1", amount: 600, member: { id: "m1", displayName: "志明", userId: null, user: null } },
            { id: "ep2", memberId: "m2", amount: 400, member: { id: "m2", displayName: "小美", userId: null, user: null } },
          ],
          participants: [
            { id: "x1", shareAmount: 500, member: { id: "m1", displayName: "志明", userId: null, user: null } },
            { id: "x2", shareAmount: 500, member: { id: "m2", displayName: "小美", userId: null, user: null } },
          ],
        },
      ],
      loading: false,
    })
    render(<ExportV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "匯出" })).toBeInTheDocument()
    expect(screen.getByTestId("export-summary")).toHaveTextContent("京都")
  })
})
