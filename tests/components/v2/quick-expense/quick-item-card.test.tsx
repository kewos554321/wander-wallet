import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ selected, onSelect }: { selected?: Date; onSelect: (d?: Date) => void }) => (
    <div>
      <span data-testid="calendar-selected">{selected ? selected.toISOString() : ""}</span>
      <button type="button" onClick={() => onSelect(new Date("2026-03-05T12:00:00.000Z"))}>
        pick-day
      </button>
      <button type="button" onClick={() => onSelect(undefined)}>
        clear-day
      </button>
    </div>
  ),
}))
vi.mock("@/components/v2/expense-form/v2-image-picker", () => ({
  V2ImagePicker: ({ onChange }: { onChange: (file: File) => void }) => (
    <button
      type="button"
      onClick={() => onChange(new File(["x"], "receipt.jpg", { type: "image/jpeg" }))}
    >
      set-image
    </button>
  ),
}))
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({
  LocationPickerV2: ({
    value,
    onChange,
  }: {
    value: { location: string | null }
    onChange: (v: { location: string | null; latitude: number | null; longitude: number | null }) => void
  }) => (
    <button
      type="button"
      onClick={() => onChange({ location: "台北 101", latitude: 25.033, longitude: 121.5645 })}
    >
      set-location
    </button>
  ),
}))

import { QuickItemCard } from "@/components/v2/quick-expense/quick-item-card"
import { fromParsed, type QuickItem } from "@/lib/quick-expense/draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
  { id: "c", displayName: "阿凱" },
]

const item = (over: Partial<QuickItem> = {}): QuickItem => ({
  ...fromParsed([
    {
      id: "1",
      amount: 60,
      description: "早餐",
      category: "food",
      currency: "TWD",
      payers: [{ memberId: "a", amount: 60 }],
      participantIds: ["a", "b", "c"],
      selected: true,
    },
  ])[0],
  ...over,
})

const setup = (over: Partial<QuickItem> = {}) => {
  const p = { item: item(over), members, onChange: vi.fn() }
  const utils = render(<QuickItemCard {...p} />)
  return { ...p, ...utils }
}

