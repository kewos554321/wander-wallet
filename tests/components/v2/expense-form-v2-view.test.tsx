import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/v2/expense-form/v2-image-picker", () => ({ V2ImagePicker: () => <div data-testid="image-picker" /> }))

import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"
import type { SplitDetail } from "@/lib/expense-split"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

/** The draft fields the container turns into its save payload. */
interface SubmittedDraft {
  amount: number
  currency: string
  category: string
  payers: { memberId: string; amount: number }[]
  description: string
  participants: { memberId: string; shareAmount: number }[]
  splitDetail: SplitDetail | null
}

function renderForm(
  overrides: Partial<Parameters<typeof ExpenseFormV2View>[0]> = {},
  { seedPool = true }: { seedPool?: boolean } = {},
) {
  const hook = renderHook(() =>
    useExpenseDraft(
      { members, currency: "TWD", paidBy: "a", projectCurrency: overrides.projectCurrency },
      overrides.previewRateInfo,
    ),
  )
  // A new expense now starts with only the current user in the shared pool.
  // These view tests exercise a multi-member split, so seed the rest (as if the
  // user tapped 全選); tests asserting the untouched default pass seedPool:false.
  if (seedPool) {
    act(() => {
      for (const m of members) {
        if (!hook.result.current.state.pool.includes(m.id)) hook.result.current.actions.togglePool(m.id)
      }
    })
  }
  // Snapshot the draft at the moment submit fires so we assert the payload,
  // not just that the no-arg onSubmit callback ran.
  const submissions: SubmittedDraft[] = []
  const onSubmit = vi.fn(() => {
    const { state, derived } = hook.result.current
    submissions.push({
      amount: derived.splitInput.amount,
      currency: state.currency,
      category: state.category,
      payers: derived.payers.map((p) => ({ ...p })),
      description: state.description,
      participants: derived.shares.map((s) => ({ ...s })),
      splitDetail: derived.splitDetail,
    })
  })
  const view = () => (
    <ExpenseFormV2View
      mode="create"
      projectId="p1"
      members={members}
      draft={hook.result.current}
      canNotifyLine={true}
      submitting={false}
      submitError={null}
      onSubmit={onSubmit}
      {...overrides}
    />
  )
  const utils = render(view())
  const rerender = () => utils.rerender(view())
  return { hook, onSubmit, submissions, rerender }
}

