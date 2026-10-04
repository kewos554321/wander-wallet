import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => <div data-testid="image-picker" /> }))

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
  paidBy: string
  description: string
  participants: { memberId: string; shareAmount: number }[]
  splitDetail: SplitDetail | null
}

function renderForm(overrides: Partial<Parameters<typeof ExpenseFormV2View>[0]> = {}) {
  const hook = renderHook(() => useExpenseDraft({ members, currency: "TWD", paidBy: "a" }))
  // Snapshot the draft at the moment submit fires so we assert the payload,
  // not just that the no-arg onSubmit callback ran.
  const submissions: SubmittedDraft[] = []
  const onSubmit = vi.fn(() => {
    const { state, derived } = hook.result.current
    submissions.push({
      amount: derived.splitInput.amount,
      currency: state.currency,
      category: state.category,
      paidBy: state.paidBy,
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
    expect(screen.getByRole("radio", { name: "小雨" })).toBeChecked()
    expect(screen.getByRole("button", { name: "新增支出 · TWD 1,280" })).toBeInTheDocument()
  })

  it("selects a category and a payer", () => {
    const { hook, rerender } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    fireEvent.click(screen.getByRole("radio", { name: "志明" }))
    rerender()
    expect(hook.result.current.state.category).toBe("transport")
    expect(hook.result.current.state.paidBy).toBe("b")
    expect(screen.getByRole("button", { name: "交通" })).toHaveAttribute("aria-pressed", "true")
  })

  it("renders a single read-only payer row and a payer summary with no select-all", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(within(payer).getByText("付款明細")).toBeInTheDocument()
    expect(within(payer).queryByText("全選")).not.toBeInTheDocument()
    expect(within(payer).getAllByText("小雨")).toHaveLength(2)
    expect(within(payer).getByText("$1,280")).toBeInTheDocument()
    expect(within(payer).getByText("已選 1 人")).toBeInTheDocument()
    expect(within(payer).getByText("金額相符")).toBeInTheDocument()
    expect(within(payer).getByText("$1,280 = $1,280 / $1,280")).toBeInTheDocument()
  })

  it("truncates the selected payer name and keeps the amount from shrinking", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    const payer = screen.getByRole("group", { name: "付款成員" })
    expect(within(payer).getByText("小雨", { selector: "span.truncate" })).toBeInTheDocument()
    expect(within(payer).getByText("$1,280")).toHaveClass("shrink-0")
  })

  it("shows the split summary and matched state", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByText("已選 2 人")).toBeInTheDocument()
    expect(within(split).getByText("金額相符")).toBeInTheDocument()
    expect(within(split).getByText("個人項目 $0（0 項）＋ 共同分攤 $100（2 人）= $100 / $100")).toBeInTheDocument()
  })

  it("groups the pool pills and the breakdown under the 分攤成員 region", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByRole("button", { name: "小雨" })).toHaveAttribute("aria-pressed", "true")
    expect(within(split).getByRole("region", { name: "分攤明細" })).toBeInTheDocument()
    expect(within(split).getByText(/剩餘應攤分金額/)).toBeInTheDocument()
  })

  it("keeps personal items off until the personal-mode switch is turned on", () => {
    const { rerender } = renderForm()
    const toggle = screen.getByRole("switch", { name: "先扣個人項目" })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    expect(screen.queryByText(/目前沒有人有個人項目/)).not.toBeInTheDocument()
    fireEvent.click(toggle)
    rerender()
    expect(screen.getByRole("switch", { name: "先扣個人項目" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText(/目前沒有人有個人項目/)).toBeInTheDocument()
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

  it("shows a dashed hint when nobody is in the shared pool", () => {
    const { hook, rerender } = renderForm()
    expect(screen.queryByText(/目前沒有人參與共同分攤/)).not.toBeInTheDocument()
    act(() => hook.result.current.actions.setPoolAll(false))
    rerender()
    expect(screen.getByText(/目前沒有人參與共同分攤/)).toBeInTheDocument()
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
    expect(screen.getByText(/剩餘應攤分金額/)).toHaveTextContent("$900")
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^\$450$/)
    expect(screen.getByLabelText("志明的分攤金額")).toHaveTextContent(/^\$450$/)
    expect(hook.result.current.derived.shares.map((s) => s.shareAmount)).toEqual([550, 450])
  })

  it("always shows the split breakdown with dollar amounts", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1000"))
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
    act(() => hook.result.current.actions.setAmount("1000"))
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
        paidBy: "a",
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
