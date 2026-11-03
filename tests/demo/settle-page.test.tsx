import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/ads/ad-container", () => ({ AdContainer: () => null }))
import DemoSettlePage from "@/app/demo/settle/page"

describe("demo settle page", () => {
  it("renders the settlement summary", () => {
    render(<DemoSettlePage />)
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("48,600")).toBeInTheDocument()
  })
})
