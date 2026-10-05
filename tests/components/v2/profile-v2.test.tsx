import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/avatar-picker", () => ({
  AvatarPicker: () => null,
  AvatarDisplay: ({ avatarString }: { avatarString: string }) => <div data-testid="avatar-display">{avatarString}</div>,
  parseAvatarString: () => null,
  generateAvatarString: (icon: string, color: string) => `avatar:${icon}:${color}`,
}))

const mockUseLiff = vi.hoisted(() => vi.fn())
const mockAuthFetch = vi.hoisted(() => vi.fn())
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
  useAuthFetch: () => mockAuthFetch,
}))

import { ProfileV2 } from "@/components/v2/settings/profile-v2"

function renderView(overrides: Partial<Parameters<typeof ProfileV2View>[0]> = {}) {
  const props: Parameters<typeof ProfileV2View>[0] = {
    name: "Emma",
    image: null,
    avatarData: null,
    hasExternalImage: false,
    pickerOpen: false,
    saving: false,
    onOpenPicker: vi.fn(),
    onPickerOpenChange: vi.fn(),
    onSelectAvatar: vi.fn(),
    logoutOpen: false,
    onLogoutOpenChange: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  }
  render(<ProfileV2View {...props} />)
  return props
}

describe("ProfileV2View", () => {
  it("renders the profile header and info rows", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getByText("名稱")).toBeInTheDocument()
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0)
    expect(screen.getByText("帳號類型")).toBeInTheDocument()
    expect(screen.getByText("LINE 用戶")).toBeInTheDocument()
    expect(screen.getByText("登入方式")).toBeInTheDocument()
    expect(screen.getByText("LINE 帳號")).toBeInTheDocument()
    expect(screen.getByText("點擊更換頭像")).toBeInTheDocument()
  })

  it("opens the avatar picker", () => {
    const props = renderView()
    fireEvent.click(screen.getByTestId("profile-avatar"))
    expect(props.onOpenPicker).toHaveBeenCalled()
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
    mockUseLiff.mockReset().mockReturnValue({ user: { name: "Emma", image: null }, refreshSession: vi.fn(), logout: vi.fn() })
    mockAuthFetch.mockReset()
  })

  it("renders the profile page", () => {
    render(<ProfileV2 />)
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0)
  })
})
