import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="結算幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))
import DemoProjectSettingsPage from "@/app/demo/project-settings/page"

describe("demo project-settings page", () => {
  it("shows the project name field", () => {
    render(<DemoProjectSettingsPage />)
    expect(screen.getByLabelText("旅程名稱")).toHaveValue("東京之旅")
  })
})
