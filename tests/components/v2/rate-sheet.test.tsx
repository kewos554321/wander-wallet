import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { format } from "date-fns"

const authFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch }))

// Drive the shared Calendar's onSelect with fixed dates (its real grid is
// locale-dependent). The Popover renders the Calendar only while open.
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect?: (d?: Date) => void }) => (
    <div data-testid="calendar-stub">
      <button type="button" onClick={() => onSelect?.(new Date(2026, 8, 20))}>
        pick-2026-09-20
      </button>
      <button type="button" onClick={() => onSelect?.(new Date(2026, 8, 21))}>
        pick-2026-09-21
      </button>
    </div>
  ),
}))

import { RateSheet } from "@/components/v2/expense-form/rate-sheet"

type Props = Parameters<typeof RateSheet>[0]

const RECENT = [
  { rate: 0.215, kind: "market" as const, date: "2026-10-08", description: "晚餐" },
  { rate: 0.22, kind: "custom" as const, date: null, description: "藥妝" },
]

function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
    open: true,
    onClose: vi.fn(),
    fromCurrency: "TWD",
    toCurrency: "USD",
    rate: 0.032,
    customRate: false,
    liveRate: 0.031715,
    liveTimestamp: Date.now() - 3 * 60_000,
    recentRates: [],
    onUseRate: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  }
  const utils = render(<RateSheet {...props} />)
  return { ...utils, props }
}

beforeEach(() => {
  authFetch.mockReset()
})

/** Open the date popover and pick a fixed day. */
function queryRateDate(day: "2026-09-20" | "2026-09-21") {
  fireEvent.click(screen.getByLabelText("匯率日期"))
  fireEvent.click(screen.getByRole("button", { name: `pick-${day}` }))
}

