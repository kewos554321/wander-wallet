import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
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
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({
  LocationPickerV2: ({
    onChange,
  }: {
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
import { parsedToQuickItems, type QuickItem } from "@/lib/quick-expense/draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
  { id: "c", displayName: "阿凱" },
]

const item = (over: Partial<QuickItem> = {}): QuickItem => ({
  ...parsedToQuickItems([
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

type Props = Parameters<typeof QuickItemCard>[0]

const setup = (over: Partial<QuickItem> = {}, extra: Partial<Props> = {}) => {
  const base = item(over)
  const onChange = vi.fn()
  render(<QuickItemCard item={base} members={members} onChange={onChange} projectCurrency="TWD" {...extra} />)
  const patchFromLastChange = () => {
    const updater = onChange.mock.calls.at(-1)?.[0] as ((state: QuickItem) => QuickItem) | undefined
    return updater ? updater(base) : undefined
  }
  const patchFromAllChanges = () =>
    onChange.mock.calls.reduce<QuickItem>(
      (state, [updater]) => (updater as (state: QuickItem) => QuickItem)(state),
      base,
    )
  return { onChange, base, patchFromLastChange, patchFromAllChanges }
}

const card = (name: string | RegExp) => screen.getByText(name).closest("div.rounded-2xl") as HTMLElement
const openOptional = () => fireEvent.click(screen.getByRole("button", { name: /日期 · 地點 · 收據圖片/ }))

describe("QuickItemCard", () => {
  it("renders the shared platform fields and split panel", () => {
    setup()
    expect(screen.getByLabelText("金額")).toHaveValue("60")
    expect(screen.getByLabelText(/描述/)).toHaveValue("早餐")
    expect(screen.getByText("誰付這筆")).toBeInTheDocument()
    expect(screen.getByText(/誰一起分/)).toBeInTheDocument()
    expect(screen.getByText("金額相符")).toBeInTheDocument()
  })

  it("writes description, amount, currency and category through the functional updater", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText(/描述/), { target: { value: "晚餐" } })
    expect(p.patchFromLastChange()).toMatchObject({ description: "晚餐" })
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "88" } })
    expect(p.patchFromLastChange()).toMatchObject({ amount: "88" })
    fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "JPY" } })
    expect(p.patchFromLastChange()).toMatchObject({ currency: "JPY" })
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    expect(p.patchFromLastChange()).toMatchObject({ category: "transport" })
  })

  it("applies the same money guardrails as the add-expense form", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "8a" } })
    expect(p.patchFromLastChange()?.amount).toBe("8")
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "999999999" } })
    expect(p.patchFromLastChange()?.amount).toBe("99999999")
  })

  it("toggles payers and participants through the split panel", () => {
    const p = setup()
    fireEvent.click(within(card("誰付這筆")).getByRole("button", { name: /志明/ }))
    expect(p.patchFromLastChange()).toMatchObject({ payerIds: ["a", "b"], pinnedPayerAmounts: {} })
    fireEvent.click(within(card(/誰一起分/)).getByRole("button", { name: /^阿凱$/ }))
    expect(p.patchFromLastChange()?.pool).toEqual(["a", "b"])
  })

  it("applies the in-card calculator result", () => {
    const p = setup()
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    fireEvent.click(screen.getByRole("button", { name: "C" }))
    fireEvent.click(screen.getByRole("button", { name: "9" }))
    fireEvent.click(screen.getByRole("button", { name: "✓" }))
    expect(p.patchFromLastChange()?.amount).toBe("9")
    expect(screen.queryByTestId("calc-display")).not.toBeInTheDocument()
  })

  it("writes the picked date, location and receipt image back", () => {
    const p = setup()
    openOptional()
    expect(screen.getByTestId("calendar-selected")).toHaveTextContent(new Date(p.base.expenseDate).toISOString())
    fireEvent.click(screen.getByRole("button", { name: "pick-day" }))
    expect(p.patchFromLastChange()?.expenseDate).toEqual(new Date("2026-03-05T12:00:00.000Z"))

    fireEvent.click(screen.getByRole("button", { name: "set-location" }))
    expect(p.patchFromLastChange()?.location).toEqual({ location: "台北 101", latitude: 25.033, longitude: 121.5645 })

    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(["x"], "receipt.jpg", { type: "image/jpeg" })] } })
    expect(p.patchFromLastChange()?.image).toMatchObject({ image: null, preview: "blob:preview" })
    expect(p.patchFromLastChange()?.image.pendingFile).toBeInstanceOf(File)
    createObjectURL.mockRestore()
  })

  it("shows the conversion preview and opens the shared rate sheet", () => {
    const p = setup(
      { currency: "JPY", amount: "1000" },
      {
        projectCurrency: "TWD",
        previewRateInfo: () => ({ rate: 0.21, source: "live" as const }),
        rateContext: () => ({ liveRate: 0.21, liveTimestamp: null }),
      },
    )
    expect(screen.getByTestId("amount-conversion")).toHaveTextContent("≈ TWD 210")
    expect(screen.getByTestId("rate-source")).toHaveTextContent("市場")
    fireEvent.click(screen.getByRole("button", { name: "調整匯率" }))
    expect(screen.getByRole("dialog", { name: "匯率" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "使用市場匯率" }))
    expect(p.patchFromAllChanges()).toMatchObject({ exchangeRate: "0.21", ratePinned: true, rateKind: "market" })
  })

  it("hides the conversion UI for a same-currency item", () => {
    setup({ currency: "TWD" }, { projectCurrency: "TWD" })
    expect(screen.queryByTestId("amount-conversion")).not.toBeInTheDocument()
    expect(screen.queryByTestId("rate-row")).not.toBeInTheDocument()
  })

  it("renders the member image in the payer pill when present", () => {
    const withImage = [
      { id: "a", displayName: "小雨", image: "https://cdn.example/xiaoyu.jpg" },
      { id: "b", displayName: "志明", image: null },
      { id: "c", displayName: "阿凱", image: null },
    ]
    render(<QuickItemCard item={item()} members={withImage} onChange={vi.fn()} projectCurrency="TWD" />)
    expect(within(card("誰付這筆")).getByRole("button", { name: /^小雨$/ }).querySelector('img[src="https://cdn.example/xiaoyu.jpg"]')).toBeInTheDocument()
  })
})
