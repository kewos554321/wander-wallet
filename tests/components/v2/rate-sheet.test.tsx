import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { format } from "date-fns"

const authFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch }))

import { RateSheet } from "@/components/v2/expense-form/rate-sheet"

type Props = Parameters<typeof RateSheet>[0]

const TODAY = format(new Date(), "yyyy-MM-dd")

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
    amount: 1000,
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
    expect(screen.getByLabelText("匯率日期")).toHaveValue(TODAY)
    expect(screen.getByTestId("market-rate")).toHaveTextContent("0.031715")
    fireEvent.click(screen.getByRole("button", { name: "使用市場匯率" }))
    expect(props.onUseRate).toHaveBeenCalledWith(0.031715, "market")
  })

  it("changing the date fetches that day's rate and applies it with the date", async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 31 } }) })
    const { props } = setup()
    fireEvent.change(screen.getByLabelText("匯率日期"), { target: { value: "2026-09-20" } })
    await waitFor(() => expect(authFetch).toHaveBeenCalledWith("/api/exchange-rates?date=2026-09-20"))
    const use = await screen.findByRole("button", { name: "使用市場匯率" })
    fireEvent.click(use)
    expect(props.onUseRate).toHaveBeenCalledWith(1 / 31, "market", "2026-09-20")
  })

  it("shows an error and keeps the rate when the lookup fails", async () => {
    authFetch.mockResolvedValue({ ok: false })
    const { props } = setup()
    fireEvent.change(screen.getByLabelText("匯率日期"), { target: { value: "2026-09-20" } })
    expect(await screen.findByRole("alert")).toHaveTextContent("查不到")
    expect(props.onUseRate).not.toHaveBeenCalled()
  })

  it("retries the failed lookup", async () => {
    authFetch.mockResolvedValueOnce({ ok: false })
    setup()
    fireEvent.change(screen.getByLabelText("匯率日期"), { target: { value: "2026-09-20" } })
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
    fireEvent.change(screen.getByLabelText("匯率日期"), { target: { value: "2026-09-20" } })
    fireEvent.change(screen.getByLabelText("匯率日期"), { target: { value: "2026-09-21" } })
    await waitFor(() => expect(screen.getByTestId("market-rate")).toHaveTextContent("0.033333"))
    resolveSlow({ ok: true, json: async () => ({ rates: { USD: 1, TWD: 40 } }) })
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.getByTestId("market-rate")).not.toHaveTextContent("0.025")
  })

  it("custom tab prefills the most recent rate and can reuse a listed one", () => {
    const { props } = setup({ recentRates: RECENT, appliedKind: "custom" })
    expect(screen.getByLabelText("自訂匯率")).toHaveValue("0.215")
    fireEvent.click(screen.getByTestId("recent-rate-1"))
    expect(screen.getByLabelText("自訂匯率")).toHaveValue("0.22")
    fireEvent.click(screen.getByRole("button", { name: "使用自訂匯率" }))
    expect(props.onUseRate).toHaveBeenCalledWith(0.22, "custom")
  })

  it("lists recent rates with their source and expense", () => {
    setup({ recentRates: RECENT, appliedKind: "custom" })
    expect(screen.getByTestId("recent-rate-0")).toHaveTextContent("市場")
    expect(screen.getByTestId("recent-rate-0")).toHaveTextContent("晚餐")
    expect(screen.getByTestId("recent-rate-1")).toHaveTextContent("自訂")
  })

  it("disables the custom use button for an invalid value", () => {
    setup({ recentRates: [], appliedKind: "custom" })
    const input = screen.getByLabelText("自訂匯率")
    for (const bad of ["", "0", "-1", "abc"]) {
      fireEvent.change(input, { target: { value: bad } })
      expect(screen.getByRole("button", { name: "使用自訂匯率" })).toBeDisabled()
    }
  })

  it("resets to the default rate", () => {
    const { props } = setup({ customRate: true, appliedKind: "custom" })
    fireEvent.click(screen.getByRole("button", { name: "還原預設" }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it("closes via 完成", () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
