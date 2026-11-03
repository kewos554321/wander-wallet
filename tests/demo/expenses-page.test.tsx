import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoExpensesPage from "@/app/demo/expenses/page"

describe("demo expenses page", () => {
  it("renders the list header and an expense", () => {
    render(<DemoExpensesPage />)
    expect(screen.getByRole("heading", { name: "全部支出" })).toBeInTheDocument()
    expect(screen.getByText("晚餐 · 拉麵")).toBeInTheDocument()
  })
  it("shows the shared fixture total, consistent with the overview", () => {
    render(<DemoExpensesPage />)
    expect(screen.getByText("TWD 48,600")).toBeInTheDocument()
  })
})
