import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ModeToggle } from "@/components/system/mode-toggle"
import { ThemeProvider } from "@/components/system/theme-provider"

describe("ModeToggle Component", () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()

    // Clear document.documentElement classes
    document.documentElement.classList.remove("dark")

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  function renderWithProvider(initialTheme: "light" | "dark" | "system" = "light") {
    return render(
      <ThemeProvider defaultTheme={initialTheme}>
        <ModeToggle />
      </ThemeProvider>
    )
  }

  describe("rendering", () => {
    it("should render a button", () => {
      renderWithProvider()

      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("should have accessible name", () => {
      renderWithProvider()

      expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument()
    })

    it("should render sun and moon icons", () => {
      const { container } = renderWithProvider()

      // Both icons should be present (visibility controlled by CSS)
      const svgs = container.querySelectorAll("svg")
      expect(svgs.length).toBe(2)
    })

    it("should have ghost variant styling", () => {
      renderWithProvider()

      const button = screen.getByRole("button")
      // Ghost variant doesn't have bg-primary class
      expect(button).not.toHaveClass("bg-primary")
    })

    it("should have icon size", () => {
      renderWithProvider()

      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-9")
      expect(button).toHaveClass("w-9")
    })
  })

  describe("theme toggling", () => {
    it("should toggle from light to dark", async () => {
      const user = userEvent.setup()
      renderWithProvider("light")

      const button = screen.getByRole("button")

      await act(async () => {
        await user.click(button)
      })

      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("should toggle from dark to light", async () => {
      const user = userEvent.setup()
      document.documentElement.classList.add("dark")
      renderWithProvider("dark")

      const button = screen.getByRole("button")

      await act(async () => {
        await user.click(button)
      })

      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("should handle multiple toggles", async () => {
      const user = userEvent.setup()
      renderWithProvider("light")

      const button = screen.getByRole("button")

      // Light -> Dark
      await act(async () => {
        await user.click(button)
      })
      expect(document.documentElement.classList.contains("dark")).toBe(true)

      // Dark -> Light
      await act(async () => {
        await user.click(button)
      })
      expect(document.documentElement.classList.contains("dark")).toBe(false)

      // Light -> Dark again
      await act(async () => {
        await user.click(button)
      })
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })
  })

  describe("accessibility", () => {
    it("should have sr-only text for screen readers", () => {
      renderWithProvider()

      const srText = screen.getByText("Toggle theme")
      expect(srText).toHaveClass("sr-only")
    })

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup()
      renderWithProvider("light")

      const button = screen.getByRole("button")
      button.focus()

      await act(async () => {
        await user.keyboard("{Enter}")
      })

      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("should be focusable", () => {
      renderWithProvider()

      const button = screen.getByRole("button")
      button.focus()

      expect(document.activeElement).toBe(button)
    })
  })

  describe("icon animations", () => {
    it("should have sun icon with rotation classes", () => {
      const { container } = renderWithProvider()

      // Find sun icon (first svg with rotate-0)
      const svgs = container.querySelectorAll("svg")
      const sunIcon = Array.from(svgs).find(svg => svg.classList.contains("rotate-0"))
      expect(sunIcon).toBeInTheDocument()
    })

    it("should have moon icon with absolute positioning", () => {
      const { container } = renderWithProvider()

      // Find moon icon (svg with absolute)
      const svgs = container.querySelectorAll("svg")
      const moonIcon = Array.from(svgs).find(svg => svg.classList.contains("absolute"))
      expect(moonIcon).toBeInTheDocument()
    })

    it("should have transition classes on icons", () => {
      const { container } = renderWithProvider()

      const svgs = container.querySelectorAll("svg")
      svgs.forEach(svg => {
        expect(svg).toHaveClass("transition-all")
      })
    })
  })
})