describe("QuickItemCard", () => {
  it("shows the shared split and the participant pills", () => {
    setup({ amount: "60" })
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).queryByText(/剩餘/)).not.toBeInTheDocument()
    expect(within(split).getByText("（$60）")).toBeInTheDocument()
    expect(within(split).getByText("已選 3 人")).toBeInTheDocument()
    expect(within(split).getByText("金額相符")).toBeInTheDocument()
    expect(within(split).getByRole("button", { name: "小雨" })).toHaveAttribute("aria-pressed", "true")
    expect(within(split).getByRole("button", { name: "取消全選" })).toBeInTheDocument()
  })

  it("edits the description and currency", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "晚餐" } })
    expect(p.onChange).toHaveBeenLastCalledWith({ description: "晚餐" })
    fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "JPY" } })
    expect(p.onChange).toHaveBeenLastCalledWith({ currency: "JPY" })
  })

  it("edits the amount only when the money input is valid", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "88.5" } })
    expect(p.onChange).toHaveBeenLastCalledWith({ amount: "88.5" })
    vi.mocked(p.onChange).mockClear()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "8a" } })
    expect(p.onChange).not.toHaveBeenCalled()
  })

  it("applies the in-card calculator result and closes it", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    expect(screen.getByTestId("calc-display")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "C" }))
    fireEvent.click(screen.getByRole("button", { name: "9" }))
    fireEvent.click(screen.getByRole("button", { name: "✓" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ amount: "9" })
    expect(screen.queryByTestId("calc-display")).not.toBeInTheDocument()
  })

  it("changes the category", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ category: "transport" })
  })

  it("adds and removes payers", () => {
    const p = setup()
    const payer = screen.getByRole("group", { name: "付款成員" })
    fireEvent.click(within(payer).getByRole("checkbox", { name: "志明" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ payerIds: ["a", "b"], pinnedPayerAmounts: {} })
    fireEvent.click(within(payer).getByRole("checkbox", { name: "小雨" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ payerIds: [], pinnedPayerAmounts: {} })
  })

  it("edits and clears an individual payer amount", () => {
    const p = setup({ amount: "1280", payerIds: ["a", "b"] })
    const payer = screen.getByRole("group", { name: "付款成員" })
    fireEvent.change(within(payer).getByLabelText("小雨的付款金額"), { target: { value: "800" } })
    expect(p.onChange).toHaveBeenLastCalledWith({ pinnedPayerAmounts: { a: "800" } })
    fireEvent.change(within(payer).getByLabelText("小雨的付款金額"), { target: { value: "" } })
    expect(p.onChange).toHaveBeenLastCalledWith({ pinnedPayerAmounts: {} })
  })

  it("selects all payers", () => {
    const p = setup({ payerIds: ["a"] })
    fireEvent.click(within(screen.getByRole("group", { name: "付款成員" })).getByRole("button", { name: "全選" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ payerIds: ["a", "b", "c"], pinnedPayerAmounts: {} })
  })

  it("adds and removes individual participants", () => {
    const p = setup({ participantIds: ["a"] })
    const split = screen.getByRole("region", { name: "分攤成員" })
    fireEvent.click(within(split).getByRole("button", { name: "志明" }))
    expect(p.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ participantIds: ["a", "b"] }))
    vi.mocked(p.onChange).mockClear()
    fireEvent.click(within(split).getByRole("button", { name: "小雨" }))
    expect(p.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ participantIds: [] }))
  })

  it("edits the split with the personal-items switch like the expense form", () => {
    const p = setup({ participantIds: ["a", "b"] })
    const split = screen.getByRole("region", { name: "分攤成員" })
    fireEvent.click(within(split).getByRole("switch", { name: "先扣個人項目" }))
    expect(p.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ personalMode: true }))
  })

  it("selects all participants when not everyone is selected", () => {
    const p = setup({ participantIds: ["a"] })
    const split = screen.getByRole("region", { name: "分攤成員" })
    fireEvent.click(within(split).getByRole("button", { name: "全選" }))
    expect(p.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ participantIds: ["a", "b", "c"] }))
  })

  it("clears the selection when everyone is selected", () => {
    const p = setup()
    const split = screen.getByRole("region", { name: "分攤成員" })
    fireEvent.click(within(split).getByRole("button", { name: "取消全選" }))
    expect(p.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ participantIds: [] }))
  })

  it("writes the picked expense date back", () => {
    const p = setup()
    expect(screen.getByTestId("calendar-selected")).toHaveTextContent(new Date(p.item.expenseDate).toISOString())
    fireEvent.click(screen.getByRole("button", { name: "pick-day" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ expenseDate: new Date("2026-03-05T12:00:00.000Z") })
  })

  it("ignores an empty calendar selection", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "clear-day" }))
    expect(p.onChange).not.toHaveBeenCalled()
  })

  it("writes the picked location and image back", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "set-location" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ location: "台北 101", latitude: 25.033, longitude: 121.5645 })
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
    fireEvent.click(screen.getByRole("button", { name: "set-image" }))
    const patch = vi.mocked(p.onChange).mock.calls.at(-1)?.[0] as {
      image: { image: string | null; pendingFile: File | null; preview: string | null }
    }
    expect(patch.image.image).toBeNull()
    expect(patch.image.pendingFile).toBeInstanceOf(File)
    expect(patch.image.preview).toBe("blob:preview")
    createObjectURL.mockRestore()
  })

  it("renders the member image in the payer option when present", () => {
    const withImage = [
      { id: "a", displayName: "小雨", image: "https://cdn.example/xiaoyu.jpg" },
      { id: "b", displayName: "志明", image: null },
      { id: "c", displayName: "阿凱", image: null },
    ]
    render(<QuickItemCard item={item()} members={withImage} onChange={vi.fn()} />)
    const payer = screen.getByRole("group", { name: "付款成員" })
    const checkbox = within(payer).getByRole("checkbox", { name: "小雨" })
    expect(checkbox.closest("label")!.querySelector('img[src="https://cdn.example/xiaoyu.jpg"]')).toBeInTheDocument()
  })
})
