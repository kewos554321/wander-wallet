import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { PayerPicker } from "@/components/v2/expense-form/payer-picker"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

type Props = Parameters<typeof PayerPicker>[0]

function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
    members,
    payerIds: ["a"],
    pinned: {},
    payers: [{ memberId: "a", amount: 100 }],
    matches: true,
    amount: 100,
    currency: "TWD",
    onTogglePayer: vi.fn(),
    onSetAll: vi.fn(),
    onSetAmount: vi.fn(),
    onClearAmount: vi.fn(),
    ...overrides,
  }
  render(<PayerPicker {...props} />)
  return props
}

describe("PayerPicker", () => {
  it("renders a multi-select checkbox per member with the selected ones checked", () => {
    setup()
    expect(screen.getByRole("checkbox", { name: "小雨" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "志明" })).not.toBeChecked()
  })

  it("toggles a member when their pill is clicked", () => {
    const { onTogglePayer } = setup()
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    expect(onTogglePayer).toHaveBeenCalledWith("b")
  })

  it("shows each selected payer's equal amount as read-only text until pinned", () => {
    setup({
      payerIds: ["a", "b"],
      payers: [
        { memberId: "a", amount: 50 },
        { memberId: "b", amount: 50 },
      ],
    })
    const a = screen.getByLabelText("小雨的付款金額")
    expect(a.tagName).toBe("SPAN")
    expect(a).toHaveTextContent("$50")
    const b = screen.getByLabelText("志明的付款金額")
    expect(b.tagName).toBe("SPAN")
    expect(b).toHaveTextContent("$50")
  })

  it("hints to pick payers and renders no rows when nobody is selected", () => {
    setup({ payerIds: [], payers: [] })
    expect(screen.queryByLabelText(/的付款金額/)).not.toBeInTheDocument()
    expect(screen.getByText("請選擇付款成員")).toBeInTheDocument()
  })

  it("renders an editable input with the pinned amount once a payer is pinned", () => {
    setup({
      payerIds: ["a"],
      pinned: { a: "40" },
      payers: [{ memberId: "a", amount: 40 }],
    })
    const input = screen.getByLabelText("小雨的付款金額")
    expect(input.tagName).toBe("INPUT")
    expect(input).toHaveValue("40")
  })

  it("forwards amount edits for a pinned payer", () => {
    const { onSetAmount } = setup({ pinned: { a: "40" }, payers: [{ memberId: "a", amount: 40 }] })
    fireEvent.change(screen.getByLabelText("小雨的付款金額"), { target: { value: "35" } })
    expect(onSetAmount).toHaveBeenCalledWith("a", "35")
  })

  it("pins an auto payer at its derived amount", () => {
    const { onSetAmount } = setup({ payers: [{ memberId: "a", amount: 100 }] })
    fireEvent.click(screen.getByRole("button", { name: /小雨的付款金額均分/ }))
    expect(onSetAmount).toHaveBeenCalledWith("a", "100")
  })

  it("clears a pinned payer back to an equal share", () => {
    const { onClearAmount } = setup({
      pinned: { a: "40" },
      payers: [{ memberId: "a", amount: 40 }],
    })
    fireEvent.click(screen.getByRole("button", { name: /小雨的付款金額已自訂/ }))
    expect(onClearAmount).toHaveBeenCalledWith("a")
  })

  it("removes a payer", () => {
    const { onTogglePayer } = setup()
    fireEvent.click(screen.getByRole("button", { name: "移除小雨" }))
    expect(onTogglePayer).toHaveBeenCalledWith("a")
  })

  it("offers 全選 when not every member is selected and selects all", () => {
    const { onSetAll } = setup({ payerIds: ["a"] })
    fireEvent.click(screen.getByRole("button", { name: "全選" }))
    expect(onSetAll).toHaveBeenCalledWith(true)
  })

  it("offers 取消全選 when every member is selected and clears them", () => {
    const { onSetAll } = setup({
      payerIds: ["a", "b"],
      payers: [
        { memberId: "a", amount: 50 },
        { memberId: "b", amount: 50 },
      ],
    })
    expect(screen.queryByRole("button", { name: "全選" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "取消全選" }))
    expect(onSetAll).toHaveBeenCalledWith(false)
  })

  it("hides the select-all control when there is only one member", () => {
    setup({ members: [{ id: "a", displayName: "小雨" }] })
    expect(screen.queryByRole("button", { name: "全選" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "取消全選" })).not.toBeInTheDocument()
  })

  it("shows 金額相符 when the payer total matches", () => {
    setup({
      payerIds: ["a", "b"],
      payers: [
        { memberId: "a", amount: 50 },
        { memberId: "b", amount: 50 },
      ],
      matches: true,
    })
    const group = screen.getByRole("group", { name: "付款成員" })
    expect(within(group).getByText("金額相符")).toBeInTheDocument()
  })

  it("shows how far short the payer total is when it is below the amount", () => {
    setup({
      payerIds: ["a", "b"],
      payers: [
        { memberId: "a", amount: 30 },
        { memberId: "b", amount: 30 },
      ],
      matches: false,
    })
    const group = screen.getByRole("group", { name: "付款成員" })
    // 60 of the 100 target → short by 40.
    expect(within(group).getByText("尚差 $40")).toBeInTheDocument()
  })

  it("shows how far over the payer total is when it exceeds the amount", () => {
    setup({
      payerIds: ["a", "b"],
      payers: [
        { memberId: "a", amount: 60 },
        { memberId: "b", amount: 60 },
      ],
      matches: false,
    })
    const group = screen.getByRole("group", { name: "付款成員" })
    // 120 of the 100 target → over by 20.
    expect(within(group).getByText("超出 $20")).toBeInTheDocument()
  })

  it("calls out a negative payer amount instead of a plain mismatch", () => {
    setup({
      payerIds: ["a", "b"],
      payers: [
        { memberId: "a", amount: -20 },
        { memberId: "b", amount: 120 },
      ],
      matches: false,
    })
    const group = screen.getByRole("group", { name: "付款成員" })
    expect(within(group).getByText("含負數金額")).toBeInTheDocument()
  })

  it("shows each payer's settlement estimate on its own line for a foreign expense", () => {
    setup({
      currency: "JPY",
      projectCurrency: "USD",
      rate: 0.05,
      payers: [{ memberId: "a", amount: 1000 }],
    })
    const estimate = screen.getByTestId("payer-project-estimate")
    expect(estimate).toHaveTextContent("≈ USD 50.00")
    expect(estimate).not.toHaveClass("truncate")
  })

  it("hides the payer settlement estimate for a same-currency expense", () => {
    setup({ currency: "TWD", projectCurrency: "TWD" })
    expect(screen.queryByTestId("payer-project-estimate")).not.toBeInTheDocument()
  })

  it("renders the member image in the payer options when present, else the initial", () => {
    setup({
      members: [
        { id: "a", displayName: "小雨", image: "https://cdn.example/xiaoyu.jpg" },
        { id: "b", displayName: "志明", image: null },
      ],
    })
    const group = screen.getByRole("group", { name: "付款成員" })
    expect(group.querySelector('img[src="https://cdn.example/xiaoyu.jpg"]')).toBeInTheDocument()
    expect(within(group).getAllByText("志").length).toBeGreaterThan(0)
  })
})
