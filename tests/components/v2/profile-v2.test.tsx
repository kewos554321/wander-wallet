import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockUseLiff = vi.hoisted(() => vi.fn())
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
}))

import { ProfileV2 } from "@/components/v2/settings/profile-v2"

function renderView(overrides: Partial<Parameters<typeof ProfileV2View>[0]> = {}) {
  const props: Parameters<typeof ProfileV2View>[0] = {
    name: "Emma",
    image: null,
    userId: "u1",
    logoutOpen: false,
    onLogoutOpenChange: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  }
  render(<ProfileV2View {...props} />)
  return props
}

describe("ProfileV2View", () => {
  it("renders the profile header and info rows without an edit entry", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getByText("名稱")).toBeInTheDocument()
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0)
    expect(screen.getByText("帳號類型")).toBeInTheDocument()
    expect(screen.getByText("LINE 用戶")).toBeInTheDocument()
    expect(screen.getByText("登入方式")).toBeInTheDocument()
    expect(screen.getByText("LINE 帳號")).toBeInTheDocument()
    expect(screen.queryByText("點擊更換頭像")).not.toBeInTheDocument()
    expect(screen.queryByTestId("profile-avatar")).not.toBeInTheDocument()
  })

  it("renders the LINE image when present", () => {
    renderView({ image: "https://x/e.png" })
    expect(document.querySelector('img[src="https://x/e.png"]')).toBeInTheDocument()
  })

  it("renders the name initial in the lake brand colour when there is no image", () => {
    renderView()
    const initial = screen.getByText("E", { exact: true })
    expect(initial).toBeInTheDocument()
    expect(initial).toHaveClass("bg-v2-lake")
    expect(initial).toHaveClass("text-v2-on-lake")
  })

  it("asks for logout confirmation then logs out", () => {
    const props = renderView({ logoutOpen: true })
    fireEvent.click(screen.getByTestId("logout-confirm-button"))
    expect(props.onLogout).toHaveBeenCalled()
  })

  it("opens the logout confirmation", () => {
    const props = renderView()
    fireEvent.click(screen.getByTestId("profile-logout"))
    expect(props.onLogoutOpenChange).toHaveBeenCalledWith(true)
  })
})

describe("ProfileV2 container", () => {
  beforeEach(() => {
    mockUseLiff.mockReset().mockReturnValue({
      user: { id: "u1", name: "Emma", image: null },
      logout: vi.fn(),
    })
  })

  it("renders the profile page", () => {
    render(<ProfileV2 />)
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0)
  })
})
