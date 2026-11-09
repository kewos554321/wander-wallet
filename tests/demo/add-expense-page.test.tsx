import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => null }))
vi.mock("@/lib/geolocation", () => ({ getCurrentLocation: () => Promise.resolve(null) }))
import DemoAddExpensePage from "@/app/demo/add-expense/page"

describe("demo add-expense page", () => {
  it("renders the real expense form view (submit carries the amount)", () => {
    render(<DemoAddExpensePage />)
    expect(screen.getByRole("heading", { name: "新增支出" })).toBeInTheDocument()
    // Only the real ExpenseFormV2View labels its submit button "新增支出 · <amount>".
    expect(screen.getByRole("button", { name: /新增支出 ·/ })).toBeInTheDocument()
  })
})