describe("ExpenseFormV2View", () => {
  it("shows the amount, categories, payer and submit label", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    expect(screen.getByLabelText("金額")).toHaveValue("1280")
    expect(screen.getByRole("button", { name: "餐飲" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "小雨" })).toBeChecked()
    expect(screen.getByRole("button", { name: "新增支出 · TWD 1,280" })).toBeInTheDocument()
  })

  it("starts a new expense with only the current user in the split pool", () => {
    const { hook, rerender } = renderForm({}, { seedPool: false })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(hook.result.current.state.pool).toEqual(["a"])
  })

  it("shows the conversion checkpoint before the payer section for a foreign expense", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "TWD",
      previewRateInfo: () => ({ rate: 0.2135, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
    })
    rerender()
    const note = screen.getByLabelText("匯率換算")
    expect(note).toHaveTextContent("1 JPY = 0.2135 TWD")
    expect(note).toHaveTextContent("系統以結算幣別 TWD 記帳，下方金額以原幣 JPY 填寫")
  })

  it("hides the conversion checkpoint when the expense currency is the settlement currency", () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.queryByLabelText("匯率換算")).not.toBeInTheDocument()
  })

  it("replaces the settlement estimates with a linked currency toggle for a foreign expense", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    const itemId = hook.result.current.state.personalItems.a[0].id
    act(() => {
      hook.result.current.actions.updateItem("a", itemId, "name", "咖啡")
      hook.result.current.actions.updateItem("a", itemId, "amount", "100")
    })
    rerender()
    // The ≈ lines give way to a per-section currency toggle.
    expect(screen.queryByTestId("personal-project-estimate")).not.toBeInTheDocument()
    expect(screen.queryByTestId("pool-project-estimate")).not.toBeInTheDocument()
    expect(screen.queryByTestId("payer-project-estimate")).not.toBeInTheDocument()
    const payer = screen.getByRole("group", { name: "付款成員" })
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(payer).getByRole("group", { name: "顯示幣別" })).toBeInTheDocument()
    expect(within(split).getByRole("group", { name: "顯示幣別" })).toBeInTheDocument()
  })

  it("switches both sections to the settlement currency when either toggle is used", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
    })
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    const split = screen.getByRole("region", { name: "分攤成員" })
    // Original currency by default: JPY has no decimals.
    expect(within(payer).getByLabelText("小雨的付款金額")).toHaveTextContent("$1,000")
    expect(within(split).getByLabelText("小雨的分攤金額")).toHaveTextContent("$500")
    // Flipping the split toggle also flips the payer section (they are linked).
    fireEvent.click(within(split).getByRole("button", { name: "顯示 USD" }))
    rerender()
    // 1000 JPY × 0.05 = 50 USD; each of the two members holds 25 USD. The ≈
    // marks the settlement figure as an approximation.
    expect(within(payer).getByLabelText("小雨的付款金額")).toHaveTextContent("≈$50.00")
    expect(within(split).getByLabelText("小雨的分攤金額")).toHaveTextContent("≈$25.00")
    // Flipping back restores the original currency.
    fireEvent.click(within(payer).getByRole("button", { name: "顯示 JPY" }))
    rerender()
    expect(within(split).getByLabelText("小雨的分攤金額")).toHaveTextContent("$500")
  })

  it("makes amount fields read-only while the settlement currency is shown", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
    })
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    fireEvent.click(within(payer).getByRole("button", { name: /小雨的付款金額均分/ }))
    rerender()
    expect(within(payer).getByLabelText("小雨的付款金額").tagName).toBe("INPUT")
    fireEvent.click(within(payer).getByRole("button", { name: "顯示 USD" }))
    rerender()
    expect(within(payer).getByLabelText("小雨的付款金額").tagName).toBe("SPAN")
    expect(within(payer).getByLabelText("小雨的付款金額")).toHaveTextContent("≈$50.00")
    expect(within(payer).queryByRole("button", { name: /小雨的付款金額/ })).not.toBeInTheDocument()
  })

  it("hides the remainder annotation while the settlement currency is shown", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1001")
      hook.result.current.actions.setCurrency("JPY")
    })
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByText("尾差")).toBeInTheDocument()
    fireEvent.click(within(split).getByRole("button", { name: "顯示 USD" }))
    rerender()
    expect(within(split).queryByText("尾差")).not.toBeInTheDocument()
  })

  it("renders personal items read-only while the settlement currency is shown", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    const itemId = hook.result.current.state.personalItems.a[0].id
    act(() => {
      hook.result.current.actions.updateItem("a", itemId, "name", "咖啡")
      hook.result.current.actions.updateItem("a", itemId, "amount", "100")
    })
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    // Editing view: the item fields are inputs.
    expect(within(split).getByLabelText("小雨的品項名稱 1").tagName).toBe("INPUT")
    expect(within(split).getByLabelText("小雨的品項金額 1").tagName).toBe("INPUT")

    fireEvent.click(within(split).getByRole("button", { name: "顯示 USD" }))
    rerender()
    // Settlement view: the whole input block is gone; each item reads as text.
    expect(within(split).queryByLabelText("小雨的品項名稱 1")).not.toBeInTheDocument()
    expect(within(split).queryByLabelText("為小雨新增品項")).not.toBeInTheDocument()
    const amount = within(split).getByLabelText("小雨的品項金額 1")
    expect(amount.tagName).toBe("SPAN")
    expect(amount).toHaveTextContent("≈$5.00")
    expect(within(split).getByText("咖啡")).toBeInTheDocument()
  })

  it("hides every editing control while the settlement currency is shown", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
    })
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    const split = screen.getByRole("region", { name: "分攤成員" })
    // Edit view: member selection and the personal-items switch are present.
    expect(within(payer).getByRole("checkbox", { name: "小雨" })).toBeInTheDocument()
    expect(within(split).getByRole("button", { name: "小雨" })).toBeInTheDocument()
    expect(within(split).getByRole("switch", { name: "先扣個人項目" })).toBeInTheDocument()

    fireEvent.click(within(payer).getByRole("button", { name: "顯示 USD" }))
    rerender()
    // Settlement view: nothing that mutates the draft is left, but the numbers stay.
    expect(within(payer).queryByRole("checkbox")).not.toBeInTheDocument()
    expect(within(payer).queryByRole("button", { name: "全選" })).not.toBeInTheDocument()
    expect(within(split).queryByRole("button", { name: "小雨" })).not.toBeInTheDocument()
    expect(within(split).queryByRole("switch", { name: "先扣個人項目" })).not.toBeInTheDocument()
    expect(within(split).queryByRole("button", { name: "小雨不參與共同分攤" })).not.toBeInTheDocument()
    expect(within(payer).getByLabelText("小雨的付款金額")).toHaveTextContent("≈$50.00")
    // The flip-back control stays, so the preview is not a dead end.
    expect(within(split).getByRole("button", { name: "顯示 JPY" })).toBeInTheDocument()
  })

  it("marks every non-zero amount in the breakdown table with ≈", () => {
    const { hook, rerender } = renderForm({
      projectCurrency: "USD",
      previewRateInfo: () => ({ rate: 0.05, source: "live" as const }),
    })
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setCurrency("JPY")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    fireEvent.click(within(split).getByRole("button", { name: "顯示 USD" }))
    rerender()
    const breakdown = within(split).getByRole("region", { name: "分攤明細" })
    const cells = within(within(breakdown).getByRole("row", { name: /小雨/ })).getAllByRole("cell")
    // No personal-item amount: that cell is a structural 0 and stays plain.
    expect(cells[0]).not.toHaveTextContent("≈")
    // Cells that hold an amount (共同分攤, 小計) are flagged as approximations.
    expect(cells[1]).toHaveTextContent("≈")
    expect(cells[2]).toHaveTextContent("≈")
    const totalCells = within(within(breakdown).getByRole("row", { name: /^合計/ })).getAllByRole("cell")
    expect(totalCells[0]).not.toHaveTextContent("≈")
    expect(totalCells[1]).toHaveTextContent("≈")
    expect(totalCells[2]).toHaveTextContent("≈")
  })

  it("hides the split settlement estimates for a same-currency expense", () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => {
      hook.result.current.actions.setAmount("100")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    rerender()
    expect(screen.queryByTestId("personal-project-estimate")).not.toBeInTheDocument()
    expect(screen.queryByTestId("pool-project-estimate")).not.toBeInTheDocument()
  })

  it("selects a category and toggles a payer on", () => {
    const { hook, rerender } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    rerender()
    expect(hook.result.current.state.category).toBe("transport")
    expect(hook.result.current.state.payerIds).toEqual(["a", "b"])
    expect(screen.getByRole("checkbox", { name: "志明" })).toBeChecked()
    expect(screen.getByRole("button", { name: "交通" })).toHaveAttribute("aria-pressed", "true")
  })

  it("renders the selected payer row and a matching payer summary with a select-all", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(within(payer).getByText("付款明細")).toBeInTheDocument()
    expect(within(payer).getByRole("button", { name: "全選" })).toBeInTheDocument()
    expect(within(payer).getAllByText("小雨")).toHaveLength(2)
    expect(within(payer).getByLabelText("小雨的付款金額")).toHaveTextContent("$1,280")
    expect(within(payer).getByText("金額相符")).toBeInTheDocument()
  })

  it("splits the amount equally between multiple selected payers", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    rerender()
    expect(hook.result.current.derived.payers).toEqual([
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ])
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(within(payer).getByText("金額相符")).toBeInTheDocument()
  })

  it("pins a manual payer amount and re-splits the rest", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: /志明的付款金額均分/ }))
    rerender()
    fireEvent.change(screen.getByLabelText("志明的付款金額"), { target: { value: "70" } })
    rerender()
    expect(hook.result.current.state.pinnedPayerAmounts).toEqual({ b: "70" })
    expect(hook.result.current.derived.payers).toEqual([
      { memberId: "a", amount: 30 },
      { memberId: "b", amount: 70 },
    ])
  })

  it("removes a payer and gives their share to the rest", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "移除志明" }))
    rerender()
    expect(hook.result.current.state.payerIds).toEqual(["a"])
    expect(hook.result.current.derived.payers).toEqual([{ memberId: "a", amount: 100 }])
  })

  it("selects every payer with 全選", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "全選" }))
    rerender()
    expect(hook.result.current.state.payerIds).toEqual(["a", "b"])
    expect(hook.result.current.derived.payers).toEqual([
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ])
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(within(payer).getByRole("button", { name: "取消全選" })).toBeInTheDocument()
  })

  it("shows the over-total error and blocks submit when pinned payer amounts exceed the amount", () => {
    const { hook, rerender, onSubmit } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: /志明的付款金額均分/ }))
    rerender()
    fireEvent.change(screen.getByLabelText("志明的付款金額"), { target: { value: "120" } })
    rerender()
    expect(hook.result.current.derived.error).toBe("付款金額合計超過支出金額")
    expect(screen.getByRole("alert")).toHaveTextContent("付款金額合計超過支出金額")
    // The auto payer goes negative; the badge names that rather than a plain mismatch.
    expect(within(screen.getByRole("group", { name: "付款成員" })).getByText("含負數金額")).toBeInTheDocument()
    const submit = screen.getByRole("button", { name: /新增支出/ })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("keeps the 付款成員 title inside its section card", () => {
    renderForm()
    const payer = screen.getByRole("group", { name: "付款成員" })
    // A native fieldset renders its legend on the card border (outside the padded
    // content box); the payer section must use the same card container as siblings.
    expect(payer.tagName).not.toBe("FIELDSET")
    const title = screen.getByText("付款成員")
    expect(title.tagName).toBe("P")
    expect(title.parentElement).toHaveClass("mx-4", "mb-4", "rounded-2xl", "border", "border-v2-line", "bg-v2-surface", "p-4")
  })

  it("renders the selected payer row with a read-only amount, a pin and a remove control", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(within(payer).getAllByText("小雨")).toHaveLength(2)
    // The equal amount is read-only until the pin opens it for editing.
    expect(within(payer).getByLabelText("小雨的付款金額").tagName).toBe("SPAN")
    expect(within(payer).getByLabelText("小雨的付款金額")).toHaveTextContent("$1,280")
    expect(within(payer).getByRole("button", { name: /小雨的付款金額均分/ })).toBeInTheDocument()
    expect(within(payer).getByRole("button", { name: "移除小雨" })).toBeInTheDocument()
  })

  it("switches to the breakdown table as soon as the personal-items switch is on", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    // Switch off: the breakdown table is hidden.
    expect(within(split).queryByRole("region", { name: "分攤明細" })).not.toBeInTheDocument()
    // Turning the switch on switches to the table immediately, before picking a member.
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    const breakdown = within(split).getByRole("region", { name: "分攤明細" })
    expect(within(breakdown).getByText("（TWD）")).toBeInTheDocument()
    // The table carries the summary now, so the text equation is gone; only the
    // match status remains below the 合計 row.
    expect(within(breakdown).queryByText(/共同分攤 \$.*= \$/)).not.toBeInTheDocument()
    const total = within(breakdown).getByRole("row", { name: /^合計/ })
    const badge = within(breakdown).getByText("金額相符")
    expect(total.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("splits an amount that does not divide evenly into whole units that sum to the total", () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => hook.result.current.actions.setAmount("1111"))
    rerender()
    const shares = hook.result.current.derived.shares
    expect(shares.reduce((s, x) => s + x.shareAmount, 0)).toBe(1111)
    expect(shares.every((s) => Number.isInteger(s.shareAmount))).toBe(true)
  })

  it("hides the match badge while the amount is zero", () => {
    renderForm()
    // No amount yet: the breakdown table is hidden and so is the match badge,
    // in both the payer and the split sections.
    expect(screen.queryByRole("region", { name: "分攤明細" })).not.toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "分攤成員" })).queryByText("金額相符")).not.toBeInTheDocument()
    expect(within(screen.getByRole("group", { name: "付款成員" })).queryByText("金額相符")).not.toBeInTheDocument()
  })

  it("shows how far short the split is when nobody is in the pool", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    fireEvent.click(within(split).getByRole("button", { name: "取消全選" }))
    rerender()
    // Nothing is allocated against the 100 target.
    expect(within(split).getByText("尚差 $100")).toBeInTheDocument()
  })

  it("no longer renders a text summary under the split header", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).queryByText(/共同分攤 \$.*= \$/)).not.toBeInTheDocument()
    expect(within(split).queryByText(/個人項目 \$/)).not.toBeInTheDocument()
  })

  it("only calls the shared amount 'remaining' while the personal-items switch is on", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    // Nothing has been deducted yet: plain shared amount, no "剩餘" wording.
    expect(within(split).getByText("（$100）")).toBeInTheDocument()
    expect(within(split).queryByText(/剩餘/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    expect(within(split).getByText(/剩餘/)).toHaveTextContent("$100")
  })

  it("groups the pool pills and the breakdown under the 分攤成員 region", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明的個人項目" }))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByRole("button", { name: "小雨" })).toHaveAttribute("aria-pressed", "true")
    expect(within(split).getByRole("region", { name: "分攤明細" })).toBeInTheDocument()
    expect(within(split).getByText(/剩餘/)).toBeInTheDocument()
  })

  it("keeps personal items off until the personal-mode switch is turned on", () => {
    const { rerender } = renderForm()
    const toggle = screen.getByRole("switch", { name: "先扣個人項目" })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    expect(screen.queryByText("請選擇成員")).not.toBeInTheDocument()
    fireEvent.click(toggle)
    rerender()
    expect(screen.getByRole("switch", { name: "先扣個人項目" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText("請選擇成員")).toBeInTheDocument()
  })

  it("toggles a member's participation in the shared pool", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByRole("button", { name: "小雨" })).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(within(split).getByRole("button", { name: "小雨" }))
    rerender()
    expect(within(split).getByRole("button", { name: "小雨" })).toHaveAttribute("aria-pressed", "false")
    expect(hook.result.current.derived.shares.map((s) => s.memberId)).toEqual(["b"])
  })

  it("puts the edited description into the submitted payload", () => {
    const { hook, rerender, submissions } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    fireEvent.change(screen.getByLabelText("描述"), { target: { value: "晚餐" } })
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    expect(submissions).toHaveLength(1)
    expect(submissions[0].description).toBe("晚餐")
  })

  it("turns the pinned share into an editable field with a dollar prefix", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    // Before pinning the share is read-only text.
    expect(screen.getByLabelText("小雨的分攤金額").tagName).toBe("SPAN")

    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    const input = screen.getByLabelText("小雨的分攤金額")
    expect(input.tagName).toBe("INPUT")
    expect(input).toHaveValue("50")
    expect(input.closest("label")).toHaveTextContent("$")
  })

  it("edits personal items", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明的個人項目" }))
    rerender()
    // The pill stays visible, now in its selected state.
    expect(screen.getByRole("button", { name: "志明的個人項目" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.change(screen.getByLabelText("志明的品項名稱 1"), { target: { value: "咖啡" } })
    rerender()
    fireEvent.change(screen.getByLabelText("志明的品項金額 1"), { target: { value: "20" } })
    rerender()
    expect(hook.result.current.derived.shares.find((s) => s.memberId === "b")?.shareAmount).toBe(60)
  })

  it("prefixes the personal-item amount input with a dollar sign", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明的個人項目" }))
    rerender()
    expect(screen.getByLabelText("志明的品項金額 1").closest("label")).toHaveTextContent("$")
  })

  it("shows no text summary when the breakdown table is present", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明的個人項目" }))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    // The table replaces the text summary.
    expect(within(split).getByRole("region", { name: "分攤明細" })).toBeInTheDocument()
    expect(within(split).queryByText(/＋ 共同分攤 \$.*= \$/)).not.toBeInTheDocument()
  })

  it("selects and clears all personal-item members", () => {
    const { hook, rerender } = renderForm()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明的個人項目" }))
    rerender()
    fireEvent.change(screen.getByLabelText("志明的品項名稱 1"), { target: { value: "咖啡" } })
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "全選個人項目" }))
    rerender()
    expect(hook.result.current.state.personalMembers).toEqual(["a", "b"])
    // Existing items are kept; newly added members get one empty item.
    expect(hook.result.current.state.personalItems.b[0].name).toBe("咖啡")
    expect(hook.result.current.state.personalItems.a).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "取消全選個人項目" }))
    rerender()
    expect(hook.result.current.state.personalMembers).toEqual([])
    expect(hook.result.current.state.personalItems).toEqual({})
  })

  it("sets a custom share for a pool member", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    // Not pinned: the share is plain text, not an input.
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^\$50$/)
    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    fireEvent.change(screen.getByLabelText("小雨的分攤金額"), { target: { value: "30" } })
    rerender()
    expect(hook.result.current.derived.shares.map((s) => s.shareAmount)).toEqual([30, 70])
    expect(screen.getByRole("button", { name: "小雨取消固定金額" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "小雨取消固定金額" }))
    rerender()
    expect(hook.result.current.derived.shares.map((s) => s.shareAmount)).toEqual([50, 50])
  })

  it("accepts only numeric money input in personal item and custom share fields", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明的個人項目" }))
    rerender()
    const item = () => screen.getByLabelText("志明的品項金額 1")
    fireEvent.change(item(), { target: { value: "12.5" } })
    rerender()
    expect(item()).toHaveValue("12.5")
    for (const bad of ["12a", "1.234", "-3", "1.2.3"]) {
      fireEvent.change(item(), { target: { value: bad } })
      rerender()
      expect(item()).toHaveValue("12.5")
    }
    fireEvent.change(item(), { target: { value: "３０" } })
    rerender()
    expect(item()).toHaveValue("30")

    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    const pinned = hook.result.current.state.customShares.a
    fireEvent.change(screen.getByLabelText("小雨的分攤金額"), { target: { value: "abc" } })
    rerender()
    expect(hook.result.current.state.customShares.a).toBe(pinned)
  })

  it("blocks submit when custom shares do not add up to the amount", () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    fireEvent.change(screen.getByLabelText("小雨的分攤金額"), { target: { value: "10" } })
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明固定金額" }))
    rerender()
    fireEvent.change(screen.getByLabelText("志明的分攤金額"), { target: { value: "10" } })
    rerender()
    expect(hook.result.current.derived.matches).toBe(false)
    expect(screen.getByRole("button", { name: /新增支出/ })).toBeDisabled()
  })

  it("notes the rounding remainder on the shared pool when it does not divide evenly", () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => hook.result.current.actions.setAmount("101"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByText(/尾差 \$1/)).toBeInTheDocument()
    expect(within(split).getByText("尾差")).toBeInTheDocument()
  })

  it("explains the remainder rule when the chip is opened", async () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => hook.result.current.actions.setAmount("101"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "尾差說明" }))
    expect(await screen.findByText(/除不盡的零頭會依公平原則輪替/)).toBeInTheDocument()
  })

  it("does not note a remainder when the pool divides evenly", () => {
    const { hook, rerender } = renderForm({ projectCurrency: "TWD" })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.queryByText(/尾差/)).not.toBeInTheDocument()
  })

  it("shows a dashed hint when nobody is in the shared pool", () => {
    const { hook, rerender } = renderForm()
    expect(screen.queryByText("請選擇分攤成員")).not.toBeInTheDocument()
    act(() => hook.result.current.actions.setPoolAll(false))
    rerender()
    expect(screen.getByText("請選擇分攤成員")).toBeInTheDocument()
  })

  it("pins the current auto share when the pin button is pressed", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明固定金額" }))
    rerender()
    expect(hook.result.current.state.customShares).toEqual({ b: "50" })
    expect(screen.getByLabelText("志明的分攤金額")).toHaveValue("50")
  })

  it("shows only the shared-pool portion, separate from personal items", () => {
    const { hook, rerender } = renderForm()
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    const itemId = hook.result.current.state.personalItems.a[0].id
    act(() => {
      hook.result.current.actions.updateItem("a", itemId, "name", "咖啡")
      hook.result.current.actions.updateItem("a", itemId, "amount", "100")
    })
    rerender()
    // Pool of 2 splits the remaining 900; 小雨's row shows 450, not 450 + 100.
    expect(screen.getByText(/剩餘/)).toHaveTextContent("$900")
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^\$450$/)
    expect(screen.getByLabelText("志明的分攤金額")).toHaveTextContent(/^\$450$/)
    expect(hook.result.current.derived.shares.map((s) => s.shareAmount)).toEqual([550, 450])
  })

  it("keeps the remaining shared amount tied to personal items, not custom shares", () => {
    const { hook, rerender } = renderForm()
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    const itemId = hook.result.current.state.personalItems.a[0].id
    act(() => {
      hook.result.current.actions.updateItem("a", itemId, "name", "咖啡")
      hook.result.current.actions.updateItem("a", itemId, "amount", "100")
    })
    rerender()
    // The pool after deducting 小雨's $100 personal item.
    expect(screen.getByText(/剩餘/)).toHaveTextContent("$900")

    // Pinning a custom share in the list below must not change it: the number
    // exists to show how much is left after the personal items above.
    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    fireEvent.change(screen.getByLabelText("小雨的分攤金額"), { target: { value: "300" } })
    rerender()
    expect(screen.getByText(/剩餘/)).toHaveTextContent("$900")
  })

  it("shows the split breakdown with dollar amounts when personal items are present", () => {
    const { hook, rerender } = renderForm()
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("b")
    })
    rerender()
    const table = screen.getByRole("region", { name: "分攤明細" })
    expect(within(table).getByText("（TWD）")).toBeInTheDocument()
    expect(within(table).getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "成員",
      "個人項目",
      "共同分攤",
      "小計",
    ])
    const row = (name: string) => within(table).getByRole("row", { name: new RegExp(`^${name}`) })
    expect(row("小雨")).toHaveTextContent("$500")
    expect(row("志明")).toHaveTextContent("$500")
    expect(row("合計")).toHaveTextContent("$1,000")
  })

  it("breaks down personal and shared amounts per member with dollar amounts", () => {
    const { hook, rerender } = renderForm()
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    const itemId = hook.result.current.state.personalItems.a[0].id
    act(() => {
      hook.result.current.actions.updateItem("a", itemId, "name", "咖啡")
      hook.result.current.actions.updateItem("a", itemId, "amount", "100")
      hook.result.current.actions.togglePool("a")
    })
    rerender()
    const table = screen.getByRole("region", { name: "分攤明細" })
    const cells = (name: string) =>
      within(within(table).getByRole("row", { name: new RegExp(`^${name}`) }))
        .getAllByRole("cell")
        .map((c) => c.textContent)
    expect(cells("小雨")).toEqual(["$100", "$0", "$100"])
    expect(cells("志明")).toEqual(["$0", "$900", "$900"])
    const totalRow = within(table).getByRole("row", { name: /^合計/ })
    expect(within(totalRow).getAllByRole("cell").map((c) => c.textContent)).toEqual(["$100", "$900", "$1,000"])
  })

  it("hides members whose subtotal is zero", () => {
    const { hook, rerender } = renderForm()
    act(() => {
      hook.result.current.actions.setAmount("1000")
      // A personal item keeps the breakdown table visible.
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    rerender()
    // 小雨 leaves the shared pool, so her subtotal becomes $0.
    act(() => hook.result.current.actions.togglePool("a"))
    rerender()
    const table = screen.getByRole("region", { name: "分攤明細" })
    expect(within(table).queryByRole("row", { name: /^小雨/ })).not.toBeInTheDocument()
    expect(within(table).getByRole("row", { name: /^志明/ })).toHaveTextContent("$1,000")
    expect(within(table).getByRole("row", { name: /^合計/ })).toHaveTextContent("$1,000")
  })

  it("disables submit, shows the draft error and does not submit while invalid", () => {
    const { onSubmit } = renderForm()
    expect(screen.getByRole("alert")).toHaveTextContent("請輸入有效金額")
    const submit = screen.getByRole("button", { name: /新增支出/ })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits the draft payload when valid", () => {
    const { hook, rerender, onSubmit, submissions } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(submissions).toEqual([
      {
        amount: 100,
        currency: "TWD",
        category: "",
        payers: [{ memberId: "a", amount: 100 }],
        description: "",
        participants: [
          { memberId: "a", shareAmount: 50 },
          { memberId: "b", shareAmount: 50 },
        ],
        splitDetail: null,
      },
    ])
  })

  it("shows the LINE toggle only when notifications are possible", () => {
    renderForm({ canNotifyLine: false })
    expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
  })

  it("keeps a working, accessible notify checkbox", () => {
    const { hook, rerender } = renderForm()
    const checkbox = screen.getByRole("checkbox", { name: /通知 LINE 群組/ })
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    rerender()
    expect(hook.result.current.state.notifyLine).toBe(false)
  })

  it("blocks submission and shows a busy label while submitting", () => {
    const { hook, rerender, onSubmit } = renderForm({ submitting: true })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const submit = screen.getByRole("button", { name: "儲存中..." })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("edit mode shows 儲存變更 · amount and a top-bar delete action", () => {
    const onRequestDelete = vi.fn()
    const { hook, rerender } = renderForm({ mode: "edit", onRequestDelete })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("button", { name: "儲存變更 · TWD 100" })).toBeInTheDocument()
    // The bottom full-width delete block is gone; delete lives in the top bar.
    expect(screen.queryByRole("button", { name: "刪除支出" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(onRequestDelete).toHaveBeenCalledTimes(1)
  })

  it("uses the create LINE notify sub-copy", () => {
    renderForm()
    expect(screen.getByText("儲存後自動發送通知到群組")).toBeInTheDocument()
  })

  it("uses the edit LINE notify sub-copy", () => {
    renderForm({ mode: "edit" })
    expect(screen.getByText("變更後自動發送通知到群組")).toBeInTheDocument()
    expect(screen.queryByText("儲存後自動發送通知到群組")).not.toBeInTheDocument()
  })

  it("opens the in-card calculator, hides the amount input and writes the value back", () => {
    const { rerender } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    rerender()
    expect(screen.getByTestId("calc-display")).toBeInTheDocument()
    expect(screen.queryByLabelText("金額")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "7" }))
    fireEvent.click(screen.getByRole("button", { name: "✓" }))
    rerender()
    expect(screen.getByLabelText("金額")).toHaveValue("7")
    expect(screen.queryByTestId("calc-display")).not.toBeInTheDocument()
  })

  it("shows the server error", () => {
    const { hook, rerender } = renderForm({ submitError: "分攤明細與分攤金額不一致" })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("alert")).toHaveTextContent("分攤明細與分攤金額不一致")
  })

  it("renders the member image in the payer options when present, else the initial", () => {
    renderForm({
      members: [
        { id: "a", displayName: "小雨", image: "https://cdn.example/xiaoyu.jpg" },
        { id: "b", displayName: "志明", image: null },
      ],
    })
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(payer.querySelector('img[src="https://cdn.example/xiaoyu.jpg"]')).toBeInTheDocument()
    expect(within(payer).getAllByText("志").length).toBeGreaterThan(0)
  })

  it("renders the member image in the split editor and summary rows", () => {
    const { hook, rerender } = renderForm({
      members: [
        { id: "a", displayName: "小雨", image: "https://cdn.example/xiaoyu.jpg" },
        { id: "b", displayName: "志明", image: null },
      ],
    })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(split.querySelector('img[src="https://cdn.example/xiaoyu.jpg"]')).toBeInTheDocument()
    expect(within(split).getAllByText("志").length).toBeGreaterThan(0)
  })
})
