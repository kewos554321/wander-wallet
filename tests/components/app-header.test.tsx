import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AppHeader } from "@/components/layout/app-header"

// Mock next/navigation with dynamic pathname
const mockPush = vi.fn()
const mockBack = vi.fn()
let mockPathname = "/"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  usePathname: () => mockPathname,
}))

// Mock ModeToggle component
vi.mock("@/components/system/mode-toggle", () => ({
  ModeToggle: () => <button data-testid="mode-toggle">Toggle</button>,
}))

describe("AppHeader Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = "/"
  })

  describe("Title", () => {
    it("should render default title", () => {
      render(<AppHeader />)
      expect(screen.getByRole("heading", { name: "Wander Wallet" })).toBeInTheDocument()
    })

    it("should render custom title", () => {
      render(<AppHeader title="專案設定" />)
      expect(screen.getByRole("heading", { name: "專案設定" })).toBeInTheDocument()
    })
  })

  describe("Back Button", () => {
    it("should not show back button by default", () => {
      render(<AppHeader />)
      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument()
      // Also check that no ArrowLeft or Folders icon button exists in left section
      const header = screen.getByRole("banner")
      const leftSection = header.querySelector(".flex.items-center.gap-2")
      expect(leftSection?.querySelectorAll("button, a")).toHaveLength(0)
    })

    it("should show ArrowLeft icon on non-project pages when showBack is true", () => {
      mockPathname = "/settings"
      render(<AppHeader showBack />)

      // Find back button by checking for ArrowLeft svg
      const header = screen.getByRole("banner")
      const arrowLeftIcon = header.querySelector(".lucide-arrow-left")
      expect(arrowLeftIcon).toBeInTheDocument()
    })

    it("should show Folders icon on project main page when showBack is true", () => {
      mockPathname = "/projects/abc123"
      render(<AppHeader showBack />)

      // Should have Folders icon linking to /projects
      const header = screen.getByRole("banner")
      const foldersLink = header.querySelector('a[href="/projects"]')
      expect(foldersLink).toBeInTheDocument()
      expect(foldersLink?.querySelector(".lucide-folders")).toBeInTheDocument()
    })

    it("should show ArrowLeft icon on project sub-pages when showBack is true", () => {
      mockPathname = "/projects/abc123/settings"
      render(<AppHeader showBack />)

      // Should have ArrowLeft icon (not Folders)
      const header = screen.getByRole("banner")
      const arrowLeftIcon = header.querySelector(".lucide-arrow-left")
      expect(arrowLeftIcon).toBeInTheDocument()
      expect(header.querySelector(".lucide-folders")).not.toBeInTheDocument()
    })

    it("should call onBack when provided and back button clicked", async () => {
      mockPathname = "/settings"
      const user = userEvent.setup()
      const handleBack = vi.fn()

      render(<AppHeader showBack onBack={handleBack} />)

      const header = screen.getByRole("banner")
      const backButton = header.querySelector("button:not([data-testid])")
      await user.click(backButton!)
      expect(handleBack).toHaveBeenCalledTimes(1)
    })

    it("should call router.push with backHref when provided", async () => {
      mockPathname = "/settings"
      const user = userEvent.setup()

      render(<AppHeader showBack backHref="/projects" />)

      const header = screen.getByRole("banner")
      const backButton = header.querySelector("button:not([data-testid])")
      await user.click(backButton!)
      expect(mockPush).toHaveBeenCalledWith("/projects")
    })

    it("should call router.back when no onBack or backHref provided", async () => {
      mockPathname = "/settings"
      const user = userEvent.setup()

      render(<AppHeader showBack />)

      const header = screen.getByRole("banner")
      const backButton = header.querySelector("button:not([data-testid])")
      await user.click(backButton!)
      expect(mockBack).toHaveBeenCalledTimes(1)
    })

    it("should not show Folders icon on /projects/new page", () => {
      mockPathname = "/projects/new"
      render(<AppHeader showBack />)

      // Should have ArrowLeft, not Folders as back button
      const header = screen.getByRole("banner")
      expect(header.querySelector(".lucide-arrow-left")).toBeInTheDocument()
      // There should be no direct link to /projects in the left section (back area)
      const leftSection = header.querySelector(".flex.items-center.gap-2")
      expect(leftSection?.querySelector('a[href="/projects"]')).not.toBeInTheDocument()
    })
  })

  describe("Navigation Items", () => {
    it("should show both nav items on home page", () => {
      mockPathname = "/"
      render(<AppHeader />)

      expect(screen.getByTitle("所有專案")).toBeInTheDocument()
      expect(screen.getByTitle("個人設定")).toBeInTheDocument()
    })

    it("should hide projects nav on /projects page", () => {
      mockPathname = "/projects"
      render(<AppHeader />)

      expect(screen.queryByTitle("所有專案")).not.toBeInTheDocument()
      expect(screen.getByTitle("個人設定")).toBeInTheDocument()
    })

    it("should hide projects nav on project detail page", () => {
      mockPathname = "/projects/abc123"
      render(<AppHeader />)

      expect(screen.queryByTitle("所有專案")).not.toBeInTheDocument()
      expect(screen.getByTitle("個人設定")).toBeInTheDocument()
    })

    it("should hide projects nav on project sub-pages", () => {
      mockPathname = "/projects/abc123/expenses"
      render(<AppHeader />)

      expect(screen.queryByTitle("所有專案")).not.toBeInTheDocument()
      expect(screen.getByTitle("個人設定")).toBeInTheDocument()
    })

    it("should show projects nav on /projects/new page", () => {
      mockPathname = "/projects/new"
      render(<AppHeader />)

      expect(screen.queryByTitle("所有專案")).not.toBeInTheDocument()
      expect(screen.getByTitle("個人設定")).toBeInTheDocument()
    })

    it("should hide projects nav on settings page", () => {
      mockPathname = "/settings"
      render(<AppHeader />)

      expect(screen.queryByTitle("所有專案")).not.toBeInTheDocument()
      expect(screen.getByTitle("個人設定")).toBeInTheDocument()
    })

    it("should have correct href for nav items", () => {
      mockPathname = "/"
      render(<AppHeader />)

      expect(screen.getByTitle("所有專案")).toHaveAttribute("href", "/projects")
      expect(screen.getByTitle("個人設定")).toHaveAttribute("href", "/settings")
    })

    it("should apply active styles when on current page", () => {
      mockPathname = "/settings"
      render(<AppHeader />)

      const settingsLink = screen.getByTitle("個人設定")
      expect(settingsLink).toHaveClass("text-primary")
    })
  })

  describe("ModeToggle", () => {
    it("should render ModeToggle component", () => {
      render(<AppHeader />)
      expect(screen.getByTestId("mode-toggle")).toBeInTheDocument()
    })
  })

  describe("Header Structure", () => {
    it("should render as header element", () => {
      render(<AppHeader />)
      expect(screen.getByRole("banner")).toBeInTheDocument()
    })

    it("should have sticky positioning class", () => {
      render(<AppHeader />)
      expect(screen.getByRole("banner")).toHaveClass("sticky", "top-0")
    })
  })
})
