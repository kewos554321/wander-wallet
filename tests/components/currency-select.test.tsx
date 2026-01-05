import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CurrencySelect } from "@/components/ui/currency-select"
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currencies"

describe("CurrencySelect Component", () => {
  describe("rendering", () => {
    it("should render with selected currency code", () => {
      render(
        <CurrencySelect value="TWD" onChange={vi.fn()} />
      )

      expect(screen.getByText("TWD")).toBeInTheDocument()
    })

    it("should render with USD currency", () => {
      render(
        <CurrencySelect value="USD" onChange={vi.fn()} />
      )

      expect(screen.getByText("USD")).toBeInTheDocument()
    })

    it("should render with JPY currency", () => {
      render(
        <CurrencySelect value="JPY" onChange={vi.fn()} />
      )

      expect(screen.getByText("JPY")).toBeInTheDocument()
    })

    it("should render with EUR currency", () => {
      render(
        <CurrencySelect value="EUR" onChange={vi.fn()} />
      )

      expect(screen.getByText("EUR")).toBeInTheDocument()
    })

    it("should render with GBP currency", () => {
      render(
        <CurrencySelect value="GBP" onChange={vi.fn()} />
      )

      expect(screen.getByText("GBP")).toBeInTheDocument()
    })
  })

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(
        <CurrencySelect value="TWD" onChange={vi.fn()} disabled />
      )

      expect(screen.getByRole("combobox")).toBeDisabled()
    })

    it("should not be disabled by default", () => {
      render(
        <CurrencySelect value="TWD" onChange={vi.fn()} />
      )

      expect(screen.getByRole("combobox")).not.toBeDisabled()
    })
  })

  describe("className prop", () => {
    it("should apply custom className to trigger", () => {
      const { container } = render(
        <CurrencySelect value="TWD" onChange={vi.fn()} className="custom-class" />
      )

      const trigger = container.querySelector('[data-slot="select-trigger"]')
      expect(trigger).toHaveClass("custom-class")
    })
  })

  describe("currency display", () => {
    it("should display currency code with monospace font", () => {
      const { container } = render(
        <CurrencySelect value="EUR" onChange={vi.fn()} />
      )

      const codeElement = container.querySelector(".font-mono")
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toBe("EUR")
    })

    it("should display TWD currency code", () => {
      const { container } = render(
        <CurrencySelect value="TWD" onChange={vi.fn()} />
      )

      const codeElement = container.querySelector(".font-mono")
      expect(codeElement?.textContent).toBe("TWD")
    })
  })

  describe("currency data", () => {
    it("should have all expected currencies available", () => {
      // Verify common currencies are present in SUPPORTED_CURRENCIES
      const currencyCodes = ["USD", "EUR", "GBP", "JPY", "KRW", "TWD", "AUD", "CAD", "CNY", "HKD", "SGD", "THB", "VND"]
      currencyCodes.forEach(code => {
        const currency = SUPPORTED_CURRENCIES.find(c => c.code === code)
        expect(currency).toBeDefined()
      })
    })

    it("should have correct currency count", () => {
      expect(SUPPORTED_CURRENCIES.length).toBe(13)
    })
  })

  describe("showName prop", () => {
    it("should accept showName prop", () => {
      // Just verify the component accepts the prop without error
      const { container } = render(
        <CurrencySelect value="TWD" onChange={vi.fn()} showName={true} />
      )

      expect(container.querySelector('[data-slot="select-trigger"]')).toBeInTheDocument()
    })

    it("should accept showName=false prop", () => {
      const { container } = render(
        <CurrencySelect value="TWD" onChange={vi.fn()} showName={false} />
      )

      expect(container.querySelector('[data-slot="select-trigger"]')).toBeInTheDocument()
    })
  })

  describe("combobox role", () => {
    it("should render as combobox", () => {
      render(
        <CurrencySelect value="TWD" onChange={vi.fn()} />
      )

      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })
  })
})
