import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ShareAmountEditor } from "@/app/demo/expense-prototype/split-detail/share-amount-editor"

const baseProps = {
  currency: "JPY",
  value: "320",
  auto: 320,
  pinned: false,
  onChange: vi.fn(),
  onReset: vi.fn(),
}

describe("ShareAmountEditor", () => {
  it("shows the auto-split helper when not pinned", () => {
    render(<ShareAmountEditor {...baseProps} />)
    expect(screen.getByText("自動平分會是 $320")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /還原自動平分/ })).not.toBeInTheDocument()
  })

  it("shows the pinned copy and reset action when pinned", () => {
    const onReset = vi.fn()
    render(<ShareAmountEditor {...baseProps} pinned value="500" onReset={onReset} />)
    expect(screen.getByText(/目前是固定金額/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /還原自動平分/ }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it("sanitizes the input before onChange", () => {
    const onChange = vi.fn()
    render(<ShareAmountEditor {...baseProps} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/共同分攤金額/), { target: { value: "12.3" } })
    expect(onChange).toHaveBeenLastCalledWith("12")
  })

  it("announces the currency limit note when the amount is clamped", () => {
    render(<ShareAmountEditor {...baseProps} />)
    const input = screen.getByLabelText(/共同分攤金額/)
    fireEvent.change(input, { target: { value: "999999999" } })
    const note = screen.getByText(/上限/)
    expect(note).toHaveAttribute("role", "status")
    expect(note).toHaveAttribute("id", "share-limit-note")
    expect(input).toHaveAttribute("aria-describedby", "share-limit-note")
    expect(input).toHaveAttribute("aria-invalid", "true")
  })
})
