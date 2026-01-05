import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import InstallPrompt from "@/components/system/install-prompt"

describe("InstallPrompt Component", () => {
  const originalNavigator = global.navigator
  const originalWindow = global.window
  const mockLocalStorage: Record<string, string> = {}

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset localStorage mock
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key])

    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value
        },
        removeItem: (key: string) => delete mockLocalStorage[key],
      },
      writable: true,
      configurable: true,
    })

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  describe("when already in standalone mode", () => {
    it("should return null when display-mode is standalone", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(display-mode: standalone)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      const { container } = render(<InstallPrompt />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe("when neverShow is set", () => {
    it("should return null when localStorage has never show flag", () => {
      mockLocalStorage["install-prompt-never-show"] = "true"

      const { container } = render(<InstallPrompt />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe("on iOS", () => {
    beforeEach(() => {
      // Mock iOS user agent
      Object.defineProperty(global.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        configurable: true,
      })
    })

    it("should show iOS-specific instructions", () => {
      render(<InstallPrompt />)

      // Should show iOS instructions
      expect(screen.getByText(/在 iOS 上安裝/)).toBeInTheDocument()
    })

    it("should show the prompt title", () => {
      render(<InstallPrompt />)

      expect(screen.getByText("安裝應用程式")).toBeInTheDocument()
    })

    it("should not show install button on iOS", () => {
      render(<InstallPrompt />)

      expect(screen.queryByText("加入主畫面")).not.toBeInTheDocument()
    })
  })

  describe("on non-iOS without beforeinstallprompt", () => {
    beforeEach(() => {
      // Non-iOS user agent
      Object.defineProperty(global.navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      })
    })

    it("should not render when no beforeinstallprompt and not iOS", () => {
      const { container } = render(<InstallPrompt />)

      // Component returns null when canPrompt is false and not iOS
      expect(container.firstChild).toBeNull()
    })
  })

  describe("dismiss behavior", () => {
    beforeEach(() => {
      // iOS user agent to make the prompt visible
      Object.defineProperty(global.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
        configurable: true,
      })
    })

    it("should dismiss when close button is clicked", async () => {
      const { container } = render(<InstallPrompt />)

      const closeButton = screen.getByRole("button", { name: /關閉/ })
      await fireEvent.click(closeButton)

      expect(container.firstChild).toBeNull()
    })

    it("should set never show when checkbox is checked and dismissed", async () => {
      render(<InstallPrompt />)

      // Check the "never show" checkbox
      const checkbox = screen.getByRole("checkbox")
      await fireEvent.click(checkbox)

      // Click dismiss
      const closeButton = screen.getByRole("button", { name: /關閉/ })
      await fireEvent.click(closeButton)

      expect(mockLocalStorage["install-prompt-never-show"]).toBe("true")
    })
  })

  describe("exports", () => {
    it("should export default InstallPrompt component", () => {
      expect(InstallPrompt).toBeDefined()
      expect(typeof InstallPrompt).toBe("function")
    })
  })
})