describe("RateSheet", () => {
  it("renders nothing when closed", () => {
    setup({ open: false })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not repeat the pair or the ≈ amount at the top (the form already shows them)", () => {
    setup()
    expect(screen.queryByTestId("rate-sheet-pair")).not.toBeInTheDocument()
    expect(screen.queryByTestId("rate-sheet-approx")).not.toBeInTheDocument()
  })

  it("shows only the 市場 and 自訂 tabs", () => {
    setup()
    expect(screen.getByRole("tab", { name: "市場" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "自訂" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "歷史" })).not.toBeInTheDocument()
    expect(screen.queryByText("專案固定匯率")).not.toBeInTheDocument()
  })

  it("market tab defaults to today and applies the live rate", () => {
    const { props } = setup({ liveRate: 0.031715 })
    expect(screen.getByRole("tab", { name: "市場" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText("匯率日期")).toHaveTextContent(format(new Date(), "yyyy/MM/dd"))
    expect(screen.getByTestId("market-rate")).toHaveTextContent("0.031715")
    fireEvent.click(screen.getByRole("button", { name: "使用市場匯率" }))
    expect(props.onUseRate).toHaveBeenCalledWith(0.031715, "market")
  })

  it("changing the date fetches that day's rate and applies it with the date", async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 31 } }) })
    const { props } = setup()
    queryRateDate("2026-09-20")
    await waitFor(() => expect(authFetch).toHaveBeenCalledWith("/api/exchange-rates?date=2026-09-20"))
    const use = await screen.findByRole("button", { name: "使用市場匯率" })
    fireEvent.click(use)
    expect(props.onUseRate).toHaveBeenCalledWith(1 / 31, "market", "2026-09-20")
  })

  it("shows an error and keeps the rate when the lookup fails", async () => {
    authFetch.mockResolvedValue({ ok: false })
    const { props } = setup()
    queryRateDate("2026-09-20")
    expect(await screen.findByRole("alert")).toHaveTextContent("查不到")
    expect(props.onUseRate).not.toHaveBeenCalled()
  })

  it("retries the failed lookup", async () => {
    authFetch.mockResolvedValueOnce({ ok: false })
    setup()
    queryRateDate("2026-09-20")
    expect(await screen.findByRole("alert")).toHaveTextContent("查不到")
    authFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 30 } }) })
    fireEvent.click(screen.getByRole("button", { name: "重新查詢" }))
    await waitFor(() => expect(screen.getByTestId("market-rate")).toHaveTextContent("0.033333"))
  })

  it("ignores a stale history response that resolves after a newer one", async () => {
    let resolveSlow: (v: unknown) => void = () => {}
    authFetch.mockImplementation((url: string) =>
      url.includes("2026-09-20")
        ? new Promise((res) => {
            resolveSlow = res
          })
        : Promise.resolve({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 30 } }) }),
    )
    setup()
    queryRateDate("2026-09-20")
    queryRateDate("2026-09-21")
    await waitFor(() => expect(screen.getByTestId("market-rate")).toHaveTextContent("0.033333"))
    resolveSlow({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 40 } }) })
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.getByTestId("market-rate")).not.toHaveTextContent("0.025")
  })

  it("tapping a recent rate applies it right away", () => {
    const { props } = setup({ recentRates: RECENT, appliedKind: "custom" })
    expect(screen.getByLabelText("自訂匯率")).toHaveValue("0.215")
    fireEvent.click(screen.getByTestId("recent-rate-1"))
    expect(screen.getByLabelText("自訂匯率")).toHaveValue("0.22")
    expect(props.onUseRate).toHaveBeenCalledWith(0.22, "custom")
  })

  it("marks only the row that matches the applied rate as 已使用", () => {
    setup({ recentRates: RECENT, appliedKind: "custom", customRate: true, rate: 0.22 })
    expect(screen.getByTestId("recent-rate-1")).toHaveTextContent("已使用")
    expect(screen.getByTestId("recent-rate-0")).not.toHaveTextContent("已使用")
  })

  it("does not mark any recent rate when a different rate is applied", () => {
    setup({ recentRates: RECENT, appliedKind: "custom", customRate: true, rate: 0.033 })
    expect(screen.getByTestId("recent-rate-0")).not.toHaveTextContent("已使用")
    expect(screen.getByTestId("recent-rate-1")).not.toHaveTextContent("已使用")
  })

  it("applies a typed custom value via 使用", () => {
    const { props } = setup({ recentRates: [], appliedKind: "custom" })
    fireEvent.change(screen.getByLabelText("自訂匯率"), { target: { value: "0.05" } })
    fireEvent.click(screen.getByRole("button", { name: "使用自訂匯率" }))
    expect(props.onUseRate).toHaveBeenCalledWith(0.05, "custom")
  })

  it("bounds the reuse list so it scrolls instead of growing the panel", () => {
    setup({ recentRates: RECENT, appliedKind: "custom" })
    const list = screen.getByTestId("recent-rates-list")
    expect(list.className).toContain("overflow-y-auto")
    expect(list.className).toContain("max-h-")
  })

  it("lists recent rates with their source and expense", () => {
    setup({ recentRates: RECENT, appliedKind: "custom" })
    expect(screen.getByTestId("recent-rate-0")).toHaveTextContent("市場")
    expect(screen.getByTestId("recent-rate-0")).toHaveTextContent("晚餐")
    expect(screen.getByTestId("recent-rate-1")).toHaveTextContent("自訂")
  })

  it("labels the secondary section and keeps the custom tab trimmed", () => {
    setup({ recentRates: RECENT, appliedKind: "custom" })
    expect(screen.getByText("最近用過")).toBeInTheDocument()
    expect(screen.queryByText("自己輸入匯率")).not.toBeInTheDocument()
    expect(screen.queryByText(/這一筆會算成/)).not.toBeInTheDocument()
    expect(screen.queryByText(/這個專案/)).not.toBeInTheDocument()
    expect(screen.queryByText(/不會改動專案匯率/)).not.toBeInTheDocument()
  })

  it("keeps the rate card above the date field in 市場", () => {
    setup({ appliedKind: "market" })
    const button = screen.getByRole("button", { name: "使用市場匯率" })
    const dateInput = screen.getByLabelText("匯率日期")
    expect(button.compareDocumentPosition(dateInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("uses one button style in both panes, marking only the applied one 已使用", () => {
    setup({ appliedKind: "market", liveRate: 0.032, rate: 0.032 })
    const marketButton = screen.getByRole("button", { name: "使用市場匯率" })
    expect(marketButton).toHaveTextContent("已使用")
    fireEvent.click(screen.getByRole("tab", { name: "自訂" }))
    const customButton = screen.getByRole("button", { name: "使用自訂匯率" })
    expect(customButton).not.toHaveTextContent("已使用")
    expect(customButton.className).toBe(marketButton.className)
  })

  it("reverts 市場 to 使用 after querying another day's rate", async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 30 } }) })
    setup({ appliedKind: "market", liveRate: 0.031715, rate: 0.031715 })
    expect(screen.getByRole("button", { name: "使用市場匯率" })).toHaveTextContent("已使用")
    queryRateDate("2026-09-20")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "使用市場匯率" })).not.toHaveTextContent("已使用"),
    )
  })

  it("marks 自訂 已使用 when a custom rate is applied", () => {
    setup({ appliedKind: "custom", customRate: true })
    expect(screen.getByRole("button", { name: "使用自訂匯率" })).toHaveTextContent("已使用")
  })

  it("keeps 自訂 on 使用 when only the market rate is applied, even if the numbers match", () => {
    setup({
      appliedKind: "market",
      customRate: false,
      rate: 0.032,
      recentRates: [{ rate: 0.032, kind: "custom", date: null, description: "x" }],
    })
    fireEvent.click(screen.getByRole("tab", { name: "自訂" }))
    expect(screen.getByRole("button", { name: "使用自訂匯率" })).not.toHaveTextContent("已使用")
    expect(screen.getByTestId("recent-rate-0")).not.toHaveTextContent("已使用")
  })

  it("formats a raw ISO rate date as a short date instead of the timestamp", () => {
    setup({
      recentRates: [{ rate: 0.215, kind: "market", date: "2026-10-08T09:19:53.528Z", description: "晚餐" }],
      appliedKind: "custom",
    })
    const row = screen.getByTestId("recent-rate-0")
    expect(row).toHaveTextContent("10/8")
    expect(row).not.toHaveTextContent("09:19")
  })

  it("disables the custom use button for an invalid value", () => {
    setup({ recentRates: [], appliedKind: "custom" })
    const input = screen.getByLabelText("自訂匯率")
    for (const bad of ["", "0", ".", "abc"]) {
      fireEvent.change(input, { target: { value: bad } })
      expect(screen.getByRole("button", { name: "使用自訂匯率" })).toBeDisabled()
    }
  })

  it("only accepts digits and a single decimal point in the custom rate", () => {
    setup({ appliedKind: "custom" })
    const input = screen.getByLabelText("自訂匯率")
    fireEvent.change(input, { target: { value: "0.2a5b" } })
    expect(input).toHaveValue("0.25")
    fireEvent.change(input, { target: { value: "1.2.3" } })
    expect(input).toHaveValue("1.23")
    fireEvent.change(input, { target: { value: "abc" } })
    expect(input).toHaveValue("")
  })

  it("resets to the default rate", () => {
    const { props } = setup({ customRate: true, appliedKind: "custom" })
    fireEvent.click(screen.getByRole("button", { name: "還原" }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it("closes via 完成", () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
