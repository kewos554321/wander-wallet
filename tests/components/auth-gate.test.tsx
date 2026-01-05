import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AuthGate } from "@/components/auth/auth-gate"

// Mock useLiff hook
const mockUseLiff = vi.fn()

vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
}))

describe("AuthGate Component", () => {
  describe("loading state", () => {
    it("should show loading UI when isLoading is true", () => {
      mockUseLiff.mockReturnValue({
        user: null,
        isLoading: true,
        isDevMode: false,
        login: vi.fn(),
      })

      render(
        <AuthGate>
          <div>Protected Content</div>
        </AuthGate>
      )

      expect(screen.getByText("Wander Wallet")).toBeInTheDocument()
      expect(screen.getByText("旅行分帳好幫手")).toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })
  })

  describe("not logged in state", () => {
    it("should show login UI when user is null", () => {
      mockUseLiff.mockReturnValue({
        user: null,
        isLoading: false,
        isDevMode: false,
        login: vi.fn(),
      })

      render(
        <AuthGate>
          <div>Protected Content</div>
        </AuthGate>
      )

      expect(screen.getByText("使用 LINE 登入")).toBeInTheDocument()
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    })

    it("should call login when login button is clicked", async () => {
      const login = vi.fn()
      mockUseLiff.mockReturnValue({
        user: null,
        isLoading: false,
        isDevMode: false,
        login,
      })

      render(
        <AuthGate>
          <div>Protected Content</div>
        </AuthGate>
      )

      const loginButton = screen.getByText("使用 LINE 登入")
      await fireEvent.click(loginButton)

      expect(login).toHaveBeenCalled()
    })

    it("should show dev mode warning when in dev mode", () => {
      mockUseLiff.mockReturnValue({
        user: null,
        isLoading: false,
        isDevMode: true,
        login: vi.fn(),
      })

      render(
        <AuthGate>
          <div>Protected Content</div>
        </AuthGate>
      )

      expect(screen.getByText("開發模式")).toBeInTheDocument()
      expect(screen.getByText("LIFF ID 未設定，使用模擬登入。")).toBeInTheDocument()
      expect(screen.getByText("開發模式登入")).toBeInTheDocument()
    })
  })

  describe("logged in state", () => {
    it("should render children when user is logged in", () => {
      mockUseLiff.mockReturnValue({
        user: { id: "user-1", name: "Test User" },
        isLoading: false,
        isDevMode: false,
        login: vi.fn(),
      })

      render(
        <AuthGate>
          <div>Protected Content</div>
        </AuthGate>
      )

      expect(screen.getByText("Protected Content")).toBeInTheDocument()
      expect(screen.queryByText("使用 LINE 登入")).not.toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export AuthGate component", () => {
      expect(AuthGate).toBeDefined()
      expect(typeof AuthGate).toBe("function")
    })
  })
})
