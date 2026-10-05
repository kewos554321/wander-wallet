import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <select aria-label="幣別選擇" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { V2CurrencyField, currencyLabel, currencySymbol, moneySymbol } from "@/components/v2/ui/currency-field"

describe("currencyLabel", () => {
  it("uses the short name when short is true", () => {
    expect(currencyLabel("TWD", true)).toBe("TWD 台幣")
    expect(currencyLabel("JPY", true)).toBe("JPY 日圓")
  })
  it("uses the full name by default", () => {
    expect(currencyLabel("TWD")).toBe("TWD 新台幣")
    expect(currencyLabel("USD")).toBe("USD 美元")
  })
  it("falls back to the raw code for unknown currencies", () => {
    expect(currencyLabel("XXX")).toBe("XXX")
  })
})

describe("currencySymbol", () => {
  it("uses the ISO 4217 3-letter code for every currency", () => {
    expect(currencySymbol("TWD")).toBe("TWD")
    expect(currencySymbol("JPY")).toBe("JPY")
    expect(currencySymbol("USD")).toBe("USD")
    expect(currencySymbol("EUR")).toBe("EUR")
  })
})

describe("moneySymbol", () => {
  it("shows a plain $ for TWD", () => {
    expect(moneySymbol("TWD")).toBe("$")
  })
  it("uses the currency code for other currencies", () => {
    expect(moneySymbol("JPY")).toBe("JPY")
    expect(moneySymbol("USD")).toBe("USD")
    expect(moneySymbol("EUR")).toBe("EUR")
  })
})

describe("V2CurrencyField", () => {
  it("shows the full label by default, reflects the value and reports changes", () => {
    const onChange = vi.fn()
    render(<V2CurrencyField value="TWD" onChange={onChange} />)
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
    const select = screen.getByLabelText("幣別選擇")
    expect(select).toHaveValue("TWD")
    fireEvent.change(select, { target: { value: "JPY" } })
    expect(onChange).toHaveBeenCalledWith("JPY")
  })

  it("shows the short label when requested", () => {
    render(<V2CurrencyField value="TWD" onChange={vi.fn()} short />)
    expect(screen.getByText("TWD 台幣")).toBeInTheDocument()
    expect(screen.queryByText("TWD 新台幣")).not.toBeInTheDocument()
  })

  it("disables the underlying select when disabled", () => {
    render(<V2CurrencyField value="TWD" onChange={vi.fn()} disabled />)
    expect(screen.getByLabelText("幣別選擇")).toBeDisabled()
  })
})
