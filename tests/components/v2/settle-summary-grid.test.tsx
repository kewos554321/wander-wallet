import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { SettleSummaryGrid } from "@/components/v2/settle/settle-summary-grid"

describe("SettleSummaryGrid", () => {
  it("keeps 2 decimals for USD", () => {
    render(
      <SettleSummaryGrid count={1} total={31.72} dailyAverage={10.5} perPerson={15.86} currencyCode="USD" />,
    )
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("31.72")).toBeInTheDocument()
    expect(within(grid).getByText("10.50")).toBeInTheDocument()
    expect(within(grid).getByText("15.86")).toBeInTheDocument()
  })

  it("shows TWD without decimals", () => {
    render(
      <SettleSummaryGrid count={1} total={3172} dailyAverage={100} perPerson={1586} currencyCode="TWD" />,
    )
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("3,172")).toBeInTheDocument()
    expect(within(grid).getByText("1,586")).toBeInTheDocument()
  })
})
