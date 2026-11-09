import { describe, it, expect } from "vitest"
import { categoryPinIconSvg } from "@/components/map/category-pin-icons"

describe("categoryPinIconSvg", () => {
  it("renders an inline lucide-style SVG for a category", () => {
    const svg = categoryPinIconSvg("food", { size: 20, color: "#ffffff" })
    expect(svg).toContain("<svg")
    expect(svg).toContain('width="20"')
    expect(svg).toContain('stroke="#ffffff"')
    expect(svg).toContain("<path")
    expect(svg).not.toContain("🍜")
  })

  it("falls back to the wallet glyph for unknown or missing categories", () => {
    expect(categoryPinIconSvg(null, { size: 16, color: "#000" })).toBe(
      categoryPinIconSvg("other", { size: 16, color: "#000" }),
    )
    expect(categoryPinIconSvg("not-a-category", { size: 16, color: "#000" })).toBe(
      categoryPinIconSvg("other", { size: 16, color: "#000" }),
    )
  })

  it("uses a different glyph per category", () => {
    const food = categoryPinIconSvg("food", { size: 20, color: "#000" })
    const transport = categoryPinIconSvg("transport", { size: 20, color: "#000" })
    expect(food).not.toBe(transport)
  })
})
