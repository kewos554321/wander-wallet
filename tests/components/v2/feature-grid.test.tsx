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

  it("follows the add-expense category colour order, cycling after 8", () => {
    render(<FeatureGrid projectId="p1" />)
    const nav = screen.getByRole("navigation", { name: "功能" })

    const ordered: [string, string, string][] = [
      // food, transport, accommodation, ticket
      ["成員", "bg-v2-coral-soft", "text-v2-coral-deep"],
      ["結算", "bg-v2-lake-soft", "text-v2-lake-mid"],
      ["統計", "bg-v2-plum-soft", "text-v2-plum"],
      ["匯率", "bg-v2-olive-soft", "text-v2-olive"],
      // shopping, entertainment, gift, other
      ["歷史", "bg-v2-rose-soft", "text-v2-rose"],
      ["里程", "bg-v2-sky-soft", "text-v2-sky"],
      ["匯出", "bg-v2-gold-soft", "text-v2-gold"],
      ["筆記", "bg-v2-sand", "text-v2-ink-muted"],
      // cycles back to food, transport
      ["地圖", "bg-v2-coral-soft", "text-v2-coral-deep"],
      ["照片", "bg-v2-lake-soft", "text-v2-lake-mid"],
    ]

    fireEvent.click(within(nav).getByRole("button", { name: "更多功能" }))

    for (const [label, bg, text] of ordered) {
      const circle = within(nav).getByRole("link", { name: label }).querySelector("span")
      expect(circle).not.toBeNull()
      expect(circle!.className).toContain(bg)
      expect(circle!.className).toContain(text)
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
