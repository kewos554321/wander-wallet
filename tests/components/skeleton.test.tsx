import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Skeleton } from "@/components/ui/skeleton"

describe("Skeleton Component", () => {
  it("should render skeleton element", () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId("skeleton")).toBeInTheDocument()
  })

  it("should have animate-pulse class", () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse")
  })

  it("should have rounded-md class", () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("rounded-md")
  })

  it("should merge custom className", () => {
    render(<Skeleton data-testid="skeleton" className="w-full h-4" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("w-full", "h-4")
  })

  it("should pass through additional props", () => {
    render(<Skeleton data-testid="skeleton" role="progressbar" aria-label="Loading" />)
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Loading")
  })

  it("should render with different sizes", () => {
    const { rerender } = render(<Skeleton data-testid="skeleton" className="h-4" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("h-4")

    rerender(<Skeleton data-testid="skeleton" className="h-8 w-24" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("h-8", "w-24")

    rerender(<Skeleton data-testid="skeleton" className="h-12 w-full" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("h-12", "w-full")
  })

  it("should support circular skeleton", () => {
    render(<Skeleton data-testid="skeleton" className="rounded-full w-10 h-10" />)
    expect(screen.getByTestId("skeleton")).toHaveClass("rounded-full")
  })
})
