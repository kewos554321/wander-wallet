import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CalculatorPad } from "@/components/v2/expense-form/calculator-pad"

type PadProps = Parameters<typeof CalculatorPad>[0]

function setup(overrides: Partial<PadProps> = {}) {
  const onApply = vi.fn()
  const onClose = vi.fn()
  const props: PadProps = { initialValue: "", onApply, onClose, ...overrides }
  render(<CalculatorPad {...props} />)
  return {
    onApply,
    onClose,
    expression: () => screen.getByTestId("calc-expression").textContent,
    result: () => screen.getByTestId("calc-result").textContent,
  }
}

function press(name: string) {
  fireEvent.click(screen.getByRole("button", { name }))
}

describe("CalculatorPad", () => {
  it("renders the design keypad labels, including − (U+2212) and ✓", () => {
    setup()
    for (const label of ["C", "÷", "×", "⌫", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "✓", "0", "."]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
    }
    // 0 spans two columns
    expect(screen.getByRole("button", { name: "0" }).className).toContain("col-span-2")
  })

  it("prefills the expression with the initial value", () => {
    const { expression } = setup({ initialValue: "1280" })
    expect(expression()).toBe("1280")
  })

  it("accepts a numeric initial value", () => {
    const { expression } = setup({ initialValue: 1280 })
    expect(expression()).toBe("1280")
  })

  it("shows the running expression and = result", () => {
    const { expression, result } = setup()
    press("7")
    press("+")
    press("8")
    expect(expression()).toBe("7+8")
    expect(result()).toBe("= 15")
  })

  it("shows the currency in the result line when provided", () => {
    const { result } = setup({ currency: "TWD" })
    press("7")
    press("+")
    press("8")
    expect(result()).toBe("= 15 TWD")
  })

  it("does not allow two operators in a row", () => {
    const { expression } = setup()
    press("7")
    press("+")
    press("+")
    press("×")
    expect(expression()).toBe("7+")
    press("8")
    expect(expression()).toBe("7+8")
  })

  it("does not allow a leading operator", () => {
    const { expression } = setup()
    press("+")
    expect(expression()).toBe("0")
  })

  it("does not allow two dots in the same operand", () => {
    const { expression } = setup()
    press("1")
    press(".")
    press("5")
    press(".")
    expect(expression()).toBe("1.5")
    press("+")
    press("2")
    press(".")
    press("5")
    expect(expression()).toBe("1.5+2.5")
  })

  it("normalises a leading dot to 0.", () => {
    const { expression, onApply, onClose } = setup()
    press(".")
    expect(expression()).toBe("0.")
    press("5")
    expect(expression()).toBe("0.5")
    press("✓")
    expect(onApply).toHaveBeenCalledWith(0.5)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("backspaces characters and can empty the expression", () => {
    const { expression, result } = setup()
    press("7")
    press("+")
    press("8")
    press("⌫")
    expect(expression()).toBe("7+")
    press("⌫")
    expect(expression()).toBe("7")
    press("⌫")
    expect(expression()).toBe("0")
    expect(result()).toBe("")
  })

  it("clears the expression", () => {
    const { expression, result } = setup()
    press("7")
    press("×")
    press("8")
    press("C")
    expect(expression()).toBe("0")
    expect(result()).toBe("")
  })

  it("applies the evaluated number and closes", () => {
    const { onApply, onClose } = setup()
    press("1")
    press("2")
    press("0")
    press("÷")
    press("4")
    press("✓")
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(30)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("applies 0 for an empty expression instead of NaN", () => {
    const { onApply, onClose } = setup()
    press("✓")
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(0)
    expect(onApply).not.toHaveBeenCalledWith(NaN)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("applies a trailing-operator expression using the value before it", () => {
    const { onApply } = setup()
    press("9")
    press("−")
    press("✓")
    expect(onApply).toHaveBeenCalledWith(9)
  })

  it("sanitises a malicious initial value and never executes it", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const { onApply, onClose, result } = setup({ initialValue: "1+fetch('x')" })
    expect(result()).toBe("")
    press("✓")
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(Number.isFinite(onApply.mock.calls[0][0])).toBe(true)
    expect(onApply).toHaveBeenCalledWith(0)
    expect(onClose).toHaveBeenCalledTimes(1)
    fetchSpy.mockRestore()
  })

  it("sanitises a process.exit initial value instead of running it", () => {
    const { onApply } = setup({ initialValue: "process.exit()" })
    press("✓")
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(Number.isFinite(onApply.mock.calls[0][0])).toBe(true)
    expect(onApply).toHaveBeenCalledWith(0)
  })

  it("uses v2 tokens for the display box and keypad", () => {
    setup()
    expect(screen.getByTestId("calc-display").className).toContain("bg-v2-surface")
    expect(screen.getByRole("button", { name: "7" }).className).toContain("bg-v2-paper")
    expect(screen.getByRole("button", { name: "+" }).className).toContain("bg-v2-paper/15")
    expect(screen.getByRole("button", { name: "✓" }).className).toContain("text-v2-lake")
    expect(screen.getByRole("button", { name: "C" }).className).toContain("text-v2-danger-edge")
  })
})
