import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: ({ value }: { value: string }) => <div data-testid="currency">{value}</div> }))

import { ConfirmStep } from "@/components/v2/quick-expense/confirm-step"
import { parsedToQuickItems, type QuickItem } from "@/lib/quick-expense/draft"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }, { id: "c", displayName: "阿凱" }]
const items: QuickItem[] = parsedToQuickItems([
  { id: "1", amount: 60, description: "早餐", category: "food", currency: "TWD", payers: [{ memberId: "a", amount: 60 }], participantIds: ["a", "b", "c"], selected: true },
  { id: "2", amount: 150, description: "計程車", category: "transport", currency: "TWD", payers: [{ memberId: "b", amount: 150 }], participantIds: ["a", "b"], selected: true },
])
const many = (n: number): QuickItem[] =>
  parsedToQuickItems(
    Array.from({ length: n }, (_, i) => ({
      id: String(i + 1),
      amount: 10 * (i + 1),
      description: `d${i + 1}`,
      category: "food",
      currency: "TWD",
      payers: [{ memberId: "a", amount: 10 * (i + 1) }],
      participantIds: ["a", "b"],
      selected: true,
    }))
  )

const setup = (o: Partial<Parameters<typeof ConfirmStep>[0]> = {}) => {
  const p = { items, members, index: 0, onIndexChange: vi.fn(), onItemChange: vi.fn(), onRemoveItem: vi.fn(), onReinput: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), canNotifyLine: true, notifyLine: true, onNotifyLineChange: vi.fn(), error: null, ...o }
  render(<ConfirmStep {...p} />)
  const patchFromLastChange = () => {
    const [index, updater] = vi.mocked(p.onItemChange).mock.calls.at(-1) ?? []
    return updater ? { index, patch: (updater as (state: QuickItem) => QuickItem)(items[index as number]) } : null
  }
  return { ...p, patchFromLastChange }
}

const card = (name: string | RegExp) => screen.getByText(name).closest("div.rounded-2xl") as HTMLElement

