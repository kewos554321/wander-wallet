import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

const mockUseLiff = vi.hoisted(() => vi.fn())
const mockPathname = vi.hoisted(() => vi.fn(() => "/projects"))

vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
  PUBLIC_ROUTES: ["/", "/brand-preview"],
  PUBLIC_PREFIXES: ["/admin"],
}))
vi.mock("next/navigation", () => ({ usePathname: () => mockPathname() }))
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="login-v2" /> }))
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { AuthGate } from "@/components/auth/auth-gate"

function setLiff(overrides: Partial<{ user: unknown; isLoading: boolean; isDevMode: boolean; login: () => void }> = {}) {
  mockUseLiff.mockReturnValue({ user: null, isLoading: false, isDevMode: false, login: vi.fn(), ...overrides })
}

describe("AuthGate", () => {
  beforeEach(() => {
    mockUseLiff.mockReset()
    mockPathname.mockReset().mockReturnValue("/projects")
  })

  it("renders the v2 login when unauthenticated", () => {
    setLiff()
    render(<AuthGate><div>app</div></AuthGate>)
    expect(screen.getByTestId("login-v2")).toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    setLiff({ user: { id: "u1" } })
    render(<AuthGate><div>app-content</div></AuthGate>)
    expect(screen.getByText("app-content")).toBeInTheDocument()
    expect(screen.queryByTestId("login-v2")).not.toBeInTheDocument()
  })

  it("renders children on a public route", () => {
    setLiff()
    mockPathname.mockReturnValue("/")
    render(<AuthGate><div>public-content</div></AuthGate>)
    expect(screen.getByText("public-content")).toBeInTheDocument()
  })
})
