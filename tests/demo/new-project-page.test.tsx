import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="結算幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))
import DemoNewProjectPage from "@/app/demo/new-project/page"

describe("demo new-project page", () => {
  it("renders the create form with demo values", () => {
    render(<DemoNewProjectPage />)
    expect(screen.getByLabelText("旅程名稱")).toHaveValue("東京之旅")
  })
})
