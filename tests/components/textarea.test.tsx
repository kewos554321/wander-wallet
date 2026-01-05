import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Textarea } from "@/components/ui/textarea"

describe("Textarea Component", () => {
  it("should render textarea element", () => {
    render(<Textarea aria-label="Test textarea" />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("should have data-slot attribute", () => {
    render(<Textarea aria-label="Test textarea" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "textarea")
  })

  it("should accept and display user input", async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="Test textarea" />)

    const textarea = screen.getByRole("textbox")
    await user.type(textarea, "Multi\nline\ntext")

    expect(textarea).toHaveValue("Multi\nline\ntext")
  })

  it("should call onChange when value changes", async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Textarea aria-label="Test textarea" onChange={handleChange} />)

    await user.type(screen.getByRole("textbox"), "test")

    expect(handleChange).toHaveBeenCalled()
  })

  it("should be disabled when disabled prop is true", async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="Test textarea" disabled />)

    const textarea = screen.getByRole("textbox")
    expect(textarea).toBeDisabled()

    await user.type(textarea, "test")
    expect(textarea).toHaveValue("")
  })

  it("should show placeholder text", () => {
    render(<Textarea placeholder="Enter your message" />)
    expect(screen.getByPlaceholderText("Enter your message")).toBeInTheDocument()
  })

  it("should merge custom className", () => {
    render(<Textarea aria-label="Test textarea" className="custom-class" />)
    expect(screen.getByRole("textbox")).toHaveClass("custom-class")
  })

  it("should have min-h-16 class by default", () => {
    render(<Textarea aria-label="Test textarea" />)
    expect(screen.getByRole("textbox")).toHaveClass("min-h-16")
  })

  it("should support value and controlled input", async () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <Textarea aria-label="Test textarea" value="initial" onChange={handleChange} />
    )

    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveValue("initial")

    rerender(
      <Textarea aria-label="Test textarea" value="updated" onChange={handleChange} />
    )
    expect(textarea).toHaveValue("updated")
  })

  it("should support defaultValue", () => {
    render(<Textarea aria-label="Test textarea" defaultValue="default text" />)
    expect(screen.getByRole("textbox")).toHaveValue("default text")
  })

  it("should pass through additional props", () => {
    render(
      <Textarea
        aria-label="Test textarea"
        data-testid="custom-textarea"
        maxLength={500}
        required
        rows={5}
      />
    )

    const textarea = screen.getByTestId("custom-textarea")
    expect(textarea).toHaveAttribute("maxlength", "500")
    expect(textarea).toBeRequired()
    expect(textarea).toHaveAttribute("rows", "5")
  })

  it("should support readonly", () => {
    render(<Textarea aria-label="Test textarea" readOnly value="readonly value" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
  })
})
