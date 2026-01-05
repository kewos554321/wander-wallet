import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Logo } from "@/components/brand/logo"

describe("Logo Component", () => {
  describe("variant: full (default)", () => {
    it("should render full logo with text", () => {
      render(<Logo />)
      expect(screen.getByText("Wander Wallet")).toBeInTheDocument()
      expect(screen.getByText("旅行分帳好幫手")).toBeInTheDocument()
    })

    it("should render with SVG icon", () => {
      const { container } = render(<Logo />)
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("should have gradient container", () => {
      const { container } = render(<Logo />)
      const gradientDiv = container.querySelector(".from-brand-400")
      expect(gradientDiv).toBeInTheDocument()
    })
  })

  describe("variant: simple", () => {
    it("should render simple logo without text", () => {
      render(<Logo variant="simple" />)
      expect(screen.queryByText("Wander Wallet")).not.toBeInTheDocument()
    })

    it("should render with SVG icon", () => {
      const { container } = render(<Logo variant="simple" />)
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("should have gradient background", () => {
      const { container } = render(<Logo variant="simple" />)
      const gradientDiv = container.querySelector(".from-brand-400")
      expect(gradientDiv).toBeInTheDocument()
    })
  })

  describe("variant: icon", () => {
    it("should render icon only without text", () => {
      render(<Logo variant="icon" />)
      expect(screen.queryByText("Wander Wallet")).not.toBeInTheDocument()
    })

    it("should render with SVG icon", () => {
      const { container } = render(<Logo variant="icon" />)
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("should have primary text color", () => {
      const { container } = render(<Logo variant="icon" />)
      expect(container.firstChild).toHaveClass("text-primary")
    })
  })

  describe("size variations", () => {
    it("should render with sm size", () => {
      const { container } = render(<Logo size="sm" variant="icon" />)
      expect(container.querySelector(".h-6")).toBeInTheDocument()
    })

    it("should render with md size (default)", () => {
      const { container } = render(<Logo variant="icon" />)
      expect(container.querySelector(".h-8")).toBeInTheDocument()
    })

    it("should render with lg size", () => {
      const { container } = render(<Logo size="lg" variant="icon" />)
      expect(container.querySelector(".h-10")).toBeInTheDocument()
    })

    it("should render with xl size", () => {
      const { container } = render(<Logo size="xl" variant="icon" />)
      expect(container.querySelector(".h-12")).toBeInTheDocument()
    })

    it("should apply correct container size for simple variant", () => {
      const { container } = render(<Logo size="lg" variant="simple" />)
      expect(container.querySelector(".h-16")).toBeInTheDocument()
    })

    it("should apply correct text size for full variant", () => {
      const { container } = render(<Logo size="sm" />)
      expect(container.querySelector(".text-sm")).toBeInTheDocument()
    })
  })

  describe("className prop", () => {
    it("should merge custom className", () => {
      const { container } = render(<Logo className="custom-class" />)
      expect(container.firstChild).toHaveClass("custom-class")
    })

    it("should merge className with icon variant", () => {
      const { container } = render(<Logo variant="icon" className="mt-4" />)
      expect(container.firstChild).toHaveClass("mt-4")
    })

    it("should merge className with simple variant", () => {
      const { container } = render(<Logo variant="simple" className="shadow-xl" />)
      expect(container.firstChild).toHaveClass("shadow-xl")
    })
  })
})
