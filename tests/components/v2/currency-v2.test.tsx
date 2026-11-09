import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { CurrencyV2View } from "@/components/v2/currency/currency-v2-view"
import { localDateString } from "@/components/v2/currency/format"

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
const mockRateSeries = vi.hoisted(() => vi.fn())
const mockAuthFetch = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks", () => ({
  useProjectData: () => mockProjectData(),
  useCurrencyConversion: () => mockCurrencyConversion(),
  useRateSeries: () => mockRateSeries(),
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
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
    ratesDate: "2026-11-06",
    usingFallback: false,
    loading: false,
    ratesError: null,
    rates: { TWD: 32, JPY: 160, USD: 32 },
    displayCurrencies: ["JPY", "USD"],
    selectedDate: localDateString(),
    historicalMeta: null,
    trendPoints: null,
    trendLoading: false,
    trendError: null,
    trendRange: 30,
    onTrendRange: vi.fn(),
    onRetryTrend: vi.fn(),
    onAmount: vi.fn(),
    onFrom: vi.fn(),
    onTo: vi.fn(),
    onSwap: vi.fn(),
    onDateChange: vi.fn(),
    onRetryHistorical: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
  render(<CurrencyV2View {...props} />)
  return props
}

describe("CurrencyV2View", () => {
  it("renders the converter, settlement currency and data date", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "匯率" })).toBeInTheDocument()
    expect(screen.getByText("結算幣別 TWD")).toBeInTheDocument()
    expect(screen.getByTestId("currency-result")).toHaveTextContent("TWD 210")
    expect(screen.getByText(/1 JPY = 0\.21 TWD/)).toBeInTheDocument()
    expect(screen.getByTestId("currency-data-date")).toHaveTextContent("資料日期 2026/11/6")
  })

  it("reports amount edits and swaps", () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "500" } })
    expect(props.onAmount).toHaveBeenCalledWith("500")
    fireEvent.click(screen.getByRole("button", { name: "交換幣別" }))
    expect(props.onSwap).toHaveBeenCalled()
  })

  it("keeps the trip-currency list fixed to 1 foreign → TWD", () => {
    renderView()
    expect(screen.getByTestId("direction-JPY")).toHaveTextContent("1 JPY → TWD")
    expect(screen.getByTestId("rate-JPY")).toHaveTextContent("0.2")
    expect(screen.queryByRole("button", { name: "切換匯率方向" })).not.toBeInTheDocument()
  })

  it("hides the rate list when the trip has no foreign currencies", () => {
    renderView({ displayCurrencies: [] })
    expect(screen.queryByText("旅程幣別")).not.toBeInTheDocument()
    expect(screen.getByLabelText("匯率日期")).toBeInTheDocument()
  })

  it("reports date changes instead of a mode switch", () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText("匯率日期"), {
      target: { value: "2026-09-15" },
    })
    expect(props.onDateChange).toHaveBeenCalledWith("2026-09-15")
  })

  it("shows the historical date and rates without comparing to latest", () => {
    renderView({
      selectedDate: "2026-09-16",
      ratesDate: "2026-09-15",
      rates: { TWD: 32, JPY: 168.4210526 },
      historicalMeta: {
        requestedDate: "2026-09-16",
        actualDate: "2026-09-15",
        usingFallback: false,
      },
    })
    expect(screen.getByLabelText("匯率日期")).toHaveValue("2026-09-16")
    expect(screen.getByTestId("rate-JPY")).toHaveTextContent("0.19")
    expect(screen.getByTestId("direction-JPY")).toHaveTextContent("1 JPY → TWD")
    expect(screen.getByTestId("currency-data-date")).toHaveTextContent("資料日期 2026/9/15")
    expect(screen.getByText(/查詢 2026-09-16/)).toBeInTheDocument()
    expect(screen.queryByText("較最新")).not.toBeInTheDocument()
    expect(screen.queryByText(/-5.0%/)).not.toBeInTheDocument()
  })

  it("shows a historical error with retry instead of stale numbers", () => {
    const props = renderView({
      selectedDate: "2026-09-16",
      rates: null,
      ratesDate: null,
      historicalMeta: null,
      ratesError: "查不到該日期的匯率，請換一天試試",
    })
    expect(screen.getByRole("alert")).toHaveTextContent("查不到該日期的匯率")
    fireEvent.click(screen.getByRole("button", { name: "重試" }))
    expect(props.onRetryHistorical).toHaveBeenCalled()
  })

  it("does not invent a 1:1 rate while live rates are loading", () => {
    renderView({
      rate: null,
      convertedAmount: null,
      rates: null,
      ratesDate: null,
      loading: true,
    })
    expect(screen.getByTestId("currency-result")).toHaveTextContent("—")
    expect(screen.queryByText(/1 JPY = 1 TWD/)).not.toBeInTheDocument()
    expect(screen.getByTestId("rate-JPY")).toHaveTextContent("—")
  })

  it("keeps sources behind a compact line and sheet", () => {
    renderView({ usingFallback: true })

    expect(screen.queryByTestId("currency-sources")).not.toBeInTheDocument()
    const line = screen.getByTestId("currency-source-line")
    expect(line).toHaveTextContent("匯率僅供參考")
    expect(line).toHaveTextContent("備援資料")

    fireEvent.click(screen.getByRole("button", { name: "資料來源" }))
    const dialog = screen.getByRole("dialog", { name: "資料來源" })
    expect(within(dialog).getByRole("link", { name: "Frankfurter" })).toHaveAttribute(
      "href",
      "https://frankfurter.dev"
    )
    expect(within(dialog).getByText(/108 個央行／官方來源/)).toBeInTheDocument()
    expect(within(dialog).getByText(/資料日期 2026\/11\/6/)).toBeInTheDocument()
    expect(within(dialog).getByText(/週末／假日順延/)).toBeInTheDocument()
    expect(within(dialog).getByText(/匯率為中間價/)).toBeInTheDocument()
    expect(within(dialog).getByText(/使用備援匯率/)).toBeInTheDocument()
  })

  it("shows a retryable live error instead of silently blank rates", () => {
    const props = renderView({
      ratesError: "匯率載入失敗",
      rates: null,
      rate: null,
      convertedAmount: null,
    })
    expect(screen.getByRole("alert")).toHaveTextContent("匯率載入失敗")
    fireEvent.click(screen.getByRole("button", { name: "重試" }))
    expect(props.onRefresh).toHaveBeenCalled()
  })

  it("keeps the refresh control in the source sheet", () => {
    const props = renderView()
    expect(screen.queryByRole("button", { name: "重新整理" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "資料來源" }))
    fireEvent.click(screen.getByRole("button", { name: "重新整理匯率" }))
    expect(props.onRefresh).toHaveBeenCalled()
  })
})

