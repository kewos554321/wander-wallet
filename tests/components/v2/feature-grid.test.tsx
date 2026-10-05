import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { FeatureGrid } from "@/components/v2/project/feature-grid"

const PRIMARY: [string, string][] = [
  ["結算", "settle"],
  ["成員", "members"],
  ["統計", "stats"],
  ["匯率", "currency"],
]

const SECONDARY: [string, string][] = [
  ["歷史", "activity-logs"],
  ["里程", "mileage"],
  ["匯出", "export"],
  ["筆記", "notes"],
  ["地圖", "map"],
  ["照片", "photos"],
]

describe("FeatureGrid", () => {
  it("renders the primary row of five actions with no settings tile or pager", () => {
    render(<FeatureGrid projectId="p1" />)
    const nav = screen.getByRole("navigation", { name: "功能" })
    for (const [label, path] of PRIMARY) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }
    expect(within(nav).getByRole("button", { name: "更多功能" })).toHaveAttribute("aria-expanded", "false")
    expect(within(nav).queryByRole("link", { name: "設定" })).not.toBeInTheDocument()
    expect(within(nav).queryByRole("button", { name: /跳到第/ })).not.toBeInTheDocument()
    for (const [label] of SECONDARY) {
      expect(within(nav).queryByRole("link", { name: label })).not.toBeInTheDocument()
    }
  })

  it("expands and collapses the secondary features", () => {
    render(<FeatureGrid projectId="p1" />)
    const nav = screen.getByRole("navigation", { name: "功能" })
    const more = within(nav).getByRole("button", { name: "更多功能" })

    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "true")
    for (const [label, path] of SECONDARY) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }

    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "false")
    for (const [label] of SECONDARY) {
      expect(within(nav).queryByRole("link", { name: label })).not.toBeInTheDocument()
    }
  })
})
