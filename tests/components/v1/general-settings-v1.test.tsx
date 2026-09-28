import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/settings",
}))

vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="預設幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

const mockSetTheme = vi.fn()
vi.mock("@/components/system/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}))

const mockResetOnboarding = vi.fn()
vi.mock("@/lib/hooks", () => ({
  useOnboarding: () => ({ resetOnboarding: mockResetOnboarding }),
}))

const mockToggle = vi.fn()
let betaEnabled = false
vi.mock("@/lib/hooks/use-beta-toggle", () => ({
  useBetaToggle: () => ({ enabled: betaEnabled, toggle: mockToggle, saving: false, error: null }),
}))

const mockAuthFetch = vi.fn()
let mockUser: { name: string; image?: string; preferences: Record<string, unknown> } = {
  name: "Emma",
  preferences: { uiVersion: "v2", defaultCurrency: "TWD" },
}
const mockUpdatePreferences = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: mockUser, updatePreferences: mockUpdatePreferences }),
  useAuthFetch: () => mockAuthFetch,
}))

import { GeneralSettingsV1 } from "@/components/v1/settings/general-settings-v1"

describe("GeneralSettingsV1", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockSetTheme.mockReset()
    mockResetOnboarding.mockReset().mockResolvedValue(undefined)
    mockToggle.mockReset()
    betaEnabled = false
    mockAuthFetch.mockReset().mockResolvedValue({ ok: true })
    mockUpdatePreferences.mockReset()
    mockUser = { name: "Emma", preferences: { uiVersion: "v2", defaultCurrency: "TWD" } }
  })

  it("shows the user's name", () => {
    render(<GeneralSettingsV1 />)
    expect(screen.getByText("Emma")).toBeInTheDocument()
  })

  it("keeps uiVersion when changing the default currency", async () => {
    render(<GeneralSettingsV1 />)
    fireEvent.click(screen.getByRole("button", { name: /記帳偏好/ }))
    fireEvent.change(screen.getByLabelText("預設幣別"), { target: { value: "JPY" } })

    await waitFor(() => expect(mockAuthFetch).toHaveBeenCalled())
    const [, options] = mockAuthFetch.mock.calls[0]
    const body = JSON.parse(options.body as string)
    expect(body.preferences.uiVersion).toBe("v2")
    expect(body.preferences.defaultCurrency).toBe("JPY")
  })

  it("shows the beta switch unchecked and toggles it on click", () => {
    render(<GeneralSettingsV1 />)
    const checkbox = screen.getByRole("checkbox", { name: /試用新版介面/ })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(mockToggle).toHaveBeenCalledWith(true)
  })
})
