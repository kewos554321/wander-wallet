import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoOverviewPage from "@/app/demo/overview/page"

describe("demo overview page", () => {
  it("renders the trip overview", () => {
    render(<DemoOverviewPage />)
    expect(screen.getByRole("heading", { name: "旅程總覽" })).toBeInTheDocument()
    expect(screen.getByText("東京之旅")).toBeInTheDocument()
  })
})
