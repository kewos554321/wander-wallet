import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import SettleCalcDemoPage from "@/app/demo/settle-calc/page"

describe("demo settle calc page", () => {
  it("opens the calculation dialog immediately", () => {
    render(<SettleCalcDemoPage />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "計算過程" })).toBeInTheDocument()
  })

  it("shows only the final share for each participant", () => {
    render(<SettleCalcDemoPage />)
    expect(screen.getByText("支出明細（共 6 筆）")).toBeInTheDocument()
    const splits = screen.getAllByTestId("split-line").map((line) => line.textContent ?? "")
    expect(
      splits.some(
        (text) =>
          text.includes("TWD 3,650") &&
          text.includes("TWD 1,650") &&
          text.includes("阿明") &&
          text.includes("小婷")
      )
    ).toBe(true)
    expect(
      splits.some(
        (text) => text.includes("TWD 1,200") && text.includes("TWD 1,300") && text.includes("TWD 700")
      )
    ).toBe(true)
    expect(
      splits.some(
        (text) =>
          text.includes("TWD 1,000") &&
          text.includes("TWD 800") &&
          text.includes("TWD 500") &&
          text.includes("TWD 300")
      )
    ).toBe(true)
    expect(splits.some((text) => (text.match(/TWD 66/g) ?? []).length === 4)).toBe(true)
  })

  it("includes a wide balance row and its own horizontal scroller", () => {
    render(<SettleCalcDemoPage />)
    expect(screen.getByText("長金額測試")).toBeInTheDocument()
    expect(screen.getByTestId("balance-table-scroll").className).toContain("overflow-x-auto")
  })

  it("hides cards that have nothing to do with me when only-me is on", () => {
    render(<SettleCalcDemoPage />)
    expect(screen.getByText(/阿明的私人溫泉/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "只看我" }))
    expect(screen.getByText("支出明細（共 5 筆）")).toBeInTheDocument()
    expect(screen.queryByText(/阿明的私人溫泉/)).not.toBeInTheDocument()
  })
})
