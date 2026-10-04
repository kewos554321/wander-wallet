import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"

function setup(value = "") {
  const onChange = vi.fn()
  render(<CategoryPicker value={value} onChange={onChange} />)
  return { onChange }
}

describe("CategoryPicker identity state", () => {
  it("unchecked pill uses the line border, the category identity tone and semibold weight", () => {
    setup()
    const food = screen.getByRole("button", { name: "餐飲" })
    expect(food.className).toContain("border-v2-line")
    expect(food.className).toContain("bg-v2-coral-soft")
    expect(food.className).toContain("text-v2-coral")
    expect(food.className).toContain("font-semibold")
    expect(food.className).not.toContain("font-bold")
  })

  it("checked 交通 uses the lake identity tone plus the lake-mid border and bold weight", () => {
    setup("transport")
    const transport = screen.getByRole("button", { name: "交通" })
    expect(transport.className).toContain("border-v2-lake-mid")
    expect(transport.className).toContain("bg-v2-lake-soft")
    expect(transport.className).toContain("text-v2-lake-mid")
    expect(transport.className).toContain("font-bold")
    expect(transport.className).not.toContain("font-semibold")
  })

  it("checked 餐飲 uses the coral-deep identity border and text", () => {
    setup("food")
    const food = screen.getByRole("button", { name: "餐飲" })
    expect(food.className).toContain("border-v2-coral-deep")
    expect(food.className).toContain("bg-v2-coral-soft")
    expect(food.className).toContain("text-v2-coral-deep")
    expect(food.className).toContain("font-bold")
  })

  it("unchecked categories keep their own CATEGORY_TONES identity tone (not lake)", () => {
    setup("transport")
    const food = screen.getByRole("button", { name: "餐飲" })
    expect(food.className).toContain("border-v2-line")
    expect(food.className).toContain("bg-v2-coral-soft")
    expect(food.className).toContain("text-v2-coral")
    expect(food.className).toContain("font-semibold")
  })

  it("toggling the checked category clears the selection", () => {
    const { onChange } = setup("transport")
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("selecting an unchecked category emits its key", () => {
    const { onChange } = setup("")
    fireEvent.click(screen.getByRole("button", { name: "餐飲" }))
    expect(onChange).toHaveBeenCalledWith("food")
  })
})
