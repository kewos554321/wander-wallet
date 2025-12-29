import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AppLayout } from "@/components/layout/app-layout"

// Mock AppHeader component
vi.mock("@/components/layout/app-header", () => ({
  AppHeader: ({ title, showBack, backHref, onBack }: {
    title?: string
    showBack?: boolean
    backHref?: string
    onBack?: () => void
  }) => (
    <header data-testid="app-header">
      <span data-testid="header-title">{title}</span>
      <span data-testid="header-show-back">{String(showBack)}</span>
      <span data-testid="header-back-href">{backHref || ""}</span>
      <span data-testid="header-has-onback">{onBack ? "true" : "false"}</span>
    </header>
  ),
}))

describe("AppLayout Component", () => {
  describe("Children Rendering", () => {
    it("should render children content", () => {
      render(
        <AppLayout>
          <div data-testid="child-content">Hello World</div>
        </AppLayout>
      )

      expect(screen.getByTestId("child-content")).toBeInTheDocument()
      expect(screen.getByText("Hello World")).toBeInTheDocument()
    })

    it("should render multiple children", () => {
      render(
        <AppLayout>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
        </AppLayout>
      )

      expect(screen.getByTestId("child-1")).toBeInTheDocument()
      expect(screen.getByTestId("child-2")).toBeInTheDocument()
    })
  })

  describe("Props Passing to AppHeader", () => {
    it("should pass title to AppHeader", () => {
      render(<AppLayout title="Test Title">Content</AppLayout>)

      expect(screen.getByTestId("header-title")).toHaveTextContent("Test Title")
    })

    it("should pass showBack to AppHeader", () => {
      render(<AppLayout showBack>Content</AppLayout>)

      expect(screen.getByTestId("header-show-back")).toHaveTextContent("true")
    })

    it("should pass backHref to AppHeader", () => {
      render(<AppLayout backHref="/projects">Content</AppLayout>)

      expect(screen.getByTestId("header-back-href")).toHaveTextContent("/projects")
    })

    it("should pass onBack to AppHeader", () => {
      const handleBack = vi.fn()
      render(<AppLayout onBack={handleBack}>Content</AppLayout>)

      expect(screen.getByTestId("header-has-onback")).toHaveTextContent("true")
    })

    it("should have default showBack as false", () => {
      render(<AppLayout>Content</AppLayout>)

      expect(screen.getByTestId("header-show-back")).toHaveTextContent("false")
    })
  })

  describe("Layout Structure", () => {
    it("should have min-h-screen class on root div", () => {
      const { container } = render(<AppLayout>Content</AppLayout>)

      const rootDiv = container.firstChild as HTMLElement
      expect(rootDiv).toHaveClass("min-h-screen")
    })

    it("should have bg-background class on root div", () => {
      const { container } = render(<AppLayout>Content</AppLayout>)

      const rootDiv = container.firstChild as HTMLElement
      expect(rootDiv).toHaveClass("bg-background")
    })

    it("should render main element", () => {
      render(<AppLayout>Content</AppLayout>)

      expect(screen.getByRole("main")).toBeInTheDocument()
    })

    it("should have pt-14 class on main element for header spacing", () => {
      render(<AppLayout>Content</AppLayout>)

      const main = screen.getByRole("main")
      expect(main).toHaveClass("pt-14")
    })

    it("should have container classes on inner div", () => {
      render(<AppLayout>Content</AppLayout>)

      const main = screen.getByRole("main")
      const innerDiv = main.firstChild as HTMLElement
      expect(innerDiv).toHaveClass("container", "mx-auto", "max-w-screen-2xl", "px-4")
    })
  })

  describe("AppHeader Integration", () => {
    it("should render AppHeader component", () => {
      render(<AppLayout>Content</AppLayout>)

      expect(screen.getByTestId("app-header")).toBeInTheDocument()
    })
  })
})
