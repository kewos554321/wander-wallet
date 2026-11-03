import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoExportPage from "@/app/demo/export/page"

describe("demo export page", () => {
  it("shows the project summary and export action", () => {
    render(<DemoExportPage />)
    expect(screen.getByText(/東京之旅/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /匯出/ })).toBeInTheDocument()
  })
})
