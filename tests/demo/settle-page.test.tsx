import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
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

  it("opens the calculation dialog from the demo", () => {
    render(<DemoSettlePage />)
    fireEvent.click(screen.getByRole("button", { name: "計算說明" }))
    expect(screen.getByRole("heading", { name: "計算過程" })).toBeInTheDocument()
    expect(screen.getByText("支出明細（共 6 筆）")).toBeInTheDocument()
  })

  it("opens the share dialog with the transfer list", () => {
    render(<DemoSettlePage />)
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    expect(screen.getByText("分享結算結果")).toBeInTheDocument()
    const preview = screen.getByTestId("settle-share-preview").textContent
    expect(preview).toContain("1. 小婷 ➡️ 我：TWD 1,270")
    expect(preview).not.toContain("收款資訊")
  })
})
