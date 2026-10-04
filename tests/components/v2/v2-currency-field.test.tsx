import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="幣別選擇" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { V2CurrencyField, currencyLabel, currencySymbol } from "@/components/v2/ui/currency-field"

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
  it("maps known settlement currencies", () => {
    expect(currencySymbol("TWD")).toBe("NT$")
    expect(currencySymbol("JPY")).toBe("¥")
    expect(currencySymbol("USD")).toBe("$")
  })
  it("falls back to the currency code", () => {
    expect(currencySymbol("EUR")).toBe("EUR")
  })
})

describe("V2CurrencyField", () => {
  it("shows the full label by default and reports changes", () => {
    const onChange = vi.fn()
    render(<V2CurrencyField value="TWD" onChange={onChange} />)
    const label = screen.getByText("TWD 新台幣")
    expect(label).toBeInTheDocument()
    expect(label.className).toContain("font-semibold")
    expect(label.className).not.toContain("font-bold")
    fireEvent.change(screen.getByLabelText("幣別選擇"), { target: { value: "JPY" } })
    expect(onChange).toHaveBeenCalledWith("JPY")
  })
  it("shows the short label when requested", () => {
    render(<V2CurrencyField value="TWD" onChange={vi.fn()} short />)
    const label = screen.getByText("TWD 台幣")
    expect(label).toBeInTheDocument()
    expect(label.className).toContain("font-bold")
    expect(label.className).not.toContain("font-semibold")
  })
})
