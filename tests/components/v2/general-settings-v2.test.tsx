import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { name: "Emma" } }),
}))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="預設幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

const mockSave = vi.fn()
let preferences = {
  defaultCurrency: "TWD",
  defaultSplitMode: "equal" as "equal" | "custom",
  notifications: { expenseCreated: true, expenseUpdated: true, expenseDeleted: true },
}
let currentError: string | null = null
vi.mock("@/lib/hooks/use-preferences", () => ({
  usePreferences: () => ({ preferences, save: mockSave, saving: false, error: currentError }),
}))

const mockResetOnboarding = vi.fn()
vi.mock("@/lib/hooks", () => ({
  useOnboarding: () => ({ resetOnboarding: mockResetOnboarding }),
}))

const mockToggle = vi.fn()
let betaEnabled = true
let betaSaving = false
let betaError: string | null = null
vi.mock("@/lib/hooks/use-beta-toggle", () => ({
  useBetaToggle: () => ({ enabled: betaEnabled, toggle: mockToggle, saving: betaSaving, error: betaError }),
}))

const mockSetTheme = vi.fn()
let currentTheme: "light" | "dark" | "system" = "light"
vi.mock("@/components/system/theme-provider", () => ({
  useTheme: () => ({ theme: currentTheme, setTheme: mockSetTheme }),
}))

import { GeneralSettingsV2 } from "@/components/v2/settings/general-settings-v2"

describe("GeneralSettingsV2", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockSave.mockReset()
    mockResetOnboarding.mockReset().mockResolvedValue(undefined)
    preferences = {
      defaultCurrency: "TWD",
      defaultSplitMode: "equal",
      notifications: { expenseCreated: true, expenseUpdated: true, expenseDeleted: true },
    }
    currentError = null
    mockToggle.mockReset()
    betaEnabled = true
    betaSaving = false
    betaError = null
    mockSetTheme.mockReset()
    currentTheme = "light"
  })

  it("shows the user's name", () => {
    render(<GeneralSettingsV2 />)
    expect(screen.getByText("Emma")).toBeInTheDocument()
  })

  it("shows the beta switch checked and toggles it off on click", () => {
    render(<GeneralSettingsV2 />)
    const sw = screen.getByRole("switch", { name: "試用新版介面（Beta）" })
    expect(sw).toHaveAttribute("aria-checked", "true")
    fireEvent.click(sw)
    expect(mockToggle).toHaveBeenCalledWith(false)
  })

  it("shows the beta toggle error in an alert", () => {
    betaError = "儲存失敗，請重試"
    render(<GeneralSettingsV2 />)
    expect(screen.getByRole("alert")).toHaveTextContent("儲存失敗，請重試")
  })

  it("switches appearance to dark and marks the active option", () => {
    currentTheme = "dark"
    render(<GeneralSettingsV2 />)
    expect(screen.getByRole("button", { name: "深色" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "淺色" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "淺色" }).querySelector("svg")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "淺色" }))
    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })

  it("no longer shows the default split mode control", () => {
    render(<GeneralSettingsV2 />)
    expect(screen.queryByText("預設分帳方式")).not.toBeInTheDocument()
  })

  it("shows the full default currency label", () => {
    render(<GeneralSettingsV2 />)
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
  })

  it("toggles the delete-expense notification off", () => {
    render(<GeneralSettingsV2 />)
    fireEvent.click(screen.getByRole("switch", { name: "刪除支出時通知" }))
    expect(mockSave).toHaveBeenCalledWith({ notifications: { expenseDeleted: false } })
  })

  it("navigates to the profile page from the profile card", () => {
    render(<GeneralSettingsV2 />)
    fireEvent.click(screen.getByLabelText("編輯個人資料"))
    expect(mockPush).toHaveBeenCalledWith("/settings/profile")
  })

  it("opens the LINE feedback link", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)
    render(<GeneralSettingsV2 />)
    fireEvent.click(screen.getByRole("button", { name: "意見回饋" }))
    expect(openSpy).toHaveBeenCalledWith("https://line.me/R/ti/p/@386mbqva", "_blank")
    openSpy.mockRestore()
  })

  it("resets the tour and navigates to /projects", async () => {
    render(<GeneralSettingsV2 />)
    fireEvent.click(screen.getByRole("button", { name: /重看導覽/ }))
    await waitFor(() => expect(mockResetOnboarding).toHaveBeenCalled())
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects"))
  })

  it("shows the preferences error in an alert", () => {
    currentError = "儲存失敗，請重試"
    render(<GeneralSettingsV2 />)
    expect(screen.getByRole("alert")).toHaveTextContent("儲存失敗，請重試")
  })
})
