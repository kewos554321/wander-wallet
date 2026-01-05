import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ThemeProvider, useTheme } from "@/components/system/theme-provider"

// Test component that uses useTheme
function ThemeConsumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("system")}>System</button>
    </div>
  )
}

describe("ThemeProvider", () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>
  let mediaQueryListeners: Array<() => void> = []

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()

    // Clear document.documentElement classes
    document.documentElement.classList.remove("dark")

    // Reset listeners
    mediaQueryListeners = []

    // Mock matchMedia
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? false : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, handler) => {
        if (event === "change") {
          mediaQueryListeners.push(handler)
        }
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    })
  })

  describe("initialization", () => {
    it("should use default theme when no stored theme", () => {
      render(
        <ThemeProvider defaultTheme="light">
          <ThemeConsumer />
        </ThemeProvider>
      )

      expect(screen.getByTestId("current-theme")).toHaveTextContent("light")
    })

    it("should use stored theme from localStorage", () => {
      localStorage.setItem("theme", "dark")

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )

      expect(screen.getByTestId("current-theme")).toHaveTextContent("dark")
    })

    it("should default to system theme", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )

      expect(screen.getByTestId("current-theme")).toHaveTextContent("system")
    })
  })

  describe("theme switching", () => {
    it("should switch to light theme", async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByText("Light").click()
      })

      expect(screen.getByTestId("current-theme")).toHaveTextContent("light")
      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("should switch to dark theme", async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByText("Dark").click()
      })

      expect(screen.getByTestId("current-theme")).toHaveTextContent("dark")
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("should switch to system theme", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByText("System").click()
      })

      expect(screen.getByTestId("current-theme")).toHaveTextContent("system")
    })

    it("should persist theme to localStorage", async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {
        screen.getByText("Dark").click()
      })

      expect(localStorage.getItem("theme")).toBe("dark")
    })
  })

  describe("dark class management", () => {
    it("should add dark class for dark theme", async () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeConsumer />
        </ThemeProvider>
      )

      // Wait for effect to run
      await act(async () => {})

      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("should remove dark class for light theme", async () => {
      // Start with dark
      document.documentElement.classList.add("dark")

      render(
        <ThemeProvider defaultTheme="light">
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {})

      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })
  })

  describe("system theme detection", () => {
    it("should apply dark when system prefers dark", async () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)" ? true : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <ThemeProvider defaultTheme="system">
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {})

      expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("should apply light when system prefers light", async () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <ThemeProvider defaultTheme="system">
          <ThemeConsumer />
        </ThemeProvider>
      )

      await act(async () => {})

      expect(document.documentElement.classList.contains("dark")).toBe(false)
    })
  })

  describe("enableSystem prop", () => {
    it("should listen for system changes when enableSystem is true", () => {
      const addEventListener = vi.fn()

      mockMatchMedia.mockImplementation(() => ({
        matches: false,
        addEventListener,
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))

      render(
        <ThemeProvider enableSystem={true} defaultTheme="system">
          <ThemeConsumer />
        </ThemeProvider>
      )

      expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function))
    })
  })

  describe("useTheme hook", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      expect(() => {
        render(<ThemeConsumer />)
      }).toThrow("useTheme must be used within ThemeProvider")

      consoleSpy.mockRestore()
    })

    it("should provide theme and setTheme", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )

      expect(screen.getByTestId("current-theme")).toBeInTheDocument()
      expect(screen.getByText("Light")).toBeInTheDocument()
      expect(screen.getByText("Dark")).toBeInTheDocument()
    })
  })
})
