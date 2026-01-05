import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Checkbox } from "@/components/ui/checkbox"

describe("Checkbox Component", () => {
  it("should render checkbox", () => {
    render(<Checkbox aria-label="Test checkbox" />)
    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("should have data-slot attribute", () => {
    render(<Checkbox aria-label="Test checkbox" />)
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-slot", "checkbox")
  })

  it("should toggle when clicked", async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="Test checkbox" />)

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toHaveAttribute("data-state", "unchecked")

    await user.click(checkbox)
    expect(checkbox).toHaveAttribute("data-state", "checked")

    await user.click(checkbox)
    expect(checkbox).toHaveAttribute("data-state", "unchecked")
  })

  it("should call onCheckedChange when toggled", async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Checkbox aria-label="Test checkbox" onCheckedChange={handleChange} />)

    await user.click(screen.getByRole("checkbox"))
    expect(handleChange).toHaveBeenCalledWith(true)

    await user.click(screen.getByRole("checkbox"))
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it("should be controlled when checked prop is provided", async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <Checkbox aria-label="Test checkbox" checked={false} onCheckedChange={handleChange} />
    )

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toHaveAttribute("data-state", "unchecked")

    await user.click(checkbox)
    expect(handleChange).toHaveBeenCalledWith(true)
    // Still unchecked because it's controlled
    expect(checkbox).toHaveAttribute("data-state", "unchecked")

    // Update to checked via rerender
    rerender(
      <Checkbox aria-label="Test checkbox" checked={true} onCheckedChange={handleChange} />
    )
    expect(checkbox).toHaveAttribute("data-state", "checked")
  })

  it("should be disabled when disabled prop is true", async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Checkbox aria-label="Test checkbox" disabled onCheckedChange={handleChange} />)

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeDisabled()

    await user.click(checkbox)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it("should merge custom className", () => {
    render(<Checkbox aria-label="Test checkbox" className="custom-class" />)
    expect(screen.getByRole("checkbox")).toHaveClass("custom-class")
  })

  it("should have default checked state when defaultChecked is true", () => {
    render(<Checkbox aria-label="Test checkbox" defaultChecked />)
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked")
  })

  it("should have proper aria attributes", () => {
    render(<Checkbox aria-label="Accept terms" aria-describedby="terms-desc" />)

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toHaveAttribute("aria-label", "Accept terms")
    expect(checkbox).toHaveAttribute("aria-describedby", "terms-desc")
  })

  it("should work with id and label", () => {
    render(
      <>
        <Checkbox id="terms" />
        <label htmlFor="terms">Accept terms and conditions</label>
      </>
    )

    expect(screen.getByLabelText("Accept terms and conditions")).toBeInTheDocument()
  })
})
