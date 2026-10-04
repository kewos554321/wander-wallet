import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"

/** Exact token match — `className.includes("text-v2-coral")` would also match the
 * longer `text-v2-coral-deep`, so classList.contains is used to assert whole tokens. */
function hasClass(el: HTMLElement, token: string) {
  return el.classList.contains(token)
}

function setup(value = "") {
  const onChange = vi.fn()
  render(<CategoryPicker value={value} onChange={onChange} />)
  return { onChange }
}

describe("CategoryPicker identity state", () => {
  it("unchecked 餐飲 uses the line border, the coral-deep identity tone and semibold weight", () => {
    setup()
    const food = screen.getByRole("button", { name: "餐飲" })
    expect(hasClass(food, "border-v2-line")).toBe(true)
    expect(hasClass(food, "bg-v2-coral-soft")).toBe(true)
    expect(hasClass(food, "text-v2-coral-deep")).toBe(true)
    expect(hasClass(food, "text-v2-coral")).toBe(false)
    expect(hasClass(food, "font-semibold")).toBe(true)
    expect(hasClass(food, "font-bold")).toBe(false)
  })

  it("checked 交通 uses the lake identity tone plus the lake-mid border and bold weight", () => {
    setup("transport")
    const transport = screen.getByRole("button", { name: "交通" })
    expect(hasClass(transport, "border-v2-lake-mid")).toBe(true)
    expect(hasClass(transport, "bg-v2-lake-soft")).toBe(true)
    expect(hasClass(transport, "text-v2-lake-mid")).toBe(true)
    expect(hasClass(transport, "font-bold")).toBe(true)
    expect(hasClass(transport, "font-semibold")).toBe(false)
  })

  it("checked 餐飲 uses the coral-deep identity border and text", () => {
    setup("food")
    const food = screen.getByRole("button", { name: "餐飲" })
    expect(hasClass(food, "border-v2-coral-deep")).toBe(true)
    expect(hasClass(food, "bg-v2-coral-soft")).toBe(true)
    expect(hasClass(food, "text-v2-coral-deep")).toBe(true)
    expect(hasClass(food, "text-v2-coral")).toBe(false)
    expect(hasClass(food, "font-bold")).toBe(true)
  })

  it("unchecked 餐飲 keeps the coral-deep identity tone when another category is checked", () => {
    setup("transport")
    const food = screen.getByRole("button", { name: "餐飲" })
    expect(hasClass(food, "border-v2-line")).toBe(true)
    expect(hasClass(food, "bg-v2-coral-soft")).toBe(true)
    expect(hasClass(food, "text-v2-coral-deep")).toBe(true)
    expect(hasClass(food, "text-v2-coral")).toBe(false)
    expect(hasClass(food, "font-semibold")).toBe(true)
  })

  it("unchecked 交通 keeps its lake identity tone (not lake-tint or bare coral)", () => {
    setup("food")
    const transport = screen.getByRole("button", { name: "交通" })
    expect(hasClass(transport, "border-v2-line")).toBe(true)
    expect(hasClass(transport, "bg-v2-lake-soft")).toBe(true)
    expect(hasClass(transport, "text-v2-lake-mid")).toBe(true)
    expect(hasClass(transport, "font-semibold")).toBe(true)
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
