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
  })

  it("shows the user's name and no appearance section", () => {
    render(<GeneralSettingsV2 />)
    expect(screen.getByText("Emma")).toBeInTheDocument()
    expect(screen.queryByText("外觀")).not.toBeInTheDocument()
    expect(screen.queryByText("深色")).not.toBeInTheDocument()
  })

  it("toggles the delete-expense notification off", () => {
    render(<GeneralSettingsV2 />)
    fireEvent.click(screen.getByRole("switch", { name: "刪除支出時通知" }))
    expect(mockSave).toHaveBeenCalledWith({ notifications: { expenseDeleted: false } })
  })

  it("switches the default split mode to custom", () => {
    render(<GeneralSettingsV2 />)
    fireEvent.click(screen.getByRole("button", { name: "自訂金額" }))
    expect(mockSave).toHaveBeenCalledWith({ defaultSplitMode: "custom" })
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
