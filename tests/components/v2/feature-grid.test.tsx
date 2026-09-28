import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { FeatureGrid } from "@/components/v2/project/feature-grid"

describe("FeatureGrid", () => {
  it("renders a page indicator with the first page active", () => {
    render(<FeatureGrid projectId="p1" />)
    const dots = screen.getAllByRole("button", { name: /跳到第 \d 頁/ })
    expect(dots).toHaveLength(2)
    expect(dots[0]).toHaveAttribute("aria-current", "true")
    expect(dots[1]).not.toHaveAttribute("aria-current")
  })

  it("scrolls to the page when a dot is clicked", () => {
    render(<FeatureGrid projectId="p1" />)
    const scroller = screen.getByTestId("v2-feature-scroller")
    Object.defineProperty(scroller, "offsetWidth", { value: 300 })
    const scrollTo = vi.fn()
    scroller.scrollTo = scrollTo
    fireEvent.click(screen.getByRole("button", { name: "跳到第 2 頁" }))
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "smooth" })
  })

  it("updates the active dot on scroll", () => {
    render(<FeatureGrid projectId="p1" />)
    const scroller = screen.getByTestId("v2-feature-scroller")
    Object.defineProperty(scroller, "offsetWidth", { value: 300 })
    Object.defineProperty(scroller, "scrollLeft", { value: 300, configurable: true })
    fireEvent.scroll(scroller)
    expect(screen.getByRole("button", { name: "跳到第 2 頁" })).toHaveAttribute("aria-current", "true")
  })
})
