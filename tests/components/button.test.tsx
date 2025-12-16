import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "@/components/ui/button"

describe("Button Component", () => {
  it("should render button with text", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
  })

  it("should call onClick handler when clicked", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole("button"))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled Button</Button>)

    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("should not call onClick when disabled", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    )

    await user.click(screen.getByRole("button"))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it("should apply default variant styles", () => {
    render(<Button>Default Button</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("bg-primary")
  })

  it("should apply destructive variant styles", () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("bg-destructive")
  })

  it("should apply outline variant styles", () => {
    render(<Button variant="outline">Outline Button</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("border")
  })

  it("should apply ghost variant styles", () => {
    render(<Button variant="ghost">Ghost Button</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("hover:bg-accent")
  })

  it("should apply different sizes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole("button")).toHaveClass("h-8")

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole("button")).toHaveClass("h-10")

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole("button")).toHaveClass("size-9")
  })

  it("should render as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )

    expect(screen.getByRole("link")).toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveAttribute("href", "/test")
  })

  it("should merge custom className with default classes", () => {
    render(<Button className="custom-class">Custom Button</Button>)

    const button = screen.getByRole("button")
    expect(button).toHaveClass("custom-class")
    expect(button).toHaveClass("inline-flex")
  })

  it("should have data-slot attribute", () => {
    render(<Button>Button</Button>)

    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button")
  })

  it("should pass through additional props", () => {
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>
    )

    const button = screen.getByTestId("submit-btn")
    expect(button).toHaveAttribute("type", "submit")
  })
})
