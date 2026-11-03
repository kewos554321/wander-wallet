import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PersonalItemsEditor } from "@/app/demo/expense-prototype/split-detail/personal-items-editor"

const baseProps = {
  currency: "JPY",
  onAdd: vi.fn(),
  onName: vi.fn(),
  onAmount: vi.fn(),
  onRemove: vi.fn(),
  onLimitNote: vi.fn(),
}

describe("PersonalItemsEditor", () => {
  it("shows the empty state and a single add action", () => {
    const onAdd = vi.fn()
    render(<PersonalItemsEditor {...baseProps} items={[]} onAdd={onAdd} />)
    expect(screen.getByText("尚未新增品項")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it("does not mark a blank placeholder as an error", () => {
    render(<PersonalItemsEditor {...baseProps} items={[{ id: "i1", name: "", amount: "" }]} />)
    expect(screen.queryByText(/請填寫/)).not.toBeInTheDocument()
    expect(screen.getByLabelText("品項名稱 1")).not.toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("品項金額 1")).not.toHaveAttribute("aria-invalid", "true")
  })

  it("marks a name-only row as missing the amount", () => {
    render(<PersonalItemsEditor {...baseProps} items={[{ id: "i1", name: "咖啡", amount: "" }]} />)
    expect(screen.getByText("請填寫金額")).toBeInTheDocument()
    expect(screen.getByLabelText("品項金額 1")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("品項名稱 1")).not.toHaveAttribute("aria-invalid", "true")
  })

  it("clears the error when the row becomes complete", () => {
    render(<PersonalItemsEditor {...baseProps} items={[{ id: "i1", name: "咖啡", amount: "120" }]} />)
    expect(screen.queryByText(/請填寫/)).not.toBeInTheDocument()
  })

  it("forwards edits and sanitizes the amount for the currency", () => {
    const onName = vi.fn()
    const onAmount = vi.fn()
    const onRemove = vi.fn()
    render(
      <PersonalItemsEditor
        {...baseProps}
        items={[{ id: "i1", name: "咖啡", amount: "120" }]}
        onName={onName}
        onAmount={onAmount}
        onRemove={onRemove}
      />,
    )
    fireEvent.change(screen.getByLabelText("品項名稱 1"), { target: { value: "拿鐵" } })
    expect(onName).toHaveBeenCalledWith("i1", "拿鐵")
    fireEvent.change(screen.getByLabelText("品項金額 1"), { target: { value: "12.3" } })
    expect(onAmount).toHaveBeenCalledWith("i1", "12")
    fireEvent.click(screen.getByRole("button", { name: "刪除項目" }))
    expect(onRemove).toHaveBeenCalledWith("i1")
  })

  it("reports and links the currency limit when the amount is clamped", () => {
    const onLimitNote = vi.fn()
    render(
      <PersonalItemsEditor
        {...baseProps}
        items={[{ id: "i1", name: "咖啡", amount: "120" }]}
        onLimitNote={onLimitNote}
        limitNoteId="item-limit-note"
      />,
    )
    const input = screen.getByLabelText("品項金額 1")
    fireEvent.change(input, { target: { value: "999999999" } })
    expect(onLimitNote).toHaveBeenLastCalledWith(expect.stringContaining("上限"))
    expect(input).toHaveAttribute("aria-describedby", "item-limit-note")
    expect(input).toHaveAttribute("aria-invalid", "true")
  })
})
