import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"

// CategoryPicker is a real consumer of the shared SECTION_CARD / SECTION_TITLE
// tokens. Rendering it verifies the tokens actually reach the DOM instead of
// asserting the exported constants against themselves.
describe("expense form section card", () => {
  it("wraps the category section in the shared card with the shared title", () => {
    render(<CategoryPicker value="" onChange={vi.fn()} />)

    const title = screen.getByText("類別")
    expect(title).toHaveClass("text-[13px]", "font-bold", "text-v2-lake")

    const card = title.parentElement as HTMLElement
    expect(card).toHaveClass("mx-4", "mb-4", "rounded-2xl", "border", "border-v2-line", "bg-v2-surface", "p-4")
  })

  it("toggles the selected category through onChange", () => {
    const onChange = vi.fn()
    const { rerender } = render(<CategoryPicker value="" onChange={onChange} />)

    const food = screen.getByRole("button", { name: "餐飲" })
    expect(food).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(food)
    expect(onChange).toHaveBeenLastCalledWith("food")

    rerender(<CategoryPicker value="food" onChange={onChange} />)
    const selected = screen.getByRole("button", { name: "餐飲" })
    expect(selected).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(selected)
    expect(onChange).toHaveBeenLastCalledWith("")
  })
})
