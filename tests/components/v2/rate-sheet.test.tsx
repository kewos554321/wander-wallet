import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const authFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch }))

import { RateSheet } from "@/components/v2/expense-form/rate-sheet"

type Props = Parameters<typeof RateSheet>[0]

function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
    open: true,
    onClose: vi.fn(),
    fromCurrency: "TWD",
    toCurrency: "USD",
    amount: 1000,
    rate: 0.032,
    customRate: false,
    projectFixedRate: 0.032,
    liveRate: 0.031715,
    liveTimestamp: Date.now() - 3 * 60_000,
    expenseDate: new Date("2026-10-01T00:00:00"),
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

describe("RateSheet", () => {
  it("renders nothing when closed", () => {
    setup({ open: false })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows the pair, the current rate and the ≈ settled amount", () => {
    setup()
    expect(screen.getByTestId("rate-sheet-pair")).toHaveTextContent("1 TWD = 0.032 USD")
    expect(screen.getByTestId("rate-sheet-approx")).toHaveTextContent("≈ USD 32.00")
  })

  it("explains the project fixed rate when one is set", () => {
    setup({ projectFixedRate: 0.032 })
    expect(screen.getByTestId("rate-sheet-project")).toHaveTextContent("專案固定匯率")
  })

  it("says the project has no fixed rate when none is set", () => {
    setup({ projectFixedRate: null, liveRate: 0.031715 })
    expect(screen.getByTestId("rate-sheet-project")).toHaveTextContent("尚未設定")
  })

  it("switches between the live, history and custom panes", () => {
    setup()
    expect(screen.getByTestId("rate-pane-live")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "歷史" }))
    expect(screen.getByTestId("rate-pane-history")).toBeInTheDocument()
    expect(screen.queryByTestId("rate-pane-live")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "自訂" }))
    expect(screen.getByTestId("rate-pane-custom")).toBeInTheDocument()
  })

  it("applies the live rate", () => {
    const { props } = setup({ liveRate: 0.031715 })
    fireEvent.click(screen.getByRole("button", { name: "使用即時匯率" }))
    expect(props.onUseRate).toHaveBeenCalledWith(0.031715)
  })

  it("applies a custom rate", () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole("tab", { name: "自訂" }))
    fireEvent.change(screen.getByLabelText("自訂匯率"), { target: { value: "0.05" } })
    fireEvent.click(screen.getByRole("button", { name: "使用自訂匯率" }))
    expect(props.onUseRate).toHaveBeenCalledWith(0.05)
  })

  it("queries a past date and applies the historical rate", async () => {
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { USD: 1, TWD: 31 } }),
    })
    const { props } = setup()
    fireEvent.click(screen.getByRole("tab", { name: "歷史" }))
    fireEvent.change(screen.getByLabelText("歷史日期"), { target: { value: "2026-09-20" } })
    fireEvent.click(screen.getByRole("button", { name: "查詢" }))
    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith("/api/exchange-rates?date=2026-09-20"),
    )
    const use = await screen.findByRole("button", { name: "使用歷史匯率" })
    fireEvent.click(use)
    expect(props.onUseRate).toHaveBeenCalledWith(1 / 31)
  })

  it("shows an error when the historical rate cannot be found", async () => {
    authFetch.mockResolvedValue({ ok: false })
    setup()
    fireEvent.click(screen.getByRole("tab", { name: "歷史" }))
    fireEvent.click(screen.getByRole("button", { name: "查詢" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("查不到")
  })

  it("resets to the default rate", () => {
    const { props } = setup({ customRate: true })
    fireEvent.click(screen.getByRole("button", { name: "還原預設" }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it("disables reset when already on the default", () => {
    setup({ customRate: false })
    expect(screen.getByRole("button", { name: "還原預設" })).toBeDisabled()
  })

  it("closes via 完成", () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
