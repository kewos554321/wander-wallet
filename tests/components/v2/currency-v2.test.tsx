import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CurrencyV2View } from "@/components/v2/currency/currency-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/v2/ui/currency-field", () => ({
  V2CurrencyField: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange(value === "JPY" ? "USD" : "JPY")}>
      {value}
    </button>
  ),
  currencyLabel: (c: string) => c,
  currencySymbol: (c: string) => c,
}))

const mockProjectData = vi.hoisted(() => vi.fn())
const mockCurrencyConversion = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks", () => ({
  useProjectData: () => mockProjectData(),
  useCurrencyConversion: () => mockCurrencyConversion(),
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => vi.fn(),
  useLiff: () => ({ user: { id: "u1" } }),
}))

import { CurrencyV2 } from "@/components/v2/currency/currency-v2"

function renderView(overrides: Partial<Parameters<typeof CurrencyV2View>[0]> = {}) {
  const props: Parameters<typeof CurrencyV2View>[0] = {
    projectId: "p1",
    projectCurrency: "TWD",
    fromCurrency: "JPY",
    toCurrency: "TWD",
    amount: "1000",
    convertedAmount: 210,
    rate: 0.21,
    ratesTimestamp: Date.now() - 2 * 60 * 60 * 1000,
    usingFallback: false,
    customRates: [{ currency: "JPY", customRate: 0.21, liveRate: 0.214, diff: -1.87 }],
    liveRates: [{ currency: "JPY", rate: 0.214 }],
    historicalDate: "2026-09-15",
    historicalRates: [{ currency: "JPY", rate: 0.2, diff: 7 }],
    loading: false,
    loadingHistorical: false,
    showRates: true,
    showHistorical: false,
    onAmount: vi.fn(),
    onFrom: vi.fn(),
    onTo: vi.fn(),
    onSwap: vi.fn(),
    onToggleRates: vi.fn(),
    onToggleHistorical: vi.fn(),
    onHistoricalDate: vi.fn(),
    onQueryHistorical: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
  render(<CurrencyV2View {...props} />)
  return props
}

describe("CurrencyV2View", () => {
  it("renders the hero, result and timestamp", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "匯率" })).toBeInTheDocument()
    expect(screen.getByText("TWD 210")).toBeInTheDocument()
    expect(screen.getByText(/更新於/)).toBeInTheDocument()
  })

  it("reports amount edits and swaps", () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "500" } })
    expect(props.onAmount).toHaveBeenCalledWith("500")
    fireEvent.click(screen.getByRole("button", { name: "交換幣別" }))
    expect(props.onSwap).toHaveBeenCalled()
  })

  it("shows the custom-rate comparison", () => {
    renderView()
    expect(screen.getByText("JPY → TWD")).toBeInTheDocument()
    expect(screen.getByText(/1\.9%/)).toBeInTheDocument()
  })

  it("toggles the live-rate and historical sections", () => {
    const props = renderView({ showHistorical: true })
    fireEvent.click(screen.getByRole("button", { name: /即時匯率/ }))
    expect(props.onToggleRates).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "查詢" }))
    expect(props.onQueryHistorical).toHaveBeenCalled()
  })

  it("shows a dash when the result is unknown (Review Focus 2)", () => {
    renderView({ convertedAmount: null })
    expect(screen.getByTestId("currency-result")).toHaveTextContent("-")
  })
})

describe("CurrencyV2 container", () => {
  beforeEach(() => {
    mockProjectData.mockReset().mockReturnValue({
      project: { name: "京都", currency: "TWD", customRates: null, exchangeRatePrecision: 2 },
      members: [],
      loading: false,
      projectCurrency: "TWD",
      customRates: null,
      precision: 2,
    })
    mockCurrencyConversion.mockReset().mockReturnValue({
      getRate: () => 0.21,
      exchangeRates: { TWD: 1, JPY: 0.2 },
      ratesTimestamp: null,
      usingFallback: false,
      loading: false,
      refetch: vi.fn(),
    })
  })

  it("renders the converter", () => {
    render(<CurrencyV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "匯率" })).toBeInTheDocument()
  })

  it("defaults the target currency to the project currency, not TWD", () => {
    let state = {
      project: { name: "Trip", currency: "TWD", customRates: null, exchangeRatePrecision: 2 },
      members: [],
      loading: true,
      projectCurrency: "TWD",
      customRates: null,
      precision: 2,
    }
    mockProjectData.mockImplementation(() => state)
    mockCurrencyConversion.mockReturnValue({
      getRate: () => 1,
      exchangeRates: {},
      ratesTimestamp: null,
      usingFallback: false,
      loading: false,
      refetch: vi.fn(),
    })
    const { rerender } = render(<CurrencyV2 projectId="p1" />)
    state = {
      project: { name: "Japan", currency: "JPY", customRates: null, exchangeRatePrecision: 2 },
      members: [],
      loading: false,
      projectCurrency: "JPY",
      customRates: null,
      precision: 2,
    }
    rerender(<CurrencyV2 projectId="p1" />)
    expect(screen.getByText(/1 USD = 1 JPY/)).toBeInTheDocument()
  })
})
