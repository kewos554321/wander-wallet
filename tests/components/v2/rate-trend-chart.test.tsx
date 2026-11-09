import { describe, it, expect, vi } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { RateTrendChart } from "@/components/v2/currency/rate-trend-chart"

function renderChart(overrides: Partial<ComponentProps<typeof RateTrendChart>> = {}) {
  const props: ComponentProps<typeof RateTrendChart> = {
    base: "JPY",
    quote: "TWD",
    range: 30,
    points: [
      { date: "2026-10-11", rate: 0.2 },
      { date: "2026-10-20", rate: 0.21 },
      { date: "2026-11-09", rate: 0.205 },
    ],
    loading: false,
    error: null,
    onRangeChange: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }
  render(<RateTrendChart {...props} />)
  return props
}

describe("RateTrendChart", () => {
  it("draws the pair and labels the range extremes", () => {
    renderChart()
    expect(screen.getByText("1 JPY → TWD")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /JPY 對 TWD 近 30 天趨勢/ })).toBeInTheDocument()
    expect(screen.getByText("10/11")).toBeInTheDocument()
    expect(screen.getByText("11/09")).toBeInTheDocument()
    expect(screen.getByText(/最低 0\.2/)).toBeInTheDocument()
    expect(screen.getByText(/最高 0\.21/)).toBeInTheDocument()
  })

  it("lets users inspect a point by dragging or with the keyboard", () => {
    renderChart()
    expect(screen.getByText("點一下圖表看某一天")).toBeInTheDocument()

    const scrubber = screen.getByTestId("trend-scrubber")
    fireEvent.keyDown(scrubber, { key: "End" })
    expect(screen.getByText("11/09 · 0.205 TWD")).toBeInTheDocument()

    fireEvent.keyDown(scrubber, { key: "ArrowLeft" })
    expect(screen.getByText("10/20 · 0.21 TWD")).toBeInTheDocument()

    fireEvent.keyDown(scrubber, { key: "Home" })
    expect(screen.getByText("10/11 · 0.2 TWD")).toBeInTheDocument()
  })

  it("reports range changes", () => {
    const props = renderChart()
    fireEvent.click(screen.getByRole("button", { name: "近 7 天" }))
    expect(props.onRangeChange).toHaveBeenCalledWith(7)
  })

  it("shows a retryable error", () => {
    const props = renderChart({ points: null, error: "查不到趨勢資料" })
    expect(screen.getByRole("status")).toHaveTextContent("查不到趨勢資料")
    fireEvent.click(screen.getByRole("button", { name: "重試" }))
    expect(props.onRetry).toHaveBeenCalled()
  })

  it("shows an empty state without points", () => {
    renderChart({ points: [] })
    expect(screen.getByText("這個區間沒有趨勢資料。")).toBeInTheDocument()
  })

  it("shows a loading skeleton", () => {
    renderChart({ points: null, loading: true })
    expect(screen.getByLabelText("正在載入趨勢")).toBeInTheDocument()
  })
})
