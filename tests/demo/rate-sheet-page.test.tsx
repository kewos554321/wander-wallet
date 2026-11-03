import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
import DemoRateSheetPage from "@/app/demo/rate-sheet/page"

describe("demo rate-sheet page", () => {
  it("renders the real rate sheet dialog", () => {
    render(<DemoRateSheetPage />)
    expect(screen.getByRole("dialog", { name: "匯率" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "匯率" })).toBeInTheDocument()
  })
})
