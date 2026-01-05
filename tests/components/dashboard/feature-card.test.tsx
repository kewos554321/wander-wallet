import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FeatureCard } from "@/components/dashboard/feature-card"

describe("FeatureCard Component", () => {
  const defaultProps = {
    icon: <span data-testid="icon">📊</span>,
    label: "Feature Label",
    iconBgClass: "bg-blue-100",
  }

  describe("rendering", () => {
    it("should render icon and label", () => {
      render(<FeatureCard {...defaultProps} />)

      expect(screen.getByTestId("icon")).toBeInTheDocument()
      expect(screen.getByText("Feature Label")).toBeInTheDocument()
    })

    it("should render with correct icon background class", () => {
      const { container } = render(
        <FeatureCard {...defaultProps} iconBgClass="bg-green-200" />
      )

      const iconContainer = container.querySelector(".h-10.w-10.rounded-xl")
      expect(iconContainer).toHaveClass("bg-green-200")
    })
  })

  describe("link variant", () => {
    it("should render as a link when href is provided", () => {
      render(<FeatureCard {...defaultProps} href="/dashboard" />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/dashboard")
    })

    it("should contain the card content within the link", () => {
      render(<FeatureCard {...defaultProps} href="/settings" />)

      const link = screen.getByRole("link")
      expect(link).toContainElement(screen.getByText("Feature Label"))
      expect(link).toContainElement(screen.getByTestId("icon"))
    })
  })

  describe("button variant", () => {
    it("should render as a button when onClick is provided", () => {
      render(<FeatureCard {...defaultProps} onClick={vi.fn()} />)

      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("should call onClick when clicked", async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()

      render(<FeatureCard {...defaultProps} onClick={onClick} />)

      await user.click(screen.getByRole("button"))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("should have full width", () => {
      render(<FeatureCard {...defaultProps} onClick={vi.fn()} />)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("w-full")
    })

    it("should have text-left alignment", () => {
      render(<FeatureCard {...defaultProps} onClick={vi.fn()} />)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("text-left")
    })
  })

  describe("neither href nor onClick", () => {
    it("should render as a button without onClick handler", () => {
      render(<FeatureCard {...defaultProps} />)

      expect(screen.getByRole("button")).toBeInTheDocument()
    })
  })

  describe("card styling", () => {
    it("should have card container with proper styling", () => {
      const { container } = render(<FeatureCard {...defaultProps} />)

      const card = container.querySelector(".bg-white")
      expect(card).toHaveClass("rounded-xl")
      expect(card).toHaveClass("border")
      expect(card).toHaveClass("hover:shadow-md")
    })

    it("should have hover and active states", () => {
      const { container } = render(<FeatureCard {...defaultProps} />)

      const card = container.querySelector(".bg-white")
      expect(card).toHaveClass("hover:border-slate-300")
      expect(card).toHaveClass("active:scale-95")
      expect(card).toHaveClass("transition-all")
    })

    it("should have cursor-pointer", () => {
      const { container } = render(<FeatureCard {...defaultProps} />)

      const card = container.querySelector(".cursor-pointer")
      expect(card).toBeInTheDocument()
    })

    it("should have group class for hover effects", () => {
      const { container } = render(<FeatureCard {...defaultProps} />)

      const card = container.querySelector(".group")
      expect(card).toBeInTheDocument()
    })
  })

  describe("icon styling", () => {
    it("should have proper icon container size", () => {
      const { container } = render(<FeatureCard {...defaultProps} />)

      const iconContainer = container.querySelector(".h-10.w-10")
      expect(iconContainer).toBeInTheDocument()
    })

    it("should have hover scale effect on icon", () => {
      const { container } = render(<FeatureCard {...defaultProps} />)

      const iconContainer = container.querySelector(".h-10.w-10")
      expect(iconContainer).toHaveClass("group-hover:scale-110")
      expect(iconContainer).toHaveClass("transition-transform")
    })
  })

  describe("label styling", () => {
    it("should have proper text styling", () => {
      render(<FeatureCard {...defaultProps} />)

      const label = screen.getByText("Feature Label")
      expect(label).toHaveClass("font-medium")
      expect(label).toHaveClass("text-sm")
    })
  })

  describe("different labels", () => {
    it("should render short labels", () => {
      render(<FeatureCard {...defaultProps} label="Stats" />)

      expect(screen.getByText("Stats")).toBeInTheDocument()
    })

    it("should render long labels", () => {
      render(<FeatureCard {...defaultProps} label="Very Long Feature Name Here" />)

      expect(screen.getByText("Very Long Feature Name Here")).toBeInTheDocument()
    })

    it("should render labels with special characters", () => {
      render(<FeatureCard {...defaultProps} label="統計報表" />)

      expect(screen.getByText("統計報表")).toBeInTheDocument()
    })
  })

  describe("icon variations", () => {
    it("should render SVG icons", () => {
      render(
        <FeatureCard
          {...defaultProps}
          icon={<svg data-testid="svg-icon" />}
        />
      )

      expect(screen.getByTestId("svg-icon")).toBeInTheDocument()
    })

    it("should render emoji icons", () => {
      render(
        <FeatureCard
          {...defaultProps}
          icon={<span>🎉</span>}
        />
      )

      expect(screen.getByText("🎉")).toBeInTheDocument()
    })

    it("should render component icons", () => {
      const CustomIcon = () => <div data-testid="custom-icon">Icon</div>

      render(
        <FeatureCard
          {...defaultProps}
          icon={<CustomIcon />}
        />
      )

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument()
    })
  })
})
