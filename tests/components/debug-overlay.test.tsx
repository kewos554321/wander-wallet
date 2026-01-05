import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

// Store original env
const originalEnv = { ...process.env }

// Mock lib/debug
const mockSubscribeDebugLogs = vi.fn()
const mockClearDebugLogs = vi.fn()
const mockGetDebugLogs = vi.fn()
let mockDebugMode = false

vi.mock("@/lib/debug", () => ({
  get DEBUG_MODE() {
    return mockDebugMode
  },
  subscribeDebugLogs: (fn: (logs: unknown[]) => void) => {
    mockSubscribeDebugLogs(fn)
    fn([])
    return () => {}
  },
  clearDebugLogs: () => mockClearDebugLogs(),
  getDebugLogs: () => mockGetDebugLogs(),
}))

// Mock clipboard
const mockWriteText = vi.fn()

describe("DebugOverlay Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDebugMode = false
    mockGetDebugLogs.mockReturnValue([])

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe("when DEBUG_MODE is false", () => {
    it("should not render anything", async () => {
      mockDebugMode = false
      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      const { container } = render(<DebugOverlay />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe("when DEBUG_MODE is true", () => {
    beforeEach(() => {
      mockDebugMode = true
      vi.resetModules()
    })

    it("should render collapsed button initially", async () => {
      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      // Should see the collapsed bug button
      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
    })

    it("should expand when clicked", async () => {
      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      const button = screen.getByRole("button")
      await fireEvent.click(button)

      // Should see DEBUG header when expanded
      expect(screen.getByText("🐛 DEBUG")).toBeInTheDocument()
    })

    it("should show 'No logs yet...' when no logs", async () => {
      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      // Expand
      await fireEvent.click(screen.getByRole("button"))

      expect(screen.getByText("No logs yet...")).toBeInTheDocument()
    })

    it("should collapse when close button is clicked", async () => {
      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      // Expand first
      await fireEvent.click(screen.getByRole("button"))
      expect(screen.getByText("🐛 DEBUG")).toBeInTheDocument()

      // Click close button (the X button)
      const closeButton = screen.getByTitle("縮小")
      await fireEvent.click(closeButton)

      // Should be collapsed again
      expect(screen.queryByText("🐛 DEBUG")).not.toBeInTheDocument()
    })

    it("should call clearDebugLogs when clear button is clicked", async () => {
      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      // Expand
      await fireEvent.click(screen.getByRole("button"))

      // Click clear button
      const clearButton = screen.getByTitle("清除")
      await fireEvent.click(clearButton)

      expect(mockClearDebugLogs).toHaveBeenCalled()
    })

    it("should copy logs when copy button is clicked", async () => {
      mockGetDebugLogs.mockReturnValue([
        { id: 1, timestamp: "10:00:00", level: "info", message: "test message" },
      ])
      mockWriteText.mockResolvedValue(undefined)

      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      // Expand
      await fireEvent.click(screen.getByRole("button"))

      // Click copy button
      const copyButton = screen.getByTitle("複製全部")
      await fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          "[10:00:00] [INFO] test message"
        )
      })
    })

    it("should show log count badge when logs exist", async () => {
      mockDebugMode = true
      vi.resetModules()

      // Need to re-mock with logs
      vi.doMock("@/lib/debug", () => ({
        get DEBUG_MODE() {
          return true
        },
        subscribeDebugLogs: (fn: (logs: unknown[]) => void) => {
          fn([
            { id: 1, timestamp: "10:00:00", level: "info", message: "log 1" },
            { id: 2, timestamp: "10:00:01", level: "warn", message: "log 2" },
          ])
          return () => {}
        },
        clearDebugLogs: () => {},
        getDebugLogs: () => [],
      }))

      const { DebugOverlay } = await import("@/components/debug/debug-overlay")

      render(<DebugOverlay />)

      // Should show badge with count
      expect(screen.getByText("2")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export DebugOverlay component", async () => {
      const module = await import("@/components/debug/debug-overlay")
      expect(module.DebugOverlay).toBeDefined()
      expect(typeof module.DebugOverlay).toBe("function")
    })
  })
})
