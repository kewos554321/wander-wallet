import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// CurrencySelect is a Radix combobox whose own behaviour is covered by
// tests/components/currency-select.test.tsx. AmountCard only needs to forward
// its onChange, so it is stubbed with a native select here for a deterministic
// interaction (test-only stub; no product code changed).
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="幣別" value={value} onChange={(e) => onChange(e.target.value)}>
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

  it("calls onToggleCalculator when the calculator toggle is pressed", () => {
    const onToggleCalculator = vi.fn()
    setup({ onToggleCalculator })
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    expect(onToggleCalculator).toHaveBeenCalledTimes(1)
  })

  it("keeps the amount and currency visible at the input's serif size while the calculator is open", () => {
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator">pad</div> })
    expect(screen.getByLabelText("金額")).toHaveValue("1280")
    expect(screen.getByLabelText("幣別")).toHaveValue("TWD")
    expect(screen.getByLabelText("金額")).toHaveClass("font-v2-serif")
    expect(screen.getByLabelText("金額")).not.toHaveClass("text-[26px]")
    expect(screen.getByTestId("calculator")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "關閉計算機" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "開啟計算機" })).not.toBeInTheDocument()
  })

  it("uses the light lake-tint face in both states, never the dark lake fill", () => {
    const { unmount } = render(<AmountCard {...{
      amount: "1280",
      currency: "TWD",
      onAmount: vi.fn(),
      onCurrency: vi.fn(),
      calculatorOpen: false,
      onToggleCalculator: vi.fn(),
    }} />)
    const closed = screen.getByTestId("amount-card")
    expect(closed).toHaveClass("bg-v2-lake-tint", "border-v2-lake-edge")
    expect(closed).not.toHaveClass("bg-v2-lake")
    unmount()

    render(<AmountCard {...{
      amount: "1280",
      currency: "TWD",
      onAmount: vi.fn(),
      onCurrency: vi.fn(),
      calculatorOpen: true,
      onToggleCalculator: vi.fn(),
      calculator: <div data-testid="calculator" />,
    }} />)
    const open = screen.getByTestId("amount-card")
    expect(open).toHaveClass("bg-v2-lake-tint", "border-v2-lake-edge")
    expect(open).not.toHaveClass("bg-v2-lake")
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

  it("keeps the label bound to the amount input while the calculator is open", () => {
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator" /> })
    const caption = screen.getByText("輸入金額")
    expect(caption.tagName).toBe("LABEL")
    expect(caption).toHaveAttribute("for", "v2-amount")
    expect(screen.getByLabelText("金額")).toHaveAttribute("id", "v2-amount")
  })
})
