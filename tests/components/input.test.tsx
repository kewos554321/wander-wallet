import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Input } from "@/components/ui/input"

describe("Input Component", () => {
  it("should render input element", () => {
    render(<Input aria-label="Test input" />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("should have data-slot attribute", () => {
    render(<Input aria-label="Test input" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "input")
  })

  it("should accept and display user input", async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Test input" />)

    const input = screen.getByRole("textbox")
    await user.type(input, "Hello World")

    expect(input).toHaveValue("Hello World")
  })

  it("should call onChange when value changes", async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Input aria-label="Test input" onChange={handleChange} />)

    await user.type(screen.getByRole("textbox"), "test")

    expect(handleChange).toHaveBeenCalled()
  })

  it("should render with different types", () => {
    const { rerender } = render(<Input type="text" aria-label="Text input" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text")

    rerender(<Input type="email" aria-label="Email input" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email")

    rerender(<Input type="password" data-testid="password" />)
    expect(screen.getByTestId("password")).toHaveAttribute("type", "password")
  })

  it("should be disabled when disabled prop is true", async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Test input" disabled />)

    const input = screen.getByRole("textbox")
    expect(input).toBeDisabled()

    await user.type(input, "test")
    expect(input).toHaveValue("")
  })

  it("should show placeholder text", () => {
    render(<Input placeholder="Enter your name" />)
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument()
  })

  it("should merge custom className", () => {
    render(<Input aria-label="Test input" className="custom-class" />)
    expect(screen.getByRole("textbox")).toHaveClass("custom-class")
  })

  it("should have default height class", () => {
    render(<Input aria-label="Test input" />)
    expect(screen.getByRole("textbox")).toHaveClass("h-9")
  })

  it("should support value and controlled input", async () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <Input aria-label="Test input" value="initial" onChange={handleChange} />
    )

    const input = screen.getByRole("textbox")
    expect(input).toHaveValue("initial")

    rerender(
      <Input aria-label="Test input" value="updated" onChange={handleChange} />
    )
    expect(input).toHaveValue("updated")
  })

  it("should support defaultValue", () => {
    render(<Input aria-label="Test input" defaultValue="default text" />)
    expect(screen.getByRole("textbox")).toHaveValue("default text")
  })

  it("should pass through additional props", () => {
    render(
      <Input
        aria-label="Test input"
        data-testid="custom-input"
        maxLength={10}
        required
      />
    )

    const input = screen.getByTestId("custom-input")
    expect(input).toHaveAttribute("maxlength", "10")
    expect(input).toBeRequired()
  })

  it("should support readonly", () => {
    render(<Input aria-label="Test input" readOnly value="readonly value" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
  })
})
