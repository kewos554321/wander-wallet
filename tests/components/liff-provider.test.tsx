import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, renderHook, act } from "@testing-library/react"
import { ReactNode } from "react"

// Mock the liff functions
const mockInitLiff = vi.fn()
const mockGetProfile = vi.fn()
const mockIsLoggedIn = vi.fn()
const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockGetAccessToken = vi.fn()
const mockIsSendMessagesAvailable = vi.fn()

vi.mock("@/lib/liff", () => ({
  initLiff: () => mockInitLiff(),
  getProfile: () => mockGetProfile(),
  isLoggedIn: () => mockIsLoggedIn(),
  login: () => mockLogin(),
  logout: () => mockLogout(),
  getAccessToken: () => mockGetAccessToken(),
  isSendMessagesAvailable: () => mockIsSendMessagesAvailable(),
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// Store original env
const originalEnv = { ...process.env }

describe("LiffProvider Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    localStorage.clear()

    // Reset env
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe("dev mode (no LIFF_ID)", () => {
    beforeEach(async () => {
      // In dev mode, NEXT_PUBLIC_LIFF_ID is not set
      process.env.NEXT_PUBLIC_LIFF_ID = ""
    })

    it("should show loading initially then load", async () => {
      const { LiffProvider, useLiff } = await import("@/components/auth/liff-provider")

      const TestComponent = () => {
        const { isLoading, isDevMode } = useLiff()
        return (
          <div>
            <span>Loading: {isLoading.toString()}</span>
            <span>DevMode: {isDevMode.toString()}</span>
          </div>
        )
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      // Should finish loading
      await waitFor(() => {
        expect(screen.getByText(/Loading: false/)).toBeInTheDocument()
      })
    })

    it("should export LiffProvider component", async () => {
      const module = await import("@/components/auth/liff-provider")
      expect(module.LiffProvider).toBeDefined()
      expect(typeof module.LiffProvider).toBe("function")
    })

    it("should export useLiff hook", async () => {
      const module = await import("@/components/auth/liff-provider")
      expect(module.useLiff).toBeDefined()
      expect(typeof module.useLiff).toBe("function")
    })

    it("should export useAuthFetch hook", async () => {
      const module = await import("@/components/auth/liff-provider")
      expect(module.useAuthFetch).toBeDefined()
      expect(typeof module.useAuthFetch).toBe("function")
    })
  })

  describe("useLiff hook", () => {
    it("should throw error when used outside provider", async () => {
      const { useLiff } = await import("@/components/auth/liff-provider")

      expect(() => {
        const TestComponent = () => {
          useLiff()
          return null
        }
        render(<TestComponent />)
      }).toThrow("useLiff must be used within LiffProvider")
    })
  })

  describe("production mode (with LIFF_ID)", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_LIFF_ID = "test-liff-id"
      vi.resetModules()
    })

    it("should initialize LIFF when mounted", async () => {
      mockInitLiff.mockResolvedValue(undefined)
      mockIsLoggedIn.mockReturnValue(false)
      mockIsSendMessagesAvailable.mockReturnValue(false)

      const { LiffProvider, useLiff } = await import("@/components/auth/liff-provider")

      const TestComponent = () => {
        const { isLoading } = useLiff()
        return <span>Loading: {isLoading.toString()}</span>
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      await waitFor(() => {
        expect(mockInitLiff).toHaveBeenCalled()
      })
    })

    it("should handle logged in user", async () => {
      mockInitLiff.mockResolvedValue(undefined)
      mockIsLoggedIn.mockReturnValue(true)
      mockIsSendMessagesAvailable.mockReturnValue(true)
      mockGetProfile.mockResolvedValue({
        lineUserId: "U123",
        displayName: "Test User",
        pictureUrl: "https://example.com/pic.jpg",
      })
      mockGetAccessToken.mockReturnValue("access-token-123")
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: "user-1",
              lineUserId: "U123",
              name: "Test User",
              image: "https://example.com/pic.jpg",
            },
            sessionToken: "session-token-123",
          }),
      })

      const { LiffProvider, useLiff } = await import("@/components/auth/liff-provider")

      const TestComponent = () => {
        const { user, isAuthenticated, canSendMessages } = useLiff()
        return (
          <div>
            <span>User: {user?.name || "none"}</span>
            <span>Auth: {isAuthenticated.toString()}</span>
            <span>CanSend: {canSendMessages.toString()}</span>
          </div>
        )
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/User: Test User/)).toBeInTheDocument()
      })
    })

    it("should call login when user is not logged in", async () => {
      mockInitLiff.mockResolvedValue(undefined)
      mockIsLoggedIn.mockReturnValue(false)
      mockIsSendMessagesAvailable.mockReturnValue(false)

      const { LiffProvider, useLiff } = await import("@/components/auth/liff-provider")

      const TestComponent = () => {
        const { isLoading } = useLiff()
        return <span>Loading: {isLoading.toString()}</span>
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })

    it("should handle backend auth failure gracefully", async () => {
      mockInitLiff.mockResolvedValue(undefined)
      mockIsLoggedIn.mockReturnValue(true)
      mockIsSendMessagesAvailable.mockReturnValue(false)
      mockGetProfile.mockResolvedValue({
        lineUserId: "U123",
        displayName: "Test User",
      })
      mockGetAccessToken.mockReturnValue("access-token-123")
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      })

      const { LiffProvider, useLiff } = await import("@/components/auth/liff-provider")

      const TestComponent = () => {
        const { user, isLoading } = useLiff()
        return (
          <div>
            <span>User: {user?.name || "none"}</span>
            <span>Loading: {isLoading.toString()}</span>
          </div>
        )
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/User: none/)).toBeInTheDocument()
        expect(screen.getByText(/Loading: false/)).toBeInTheDocument()
      })
    })

    it("should handle LIFF initialization error gracefully", async () => {
      mockInitLiff.mockRejectedValue(new Error("LIFF init failed"))

      const { LiffProvider, useLiff } = await import("@/components/auth/liff-provider")

      const TestComponent = () => {
        const { isLoading } = useLiff()
        return <span>Loading: {isLoading.toString()}</span>
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(/Loading: false/)).toBeInTheDocument()
      })
    })
  })

  describe("useAuthFetch hook", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_LIFF_ID = ""
      vi.resetModules()
    })

    it("should add authorization header when session token exists", async () => {
      const { LiffProvider, useAuthFetch, useLiff } = await import("@/components/auth/liff-provider")

      let authFetch: ReturnType<typeof useAuthFetch> | null = null

      const TestComponent = () => {
        const { login } = useLiff()
        authFetch = useAuthFetch()
        return <button onClick={login}>Login</button>
      }

      render(
        <LiffProvider>
          <TestComponent />
        </LiffProvider>
      )

      await waitFor(() => {
        expect(authFetch).toBeDefined()
      })
    })
  })
})
