import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"

// Store original navigator
let originalNavigator: Navigator

describe("ServiceWorkerRegister Component", () => {
  beforeEach(() => {
    vi.resetModules()
    originalNavigator = global.navigator
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it("should return null (no visible UI)", async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      update: vi.fn().mockResolvedValue(undefined),
    })

    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          register: mockRegister,
        },
      },
      writable: true,
      configurable: true,
    })

    const ServiceWorkerRegister = (await import("@/components/system/sw-register")).default
    const { container } = render(<ServiceWorkerRegister />)

    expect(container.firstChild).toBeNull()
  })

  it("should register service worker on mount", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    const mockRegister = vi.fn().mockResolvedValue({
      update: mockUpdate,
    })

    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          register: mockRegister,
        },
      },
      writable: true,
      configurable: true,
    })

    const ServiceWorkerRegister = (await import("@/components/system/sw-register")).default
    render(<ServiceWorkerRegister />)

    // Wait for effect to run
    await vi.waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
        updateViaCache: "none",
        type: "classic",
      })
    })
  })

  it("should not register when serviceWorker is not supported", async () => {
    Object.defineProperty(global, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    })

    const ServiceWorkerRegister = (await import("@/components/system/sw-register")).default
    const { container } = render(<ServiceWorkerRegister />)

    expect(container.firstChild).toBeNull()
  })

  it("should handle registration error gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const mockRegister = vi.fn().mockRejectedValue(new Error("Registration failed"))

    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          register: mockRegister,
        },
      },
      writable: true,
      configurable: true,
    })

    const ServiceWorkerRegister = (await import("@/components/system/sw-register")).default
    render(<ServiceWorkerRegister />)

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Service worker registration failed",
        expect.any(Error)
      )
    })

    consoleError.mockRestore()
  })

  it("should handle update error gracefully", async () => {
    const mockUpdate = vi.fn().mockRejectedValue(new Error("Update failed"))
    const mockRegister = vi.fn().mockResolvedValue({
      update: mockUpdate,
    })

    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          register: mockRegister,
        },
      },
      writable: true,
      configurable: true,
    })

    const ServiceWorkerRegister = (await import("@/components/system/sw-register")).default
    render(<ServiceWorkerRegister />)

    // Should not throw, update error is caught silently
    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe("exports", () => {
    it("should export default component", async () => {
      const module = await import("@/components/system/sw-register")
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe("function")
    })
  })
})
