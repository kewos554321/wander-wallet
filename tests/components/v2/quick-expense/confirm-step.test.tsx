import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => <div data-testid="image-picker" /> }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: ({ value }: { value: string }) => <div data-testid="currency">{value}</div> }))

import { ConfirmStep } from "@/components/v2/quick-expense/confirm-step"
import { fromParsed, type QuickItem } from "@/lib/quick-expense/draft"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }, { id: "c", displayName: "阿凱" }]
const items: QuickItem[] = fromParsed([
  { id: "1", amount: 60, description: "早餐", category: "food", currency: "TWD", payerId: "a", participantIds: ["a", "b", "c"], selected: true },
  { id: "2", amount: 150, description: "計程車", category: "transport", currency: "TWD", payerId: "b", participantIds: ["a", "b"], selected: true },
])
const many = (n: number): QuickItem[] =>
  fromParsed(
    Array.from({ length: n }, (_, i) => ({
      id: String(i + 1),
      amount: 10 * (i + 1),
      description: `d${i + 1}`,
      category: "food",
      currency: "TWD",
      payerId: "a",
      participantIds: ["a", "b"],
      selected: true,
    }))
  )

const setup = (o: Partial<Parameters<typeof ConfirmStep>[0]> = {}) => {
  const p = { items, members, index: 0, onIndexChange: vi.fn(), onItemsChange: vi.fn(), onReinput: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), canNotifyLine: true, notifyLine: true, onNotifyLineChange: vi.fn(), error: null, ...o }
  render(<ConfirmStep {...p} />)
  return p
}

describe("ConfirmStep", () => {
  it("shows position label, progress dots, split title, total card and submit label", () => {
    setup()
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "第 1 筆" })).toHaveClass("w-6", "bg-v2-lake")
    expect(screen.getByRole("button", { name: "第 1 筆" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "第 2 筆" })).toHaveClass("w-2", "bg-v2-line")
    expect(screen.getByText("幫誰付？（3 人均分 · 每人 20）")).toBeInTheDocument()
    expect(screen.getByText("共 2 筆")).toBeInTheDocument()
    expect(screen.getByText("TWD 210")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新增 2 筆" })).toBeInTheDocument()
  })

  it("navigates between cards with the progress dots", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "第 2 筆" }))
    expect(p.onIndexChange).toHaveBeenCalledWith(1)
  })

  it("renders a single-item batch", () => {
    setup({ items: [items[0]] })
    expect(screen.getByText("1 / 1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "第 1 筆" })).toHaveClass("w-6", "bg-v2-lake")
    expect(screen.getByText("← 左右滑動切換這一批的 1 筆支出 →")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新增 1 筆" })).toBeInTheDocument()
  })

  it("renders a many-item batch with one dot and hint per item", () => {
    setup({ items: many(5) })
    expect(screen.getByText("1 / 5")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /第 \d+ 筆/ })).toHaveLength(5)
    expect(screen.getByText("← 左右滑動切換這一批的 5 筆支出 →")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "第 5 筆" })).toHaveClass("w-2", "bg-v2-line")
  })

  it("edits amount keeping partial input and rejecting letters", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12." } })
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], amount: "12." }, items[1]])
    vi.mocked(p.onItemsChange).mockClear()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12a" } })
    expect(p.onItemsChange).not.toHaveBeenCalled()
  })

  it("applies the in-card calculator result to the amount", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    fireEvent.click(screen.getByRole("button", { name: "C" }))
    fireEvent.click(screen.getByRole("button", { name: "7" }))
    fireEvent.click(screen.getByRole("button", { name: "✓" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], amount: "7" }, items[1]])
    expect(screen.getByLabelText("金額")).toBeInTheDocument()
  })

  it("changes payer and participants", () => {
    const p = setup()
    fireEvent.click(within(screen.getByRole("group", { name: "付款人" })).getByRole("radio", { name: "志明" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], payerId: "b" }, items[1]])
    fireEvent.click(within(screen.getByRole("group", { name: "分攤成員" })).getByRole("button", { name: "阿凱" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], participantIds: ["a", "b"] }, items[1]])
    fireEvent.click(screen.getByRole("button", { name: "取消全選" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], participantIds: [] }, items[1]])
  })

  it("removes the current item from the top-right pill and moves the index back when needed", () => {
    const p = setup({ index: 1 })
    expect(screen.getAllByRole("button", { name: "刪除此筆" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([items[0]])
    expect(p.onIndexChange).toHaveBeenLastCalledWith(0)
  })

  it("submits with the LINE toggle prop value, reports toggle changes, reinputs, and shows errors", () => {
    const p = setup({ error: "第 1 筆請選擇付款成員", notifyLine: false })
    expect(screen.getByRole("alert")).toHaveTextContent("第 1 筆請選擇付款成員")
    expect(screen.getByRole("checkbox", { name: /通知 LINE 群組/ })).not.toBeChecked()
    fireEvent.click(screen.getByRole("checkbox", { name: /通知 LINE 群組/ }))
    expect(p.onNotifyLineChange).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    expect(p.onSubmit).toHaveBeenCalledWith(false)
    fireEvent.click(screen.getByRole("button", { name: "重新輸入" }))
    expect(p.onReinput).toHaveBeenCalled()
  })

  it("hides the LINE toggle when notifications are unavailable and lists each currency", () => {
    setup({ canNotifyLine: false, items: [items[0], { ...items[1], currency: "JPY", amount: "500" }] })
    expect(screen.queryByRole("checkbox", { name: /通知 LINE 群組/ })).toBeNull()
    expect(screen.getByText("TWD 60 · JPY 500")).toBeInTheDocument()
  })

  it("returns null when the index no longer points at an item", () => {
    const p = { items, members, index: 9, onIndexChange: vi.fn(), onItemsChange: vi.fn(), onReinput: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), canNotifyLine: false, notifyLine: false, onNotifyLineChange: vi.fn(), error: null }
    const { container } = render(<ConfirmStep {...p} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("swipes left to the next card", () => {
    const p = setup({ index: 0 })
    const surface = screen.getByLabelText("金額").closest("div.mt-2")!
    fireEvent.touchStart(surface, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 100 }] })
    expect(p.onIndexChange).toHaveBeenLastCalledWith(1)
  })

  it("swipes right to the previous card", () => {
    const p = setup({ index: 1 })
    const surface = screen.getByLabelText("金額").closest("div.mt-2")!
    fireEvent.touchStart(surface, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 200 }] })
    expect(p.onIndexChange).toHaveBeenLastCalledWith(0)
  })

  it("ignores short drags and touch-end without a matching touch-start", () => {
    const p = setup({ index: 0 })
    const surface = screen.getByLabelText("金額").closest("div.mt-2")!
    fireEvent.touchStart(surface, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 130 }] })
    expect(p.onIndexChange).not.toHaveBeenCalled()
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 10 }] })
    expect(p.onIndexChange).not.toHaveBeenCalled()
  })
})
