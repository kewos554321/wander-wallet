import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatCard } from "@/components/dashboard/stat-card"

describe("StatCard Component", () => {
  describe("basic rendering", () => {
    it("should render title and value", () => {
      render(<StatCard title="Total" value="$1,000" />)

      expect(screen.getByText("Total")).toBeInTheDocument()
      expect(screen.getByText("$1,000")).toBeInTheDocument()
    })

    it("should render title in uppercase", () => {
      const { container } = render(<StatCard title="expenses" value="$500" />)

      const title = container.querySelector(".uppercase")
      expect(title).toBeInTheDocument()
      expect(title?.textContent).toBe("expenses")
    })
  })

  describe("optional props", () => {
    it("should render subtitle when provided", () => {
      render(
        <StatCard title="Balance" value="$2,500" subtitle="Last updated today" />
      )

      expect(screen.getByText("Last updated today")).toBeInTheDocument()
    })

    it("should not render subtitle when not provided", () => {
      render(<StatCard title="Balance" value="$2,500" />)

      expect(screen.queryByText("Last updated")).not.toBeInTheDocument()
    })

    it("should render icon when provided", () => {
      render(
        <StatCard
          title="Revenue"
          value="$10,000"
          icon={<span data-testid="icon">$</span>}
        />
      )

      expect(screen.getByTestId("icon")).toBeInTheDocument()
    })

    it("should not render icon container when icon is not provided", () => {
      const { container } = render(<StatCard title="Revenue" value="$10,000" />)

      // Icon container should not exist
      const iconContainers = container.querySelectorAll(".h-7.w-7.rounded-lg")
      expect(iconContainers.length).toBe(0)
    })

    it("should apply custom iconBgClass", () => {
      const { container } = render(
        <StatCard
          title="Sales"
          value="100"
          icon={<span>$</span>}
          iconBgClass="bg-green-100"
        />
      )

      const iconContainer = container.querySelector(".h-7.w-7.rounded-lg")
      expect(iconContainer).toHaveClass("bg-green-100")
    })

    it("should use default icon background when iconBgClass not provided", () => {
      const { container } = render(
        <StatCard
          title="Sales"
          value="100"
          icon={<span>$</span>}
        />
      )

      const iconContainer = container.querySelector(".h-7.w-7.rounded-lg")
      expect(iconContainer).toHaveClass("bg-slate-100")
    })
  })

  describe("trend display", () => {
    it("should render trend when provided", () => {
      render(<StatCard title="Growth" value="25%" trend="+5% from last month" />)

      expect(screen.getByText("+5% from last month")).toBeInTheDocument()
    })

    it("should not render trend when not provided", () => {
      render(<StatCard title="Growth" value="25%" />)

      expect(screen.queryByText("from last month")).not.toBeInTheDocument()
    })

    it("should apply emerald color when trendUp is true", () => {
      render(
        <StatCard
          title="Growth"
          value="25%"
          trend="+10%"
          trendUp={true}
        />
      )

      const trend = screen.getByText("+10%")
      expect(trend).toHaveClass("text-emerald-500")
    })

    it("should apply red color when trendUp is false", () => {
      render(
        <StatCard
          title="Growth"
          value="25%"
          trend="-5%"
          trendUp={false}
        />
      )

      const trend = screen.getByText("-5%")
      expect(trend).toHaveClass("text-red-500")
    })
  })

  describe("styling", () => {
    it("should have card styling", () => {
      const { container } = render(<StatCard title="Test" value="123" />)

      const card = container.firstChild
      expect(card).toHaveClass("bg-white")
      expect(card).toHaveClass("rounded-xl")
      expect(card).toHaveClass("p-4")
      expect(card).toHaveClass("border")
    })

    it("should have hover effect", () => {
      const { container } = render(<StatCard title="Test" value="123" />)

      const card = container.firstChild
      expect(card).toHaveClass("hover:shadow-md")
      expect(card).toHaveClass("transition-shadow")
    })

    it("should display value with tabular-nums for consistent number widths", () => {
      const { container } = render(<StatCard title="Test" value="1,234" />)

      const value = container.querySelector(".tabular-nums")
      expect(value).toBeInTheDocument()
      expect(value?.textContent).toBe("1,234")
    })
  })

  describe("different value formats", () => {
    it("should handle currency values", () => {
      render(<StatCard title="Total" value="NT$ 50,000" />)

      expect(screen.getByText("NT$ 50,000")).toBeInTheDocument()
    })

    it("should handle percentage values", () => {
      render(<StatCard title="Rate" value="85.5%" />)

      expect(screen.getByText("85.5%")).toBeInTheDocument()
    })

    it("should handle plain number values", () => {
      render(<StatCard title="Count" value="42" />)

      expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("should handle text values", () => {
      render(<StatCard title="Status" value="Active" />)

      expect(screen.getByText("Active")).toBeInTheDocument()
    })
  })
})
