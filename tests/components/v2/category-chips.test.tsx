import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryChips } from "@/components/v2/ui/category-chips"

const items = [
  { key: "food", label: "餐飲", emoji: "🍜", count: 4 },
  { key: "stay", label: "住宿", emoji: "🏨", count: 2 },
]

describe("CategoryChips", () => {
  it("renders 全部 + items with counts", () => {
    render(<CategoryChips items={items} totalCount={6} selected={null} onSelect={vi.fn()} />)
    expect(screen.getByTestId("category-chip-all")).toHaveTextContent("全部 6")
    expect(screen.getByTestId("category-chip-all").className).toContain("bg-v2-lake")
    expect(screen.getByTestId("category-chip-food")).toHaveTextContent("餐飲 4")
    expect(screen.getByTestId("category-chip-food").className).toContain("border-v2-line")
  })

  it("calls onSelect on click and reflects the active chip", () => {
    const onSelect = vi.fn()
    render(<CategoryChips items={items} totalCount={6} selected="food" onSelect={onSelect} />)
    expect(screen.getByTestId("category-chip-food").className).toContain("bg-v2-lake")
    expect(screen.getByTestId("category-chip-all").className).toContain("border-v2-line")
    fireEvent.click(screen.getByTestId("category-chip-food"))
    expect(onSelect).toHaveBeenCalledWith("food")
    fireEvent.click(screen.getByTestId("category-chip-all"))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
