import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DashboardTabs } from "@/components/dashboard/tabs"

describe("DashboardTabs Component", () => {
  const defaultTabs = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
    { id: "settings", label: "Settings" },
  ]

  describe("rendering", () => {
    it("should render all tabs", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("Overview")).toBeInTheDocument()
      expect(screen.getByText("Details")).toBeInTheDocument()
      expect(screen.getByText("Settings")).toBeInTheDocument()
    })

    it("should render single tab", () => {
      render(
        <DashboardTabs
          tabs={[{ id: "only", label: "Only Tab" }]}
          activeTab="only"
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("Only Tab")).toBeInTheDocument()
    })

    it("should render many tabs", () => {
      const manyTabs = [
        { id: "1", label: "Tab 1" },
        { id: "2", label: "Tab 2" },
        { id: "3", label: "Tab 3" },
        { id: "4", label: "Tab 4" },
        { id: "5", label: "Tab 5" },
      ]

      render(
        <DashboardTabs
          tabs={manyTabs}
          activeTab="1"
          onChange={vi.fn()}
        />
      )

      manyTabs.forEach(tab => {
        expect(screen.getByText(tab.label)).toBeInTheDocument()
      })
    })
  })

  describe("active tab styling", () => {
    it("should highlight the active tab", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="details"
          onChange={vi.fn()}
        />
      )

      const activeTab = screen.getByText("Details")
      expect(activeTab).toHaveClass("bg-slate-900")
      expect(activeTab).toHaveClass("text-white")
    })

    it("should not highlight inactive tabs", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const inactiveTab = screen.getByText("Details")
      expect(inactiveTab).not.toHaveClass("bg-slate-900")
      expect(inactiveTab).toHaveClass("text-slate-500")
    })

    it("should update active styling when activeTab changes", () => {
      const { rerender } = render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("Overview")).toHaveClass("bg-slate-900")
      expect(screen.getByText("Details")).not.toHaveClass("bg-slate-900")

      rerender(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="details"
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("Overview")).not.toHaveClass("bg-slate-900")
      expect(screen.getByText("Details")).toHaveClass("bg-slate-900")
    })
  })

  describe("interactions", () => {
    it("should call onChange with tab id when clicked", async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()

      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={onChange}
        />
      )

      await user.click(screen.getByText("Details"))

      expect(onChange).toHaveBeenCalledWith("details")
    })

    it("should call onChange when clicking already active tab", async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()

      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={onChange}
        />
      )

      await user.click(screen.getByText("Overview"))

      expect(onChange).toHaveBeenCalledWith("overview")
    })

    it("should handle multiple clicks", async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()

      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={onChange}
        />
      )

      await user.click(screen.getByText("Details"))
      await user.click(screen.getByText("Settings"))
      await user.click(screen.getByText("Overview"))

      expect(onChange).toHaveBeenCalledTimes(3)
      expect(onChange).toHaveBeenNthCalledWith(1, "details")
      expect(onChange).toHaveBeenNthCalledWith(2, "settings")
      expect(onChange).toHaveBeenNthCalledWith(3, "overview")
    })
  })

  describe("button styling", () => {
    it("should have rounded corners", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const button = screen.getByText("Overview")
      expect(button).toHaveClass("rounded-lg")
    })

    it("should have proper padding", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const button = screen.getByText("Overview")
      expect(button).toHaveClass("px-4")
      expect(button).toHaveClass("py-2")
    })

    it("should have transition for color changes", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const button = screen.getByText("Overview")
      expect(button).toHaveClass("transition-colors")
    })

    it("should have medium font weight", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const button = screen.getByText("Overview")
      expect(button).toHaveClass("font-medium")
    })

    it("should have small text size", () => {
      render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const button = screen.getByText("Overview")
      expect(button).toHaveClass("text-sm")
    })
  })

  describe("container styling", () => {
    it("should have sticky positioning", () => {
      const { container } = render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const tabContainer = container.firstChild
      expect(tabContainer).toHaveClass("sticky")
      expect(tabContainer).toHaveClass("top-0")
    })

    it("should have high z-index", () => {
      const { container } = render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const tabContainer = container.firstChild
      expect(tabContainer).toHaveClass("z-10")
    })

    it("should have flex layout with gap", () => {
      const { container } = render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const tabContainer = container.firstChild
      expect(tabContainer).toHaveClass("flex")
      expect(tabContainer).toHaveClass("gap-2")
    })

    it("should have background and border", () => {
      const { container } = render(
        <DashboardTabs
          tabs={defaultTabs}
          activeTab="overview"
          onChange={vi.fn()}
        />
      )

      const tabContainer = container.firstChild
      expect(tabContainer).toHaveClass("bg-white")
      expect(tabContainer).toHaveClass("border-b")
    })
  })

  describe("label variations", () => {
    it("should handle Chinese labels", () => {
      const chineseTabs = [
        { id: "home", label: "首頁" },
        { id: "stats", label: "統計" },
        { id: "settings", label: "設定" },
      ]

      render(
        <DashboardTabs
          tabs={chineseTabs}
          activeTab="home"
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("首頁")).toBeInTheDocument()
      expect(screen.getByText("統計")).toBeInTheDocument()
      expect(screen.getByText("設定")).toBeInTheDocument()
    })

    it("should handle long labels", () => {
      const longLabelTabs = [
        { id: "long", label: "This is a very long tab label" },
      ]

      render(
        <DashboardTabs
          tabs={longLabelTabs}
          activeTab="long"
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("This is a very long tab label")).toBeInTheDocument()
    })
  })
})
