import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("@/components/location-picker", () => ({ LocationPicker: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => <div data-testid="image-picker" /> }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: ({ value }: { value: string }) => <div data-testid="currency">{value}</div> }))

import { ConfirmStep } from "@/components/v2/quick-expense/confirm-step"
import { fromParsed, type QuickItem } from "@/lib/quick-expense/draft"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }, { id: "c", displayName: "阿凱" }]
const items: QuickItem[] = fromParsed([
  { id: "1", amount: 60, description: "早餐", category: "food", currency: "TWD", payerId: "a", participantIds: ["a", "b", "c"], selected: true },
  { id: "2", amount: 150, description: "計程車", category: "transport", currency: "TWD", payerId: "b", participantIds: ["a", "b"], selected: true },
])

const setup = (o: Partial<Parameters<typeof ConfirmStep>[0]> = {}) => {
  const p = { items, members, index: 0, onIndexChange: vi.fn(), onItemsChange: vi.fn(), onReinput: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), canNotifyLine: true, error: null, ...o }
  render(<ConfirmStep {...p} />)
  return p
}

describe("ConfirmStep", () => {
  it("shows pager, split title, totals and submit label", () => {
    setup()
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByText("幫誰付？（3 人均分 · 每人 20）")).toBeInTheDocument()
    expect(screen.getByText("共 2 筆")).toBeInTheDocument()
    expect(screen.getByText("TWD 210")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新增 2 筆" })).toBeInTheDocument()
  })

  it("navigates between cards", () => {
    const p = setup()
    expect(screen.getByRole("button", { name: "上一筆" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "下一筆" }))
    expect(p.onIndexChange).toHaveBeenCalledWith(1)
  })

  it("edits amount keeping partial input and rejecting letters", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12." } })
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], amount: "12." }, items[1]])
    p.onItemsChange.mockClear()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12a" } })
    expect(p.onItemsChange).not.toHaveBeenCalled()
  })

  it("changes payer and participants", () => {
    const p = setup()
    fireEvent.click(within(screen.getByRole("group", { name: "付款成員" })).getByRole("button", { name: "志明" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], payerId: "b" }, items[1]])
    fireEvent.click(within(screen.getByRole("group", { name: "分攤成員" })).getByRole("button", { name: "阿凱" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], participantIds: ["a", "b"] }, items[1]])
    fireEvent.click(screen.getByRole("button", { name: "取消全選" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], participantIds: [] }, items[1]])
  })

  it("removes the current item and moves the index back when needed", () => {
    const p = setup({ index: 1 })
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([items[0]])
    expect(p.onIndexChange).toHaveBeenLastCalledWith(0)
  })

  it("submits with the LINE toggle value, reinputs, and shows errors", () => {
    const p = setup({ error: "第 1 筆請選擇付款成員" })
    expect(screen.getByRole("alert")).toHaveTextContent("第 1 筆請選擇付款成員")
    fireEvent.click(screen.getByRole("checkbox", { name: /通知 LINE 群組/ }))
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
})
