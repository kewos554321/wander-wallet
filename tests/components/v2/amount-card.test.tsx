import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// CurrencySelect is a Radix combobox whose own behaviour is covered by
// tests/components/currency-select.test.tsx. AmountCard only needs to forward
// its onChange, so it is stubbed with a native select here for a deterministic
// interaction (test-only stub; no product code changed).
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange, showName }: { value: string; onChange: (v: string) => void; showName?: boolean }) => (
    <select aria-label="幣別" data-showname={String(showName)} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { AmountCard } from "@/components/v2/expense-form/amount-card"

type AmountCardProps = Parameters<typeof AmountCard>[0]

function setup(overrides: Partial<AmountCardProps> = {}) {
  const props: AmountCardProps = {
    amount: "1280",
    currency: "TWD",
    onAmount: vi.fn(),
    onCurrency: vi.fn(),
    calculatorOpen: false,
    onToggleCalculator: vi.fn(),
    ...overrides,
  }
  render(<AmountCard {...props} />)
  return props
}

describe("AmountCard", () => {
  it("shows a labelled amount field, a currency selector and a calculator toggle when closed", () => {
    setup()
    expect(screen.getByLabelText("金額")).toHaveValue("1280")
    expect(screen.getByLabelText("幣別")).toHaveValue("TWD")
    expect(screen.getByRole("button", { name: "開啟計算機" })).toBeInTheDocument()
    expect(screen.queryByTestId("calculator")).not.toBeInTheDocument()
  })

  it("forwards amount edits to onAmount", () => {
    const { onAmount } = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "88" } })
    expect(onAmount).toHaveBeenCalledTimes(1)
    expect(onAmount).toHaveBeenCalledWith("88")
  })

  it("forwards currency changes to onCurrency", () => {
    const { onCurrency } = setup()
    fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "JPY" } })
    expect(onCurrency).toHaveBeenCalledTimes(1)
    expect(onCurrency).toHaveBeenCalledWith("JPY")
  })

  it("keeps currency names in the dropdown list (showName not disabled)", () => {
    setup()
    // The expandable list shows 代碼＋名稱, like the project settings; AmountCard
    // must not pass showName={false}.
    expect(screen.getByLabelText("幣別")).not.toHaveAttribute("data-showname", "false")
  })

  it("calls onToggleCalculator when the calculator toggle is pressed", () => {
    const onToggleCalculator = vi.fn()
    setup({ onToggleCalculator })
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    expect(onToggleCalculator).toHaveBeenCalledTimes(1)
  })

  it("replaces the amount field with the calculator node and swaps the toggle label when open", () => {
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator">pad</div> })
    expect(screen.queryByLabelText("金額")).not.toBeInTheDocument()
    expect(screen.getByTestId("calculator")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "關閉計算機" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "開啟計算機" })).not.toBeInTheDocument()
  })

  it("uses the dark lake face in both the closed and open states", () => {
    const { unmount } = render(
      <AmountCard amount="1280" currency="TWD" onAmount={vi.fn()} onCurrency={vi.fn()} calculatorOpen={false} onToggleCalculator={vi.fn()} />
    )
    expect(screen.getByTestId("amount-card")).toHaveClass("bg-v2-lake", "border-v2-lake")
    unmount()

    render(
      <AmountCard
        amount="1280"
        currency="TWD"
        onAmount={vi.fn()}
        onCurrency={vi.fn()}
        calculatorOpen
        onToggleCalculator={vi.fn()}
        calculator={<div data-testid="calculator" />}
      />
    )
    expect(screen.getByTestId("amount-card")).toHaveClass("bg-v2-lake", "border-v2-lake")
  })

  it("does not render the calculator slot while closed", () => {
    setup({ calculator: <div data-testid="calculator" /> })
    expect(screen.queryByTestId("calculator")).not.toBeInTheDocument()
  })

  it("renders 輸入金額 as a real label bound to the amount input when closed", () => {
    setup()
    const caption = screen.getByText("輸入金額")
    expect(caption.tagName).toBe("LABEL")
    expect(caption).toHaveAttribute("for", "v2-amount")
    expect(screen.getByLabelText("金額")).toHaveAttribute("id", "v2-amount")
  })

  it("drops the label semantics for the 輸入金額 caption once the calculator is open", () => {
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator" /> })
    const caption = screen.getByText("輸入金額")
    expect(caption.tagName).toBe("SPAN")
    expect(caption).not.toHaveAttribute("for")
    expect(screen.queryByLabelText("金額")).not.toBeInTheDocument()
  })

  it("shows the converted amount and the automatic rate (read-only) with its source", () => {
    setup({
      currency: "TWD",
      projectCurrency: "USD",
      previewProjectAmount: 31.72,
      rate: 0.031715,
      rateEditable: true,
      rateSource: "fixed",
      onToggleCustomRate: vi.fn(),
    })
    expect(screen.getByTestId("amount-conversion")).toHaveTextContent("≈ USD 31.72")
    expect(screen.getByText("0.031715")).toBeInTheDocument()
    expect(screen.getByTestId("rate-source")).toHaveTextContent("專案固定匯率")
    expect(screen.queryByLabelText("匯率")).not.toBeInTheDocument()
  })

  it("stacks the converted amount and the rate explanation on two lines", () => {
    setup({
      currency: "TWD",
      projectCurrency: "USD",
      previewProjectAmount: 31.72,
      rate: 0.031715,
      rateEditable: true,
      rateSource: "fixed",
      onToggleCustomRate: vi.fn(),
    })
    const conversion = screen.getByTestId("amount-conversion")
    const rateRow = screen.getByTestId("rate-row")
    // Both lines share one column container, so the rate never wraps next to
    // the converted amount on a narrow screen.
    expect(conversion.parentElement).toBe(rateRow.parentElement)
    expect(conversion.parentElement).toHaveClass("flex-col")
    expect(rateRow).toHaveTextContent("1 TWD =")
    expect(rateRow).toHaveTextContent("USD")
  })

  it("shows 即時匯率 as the source when derived from live rates", () => {
    setup({
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.0317,
      rateEditable: true,
      rateSource: "live",
      onToggleCustomRate: vi.fn(),
    })
    expect(screen.getByTestId("rate-source")).toHaveTextContent("即時匯率")
  })

  it("shows an editable input and the 自訂匯率 label when pinned", () => {
    setup({
      currency: "TWD",
      projectCurrency: "USD",
      previewProjectAmount: 50,
      rate: 0.05,
      rateInput: "0.05",
      rateEditable: true,
      customRate: true,
      onRate: vi.fn(),
      onToggleCustomRate: vi.fn(),
    })
    expect(screen.getByText("自訂匯率")).toBeInTheDocument()
    expect(screen.getByLabelText("匯率")).toHaveValue("0.05")
  })

  it("calls onToggleCustomRate when the pin is pressed", () => {
    const onToggleCustomRate = vi.fn()
    setup({
      currency: "TWD",
      projectCurrency: "USD",
      rate: 0.0317,
      rateEditable: true,
      rateSource: "live",
      onToggleCustomRate,
    })
    fireEvent.click(screen.getByRole("button", { name: "匯率自動，點擊自訂匯率" }))
    expect(onToggleCustomRate).toHaveBeenCalledTimes(1)
  })

  it("hides the rate row for the project currency", () => {
    setup({ currency: "TWD", projectCurrency: "TWD" })
    expect(screen.queryByTestId("amount-conversion")).not.toBeInTheDocument()
  })
})
