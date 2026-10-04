import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"

// Independent oracle: the rendered labels/order we expect, rather than reading
// them back out of the same constants the component maps over.
const LABELS = ["餐飲", "交通", "住宿", "票券", "購物", "娛樂", "禮品", "其他"]

function setup(value = "") {
  const onChange = vi.fn()
  render(<CategoryPicker value={value} onChange={onChange} />)
  return { onChange }
}

describe("CategoryPicker", () => {
  it("renders every category as an unpressed toggle button by default", () => {
    setup()
    expect(screen.getAllByRole("button")).toHaveLength(LABELS.length)
    for (const label of LABELS) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false")
    }
  })

  it("marks only the selected category as pressed", () => {
    setup("transport")
    expect(screen.getByRole("button", { name: "交通" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "餐飲" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "住宿" })).toHaveAttribute("aria-pressed", "false")
  })

  it("moves the pressed state when the controlled value changes", () => {
    const onChange = vi.fn()
    const { rerender } = render(<CategoryPicker value="" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "餐飲" })).toHaveAttribute("aria-pressed", "false")

    rerender(<CategoryPicker value="food" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "餐飲" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "交通" })).toHaveAttribute("aria-pressed", "false")
    expect(onChange).not.toHaveBeenCalled()
  })

  it("selecting an unchecked category emits its key", () => {
    const { onChange } = setup("")
    fireEvent.click(screen.getByRole("button", { name: "餐飲" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("food")
  })

  it("toggling the checked category clears the selection", () => {
    const { onChange } = setup("transport")
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("switching category emits the new key", () => {
    const { onChange } = setup("transport")
    fireEvent.click(screen.getByRole("button", { name: "購物" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("shopping")
  })

  it("does not emit on mount", () => {
    const { onChange } = setup("food")
    expect(onChange).not.toHaveBeenCalled()
  })
})
