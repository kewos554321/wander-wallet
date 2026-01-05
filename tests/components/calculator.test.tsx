import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Calculator } from "@/components/ui/calculator"

describe("Calculator Component", () => {
  describe("rendering", () => {
    it("should render calculator with all buttons", () => {
      render(<Calculator onApply={vi.fn()} />)

      // Check number buttons
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "0" })).toBeInTheDocument()
    })

    it("should render operator buttons", () => {
      render(<Calculator onApply={vi.fn()} />)

      expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "−" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "×" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "÷" })).toBeInTheDocument()
    })

    it("should render clear and decimal buttons", () => {
      render(<Calculator onApply={vi.fn()} />)

      expect(screen.getByRole("button", { name: "C" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "." })).toBeInTheDocument()
    })

    it("should show initial value when provided", () => {
      render(<Calculator onApply={vi.fn()} initialValue="123" />)

      expect(screen.getByText("123")).toBeInTheDocument()
      expect(screen.getByText("= 123")).toBeInTheDocument()
    })

    it("should show 0 when no expression", () => {
      const { container } = render(<Calculator onApply={vi.fn()} />)

      // Check the display shows 0 (font-mono class)
      const display = container.querySelector(".font-mono")
      expect(display?.textContent).toBe("0")
    })
  })

  describe("number input", () => {
    it("should display entered numbers", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "2" }))
      await user.click(screen.getByRole("button", { name: "3" }))

      expect(screen.getByText("123")).toBeInTheDocument()
      expect(screen.getByText("= 123")).toBeInTheDocument()
    })

    it("should handle decimal numbers", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "." }))
      await user.click(screen.getByRole("button", { name: "5" }))

      expect(screen.getByText("1.5")).toBeInTheDocument()
      expect(screen.getByText("= 1.5")).toBeInTheDocument()
    })

    it("should prevent multiple decimals in same number", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "." }))
      await user.click(screen.getByRole("button", { name: "5" }))
      await user.click(screen.getByRole("button", { name: "." }))
      await user.click(screen.getByRole("button", { name: "2" }))

      expect(screen.getByText("1.52")).toBeInTheDocument()
    })
  })

  describe("operations", () => {
    it("should calculate addition", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "5" }))
      await user.click(screen.getByRole("button", { name: "+" }))
      await user.click(screen.getByRole("button", { name: "3" }))

      expect(screen.getByText("5+3")).toBeInTheDocument()
      expect(screen.getByText("= 8")).toBeInTheDocument()
    })

    it("should calculate subtraction", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "9" }))
      await user.click(screen.getByRole("button", { name: "−" }))
      await user.click(screen.getByRole("button", { name: "4" }))

      expect(screen.getByText("9-4")).toBeInTheDocument()
      expect(screen.getByText("= 5")).toBeInTheDocument()
    })

    it("should calculate multiplication", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "6" }))
      await user.click(screen.getByRole("button", { name: "×" }))
      await user.click(screen.getByRole("button", { name: "7" }))

      expect(screen.getByText("6×7")).toBeInTheDocument()
      expect(screen.getByText("= 42")).toBeInTheDocument()
    })

    it("should calculate division", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "8" }))
      await user.click(screen.getByRole("button", { name: "÷" }))
      await user.click(screen.getByRole("button", { name: "2" }))

      expect(screen.getByText("8÷2")).toBeInTheDocument()
      expect(screen.getByText("= 4")).toBeInTheDocument()
    })

    it("should prevent consecutive operators", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "5" }))
      await user.click(screen.getByRole("button", { name: "+" }))
      await user.click(screen.getByRole("button", { name: "×" }))

      // Should only show 5+, not 5+×
      expect(screen.getByText("5+")).toBeInTheDocument()
    })

    it("should prevent starting with operator", async () => {
      const user = userEvent.setup()
      const { container } = render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "+" }))

      // Expression should still be empty, showing default 0
      const display = container.querySelector(".font-mono")
      expect(display?.textContent).toBe("0")
    })
  })

  describe("clear function", () => {
    it("should clear expression when C is pressed", async () => {
      const user = userEvent.setup()
      const { container } = render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "2" }))
      await user.click(screen.getByRole("button", { name: "3" }))

      expect(screen.getByText("123")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "C" }))

      const display = container.querySelector(".font-mono")
      expect(display?.textContent).toBe("0")
    })
  })

  describe("delete function", () => {
    it("should delete last character when backspace is pressed", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "2" }))
      await user.click(screen.getByRole("button", { name: "3" }))

      // Find the delete button (it has a Delete icon)
      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-delete"]'))
      if (deleteButton) {
        await user.click(deleteButton)
      }

      expect(screen.getByText("12")).toBeInTheDocument()
    })
  })

  describe("apply function", () => {
    it("should call onApply with result when equals is pressed", async () => {
      const onApply = vi.fn()
      const user = userEvent.setup()
      render(<Calculator onApply={onApply} />)

      await user.click(screen.getByRole("button", { name: "5" }))
      await user.click(screen.getByRole("button", { name: "+" }))
      await user.click(screen.getByRole("button", { name: "3" }))

      // Find and click equals button (has Check icon)
      const buttons = screen.getAllByRole("button")
      const equalsButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-check"]'))
      if (equalsButton) {
        await user.click(equalsButton)
      }

      expect(onApply).toHaveBeenCalledWith(8)
    })

    it("should call onClose after applying result", async () => {
      const onApply = vi.fn()
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<Calculator onApply={onApply} onClose={onClose} />)

      await user.click(screen.getByRole("button", { name: "5" }))

      // Find and click equals button
      const buttons = screen.getAllByRole("button")
      const equalsButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-check"]'))
      if (equalsButton) {
        await user.click(equalsButton)
      }

      expect(onClose).toHaveBeenCalled()
    })

    it("should disable equals button when no result", async () => {
      render(<Calculator onApply={vi.fn()} />)

      // Find equals button
      const buttons = screen.getAllByRole("button")
      const equalsButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-check"]'))

      expect(equalsButton).toBeDisabled()
    })

    it("should clear expression after applying", async () => {
      const user = userEvent.setup()
      const { container } = render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "5" }))

      // Find and click equals button
      const buttons = screen.getAllByRole("button")
      const equalsButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-check"]'))
      if (equalsButton) {
        await user.click(equalsButton)
      }

      // Expression should be cleared
      const display = container.querySelector(".font-mono")
      expect(display?.textContent).toBe("0")
    })
  })

  describe("complex calculations", () => {
    it("should handle multi-step calculations", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "0" }))
      await user.click(screen.getByRole("button", { name: "+" }))
      await user.click(screen.getByRole("button", { name: "5" }))
      await user.click(screen.getByRole("button", { name: "×" }))
      await user.click(screen.getByRole("button", { name: "2" }))

      expect(screen.getByText("= 20")).toBeInTheDocument()
    })

    it("should handle decimal calculations", async () => {
      const user = userEvent.setup()
      render(<Calculator onApply={vi.fn()} />)

      await user.click(screen.getByRole("button", { name: "1" }))
      await user.click(screen.getByRole("button", { name: "0" }))
      await user.click(screen.getByRole("button", { name: "÷" }))
      await user.click(screen.getByRole("button", { name: "3" }))

      // Result should be rounded to 2 decimal places
      expect(screen.getByText("= 3.33")).toBeInTheDocument()
    })
  })
})
