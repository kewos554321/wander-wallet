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
vi.mock("@/components/ui/image-picker", () => ({
  ImagePicker: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onChange({ image: "https://cdn.example/receipt.jpg", pendingFile: null, preview: null })}
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
      payerId: "a",
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
  it("shows the per-head split and the participant pills", () => {
    setup({ amount: "60" })
    expect(screen.getByText("幫誰付？（3 人均分 · 每人 20）")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "小雨" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "取消全選" })).toBeInTheDocument()
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

  it("changes the payer", () => {
    const p = setup()
    fireEvent.click(within(screen.getByRole("group", { name: "付款人" })).getByRole("radio", { name: "志明" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ payerId: "b" })
  })

  it("adds and removes individual participants", () => {
    const p = setup({ participantIds: ["a"] })
    fireEvent.click(screen.getByRole("button", { name: "志明" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ participantIds: ["a", "b"] })
    vi.mocked(p.onChange).mockClear()
    fireEvent.click(screen.getByRole("button", { name: "小雨" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ participantIds: [] })
  })

  it("selects all participants when not everyone is selected", () => {
    const p = setup({ participantIds: ["a"] })
    expect(screen.getByRole("button", { name: "全選" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "全選" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ participantIds: ["a", "b", "c"] })
  })

  it("clears the selection when everyone is selected", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "取消全選" }))
    expect(p.onChange).toHaveBeenLastCalledWith({ participantIds: [] })
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
    fireEvent.click(screen.getByRole("button", { name: "set-image" }))
    expect(p.onChange).toHaveBeenLastCalledWith({
      image: { image: "https://cdn.example/receipt.jpg", pendingFile: null, preview: null },
    })
  })

  it("renders the member image in the payer option when present", () => {
    const withImage = [
      { id: "a", displayName: "小雨", image: "https://cdn.example/xiaoyu.jpg" },
      { id: "b", displayName: "志明", image: null },
      { id: "c", displayName: "阿凱", image: null },
    ]
    render(<QuickItemCard item={item()} members={withImage} onChange={vi.fn()} />)
    const payer = screen.getByRole("group", { name: "付款人" })
    const radio = within(payer).getByRole("radio", { name: "小雨" })
    expect(radio.closest("label")!.querySelector('img[src="https://cdn.example/xiaoyu.jpg"]')).toBeInTheDocument()
  })
})