describe("ConfirmStep", () => {
  it("shows the result-page title", () => {
    setup()
    expect(screen.getByRole("heading", { name: "AI 辨識結果" })).toBeInTheDocument()
  })

  it("shows position label, progress dots, the shared split panel, total card and submit label", () => {
    setup()
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "第 1 筆" })).toHaveClass("w-6", "bg-v2-lake")
    expect(screen.getByRole("button", { name: "第 1 筆" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "第 2 筆" })).toHaveClass("w-2", "bg-v2-line")
    expect(screen.getByText("誰付這筆")).toBeInTheDocument()
    expect(screen.getByText(/誰一起分/)).toBeInTheDocument()
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

  it("edits the amount through the item updater and strips invalid input", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12." } })
    expect(p.patchFromLastChange()).toMatchObject({ index: 0, patch: { amount: "12" } })
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12a" } })
    expect(p.patchFromLastChange()).toMatchObject({ index: 0, patch: { amount: "12" } })
  })

  it("applies the in-card calculator result to the amount", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    fireEvent.click(screen.getByRole("button", { name: "C" }))
    fireEvent.click(screen.getByRole("button", { name: "7" }))
    fireEvent.click(screen.getByRole("button", { name: "✓" }))
    expect(p.patchFromLastChange()).toMatchObject({ index: 0, patch: { amount: "7" } })
    expect(screen.getByLabelText("金額")).toBeInTheDocument()
  })

  it("changes payer and participants through the shared split panel", () => {
    const p = setup()
    fireEvent.click(within(card("誰付這筆")).getByRole("button", { name: /志明/ }))
    expect(p.patchFromLastChange()?.patch).toMatchObject({ payerIds: ["a", "b"], pinnedPayerAmounts: {} })
    fireEvent.click(within(card(/誰一起分/)).getByRole("button", { name: /^阿凱$/ }))
    expect(p.patchFromLastChange()?.patch.pool).toEqual(["a", "b"])
  })

  it("removes the current item from the top-right pill and moves the index back when needed", () => {
    const p = setup({ index: 1 })
    expect(screen.getAllByRole("button", { name: "刪除此筆" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(p.onRemoveItem).toHaveBeenLastCalledWith(1)
    expect(p.onIndexChange).toHaveBeenLastCalledWith(0)
  })

  it("deletes the first item without moving the index", () => {
    const p = setup({ index: 0 })
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(p.onRemoveItem).toHaveBeenLastCalledWith(0)
    expect(p.onIndexChange).not.toHaveBeenCalled()
  })

  it("deletes a middle item without moving the index", () => {
    const p = setup({ items: many(3), index: 1 })
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(p.onRemoveItem).toHaveBeenLastCalledWith(1)
    expect(p.onIndexChange).not.toHaveBeenCalled()
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

  it("blocks submit and explains the empty description", () => {
    setup({ items: [{ ...items[0], description: "" }] })
    expect(screen.getByRole("button", { name: "新增 1 筆" })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("請填寫描述，讓大家知道這筆是什麼")
  })

  it("shows the shared amount error and disables submit", () => {
    setup({ items: [{ ...items[0], amount: "0" }] })
    expect(screen.getByRole("alert")).toHaveTextContent("金額必須大於 0")
    expect(screen.getByRole("button", { name: "新增 1 筆" })).toBeDisabled()
  })

  it("shows the display-currency toggle for a foreign item", () => {
    setup({
      items: [{ ...items[0], currency: "JPY" }],
      projectCurrency: "TWD",
      previewRateInfo: () => ({ rate: 0.21, source: "live" as const }),
    })
    const group = screen.getByRole("group", { name: "顯示幣別" })
    expect(within(group).getByRole("button", { name: "JPY" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(within(group).getByRole("button", { name: "TWD" }))
    expect(within(group).getByRole("button", { name: "TWD" })).toHaveAttribute("aria-pressed", "true")
  })

  it("hides the LINE toggle when notifications are unavailable and lists each currency", () => {
    setup({ canNotifyLine: false, items: [items[0], { ...items[1], currency: "JPY", amount: "500" }] })
    expect(screen.queryByRole("checkbox", { name: /通知 LINE 群組/ })).toBeNull()
    expect(screen.getByText("TWD 60 · JPY 500")).toBeInTheDocument()
  })

  it("returns null when the index no longer points at an item", () => {
    const p = { items, members, index: 9, onIndexChange: vi.fn(), onItemChange: vi.fn(), onRemoveItem: vi.fn(), onReinput: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), canNotifyLine: false, notifyLine: false, onNotifyLineChange: vi.fn(), error: null }
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

  it("keeps the card when a vertical scroll drifts sideways past the threshold", () => {
    const p = setup({ index: 0 })
    const surface = screen.getByLabelText("金額").closest("div.mt-2")!
    fireEvent.touchStart(surface, { touches: [{ clientX: 200, clientY: 400 }] })
    fireEvent.touchMove(surface, { touches: [{ clientX: 140, clientY: 500 }] })
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 140, clientY: 500 }] })
    expect(p.onIndexChange).not.toHaveBeenCalled()
  })

  it("keeps the card when the gesture is more vertical than horizontal", () => {
    const p = setup({ index: 0 })
    const surface = screen.getByLabelText("金額").closest("div.mt-2")!
    fireEvent.touchStart(surface, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 140, clientY: 200 }] })
    expect(p.onIndexChange).not.toHaveBeenCalled()
  })

  it("switches cards on a deliberate horizontal swipe", () => {
    const p = setup({ index: 0 })
    const surface = screen.getByLabelText("金額").closest("div.mt-2")!
    fireEvent.touchStart(surface, { touches: [{ clientX: 220, clientY: 300 }] })
    fireEvent.touchMove(surface, { touches: [{ clientX: 180, clientY: 305 }] })
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 140, clientY: 308 }] })
    expect(p.onIndexChange).toHaveBeenLastCalledWith(1)
  })

  it("navigates with the previous/next buttons and disables them at the ends", () => {
    const p = setup({ index: 0 })
    expect(screen.getByRole("button", { name: "上一筆" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "下一筆" })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: "下一筆" }))
    expect(p.onIndexChange).toHaveBeenLastCalledWith(1)
  })

  it("disables the next button on the last item", () => {
    setup({ index: 1 })
    expect(screen.getByRole("button", { name: "下一筆" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "上一筆" })).toBeEnabled()
  })
})