describe("CurrencyV2 container", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockProjectData.mockReset().mockReturnValue({
      project: {
        name: "京都",
        currency: "TWD",
        exchangeRatePrecision: 0,
        expenses: [],
      },
      members: [],
      loading: false,
      projectCurrency: "TWD",
      precision: 0,
    })
    mockCurrencyConversion.mockReset().mockReturnValue({
      getRate: () => 0.21,
      exchangeRates: { USD: 1, TWD: 32.8, JPY: 156.1904762 },
      ratesDate: "2026-11-06",
      ratesSource: "Frankfurter",
      usingFallback: false,
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockRateSeries.mockReset().mockReturnValue({
      points: null,
      loading: false,
      error: null,
      startDate: "2026-10-10",
      endDate: "2026-11-06",
      refetch: vi.fn(),
    })
  })

  it("renders the converter with an empty amount and today's rate date", () => {
    render(<CurrencyV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "匯率" })).toBeInTheDocument()
    expect(screen.getByLabelText("金額")).toHaveValue("")
    expect(screen.getByTestId("currency-result")).toHaveTextContent("—")
    expect(screen.getByLabelText("匯率日期")).toHaveValue(localDateString())
  })

  it("defaults to the trip's most-used foreign currency", () => {
    mockProjectData.mockReturnValue({
      project: {
        name: "Trip",
        currency: "TWD",
        exchangeRatePrecision: 0,
        expenses: [
          { currency: "JPY" },
          { currency: "KRW" },
          { currency: "JPY" },
        ],
      },
      members: [],
      loading: false,
      projectCurrency: "TWD",
      precision: 0,
    })

    render(<CurrencyV2 projectId="p1" />)

    expect(screen.getByText(/1 JPY = 0\.21 TWD/)).toBeInTheDocument()
  })

  it("falls back to USD when the trip has no foreign expenses", () => {
    render(<CurrencyV2 projectId="p1" />)
    expect(screen.getByText(/1 USD = 32\.8 TWD/)).toBeInTheDocument()
  })

  it("queries history when a past date is selected", async () => {
    mockProjectData.mockReturnValue({
      project: {
        name: "Trip",
        currency: "TWD",
        exchangeRatePrecision: 0,
        expenses: [{ currency: "JPY" }],
      },
      members: [],
      loading: false,
      projectCurrency: "TWD",
      precision: 0,
    })
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        rates: { USD: 1, TWD: 32.8, JPY: 164 },
        date: "2026-09-15",
        source: "Frankfurter",
        usingFallback: false,
      }),
    })

    render(<CurrencyV2 projectId="p1" />)
    fireEvent.change(screen.getByLabelText("匯率日期"), {
      target: { value: "2026-09-15" },
    })

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/exchange-rates?date=2026-09-15")
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId("rate-JPY")).toHaveTextContent("0.2")
    })
  })

  it("shows a retryable error when history fails", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "查不到該日期的匯率" }),
    })

    render(<CurrencyV2 projectId="p1" />)
    fireEvent.change(screen.getByLabelText("匯率日期"), {
      target: { value: "2026-09-15" },
    })

    expect(await screen.findByRole("alert")).toHaveTextContent("查不到該日期的匯率")
    expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument()
  })
})
