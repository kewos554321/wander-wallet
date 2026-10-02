import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/components/location-picker", () => ({ LocationPicker: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => <div data-testid="image-picker" /> }))
vi.mock("@/components/ui/calculator", () => ({ Calculator: () => <div data-testid="calculator" /> }))

import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

function renderForm(overrides: Partial<Parameters<typeof ExpenseFormV2View>[0]> = {}) {
  const hook = renderHook(() => useExpenseDraft({ members, currency: "TWD", paidBy: "a" }))
  const onSubmit = vi.fn()
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
  return { hook, onSubmit, rerender }
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

  it("shows the split summary and matched state", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByText("已選 2 人")).toBeInTheDocument()
    expect(within(split).getByText("金額相符")).toBeInTheDocument()
    expect(within(split).getByText("個人項目 $0（0 項）＋ 共同分攤 $100（2 人）= $100 / $100")).toBeInTheDocument()
  })

  it("uses the shared lake section title on the split card", () => {
    renderForm()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(split.className).toContain("rounded-2xl")
    expect(within(split).getByText("分攤成員").className).toContain("text-v2-lake")
  })

  it("keeps the personal-mode label lake when the toggle is off", () => {
    renderForm()
    const label = screen.getByText("先扣個人項目")
    expect(label.className).toContain("text-[13px]")
    expect(label.className).toContain("text-v2-lake")
  })

  it("dims unselected pool pills and their avatars", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByRole("button", { name: "小雨" }).className).not.toContain("opacity-50")
    act(() => hook.result.current.actions.togglePool("a"))
    rerender()
    const unselected = within(split).getByRole("button", { name: "小雨" })
    expect(unselected.className).toContain("opacity-50")
    expect(unselected.querySelector("span[aria-hidden='true']")?.className).toContain("opacity-40")
  })

  it("styles the unpinned pin button with the check border", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("button", { name: "小雨固定金額" }).className).toContain("border-v2-check")
  })

  it("wraps the pinned amount in a bordered box with a dollar prefix", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    const input = screen.getByLabelText("小雨的分攤金額")
    expect(input.closest("label")?.className).toContain("border-v2-lake-border")
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

  it("shows the split breakdown only when personal items are in use", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1000"))
    rerender()
    expect(screen.queryByRole("region", { name: "分攤明細" })).not.toBeInTheDocument()
    act(() => {
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
    expect(within(table).getByText("（TWD）")).toBeInTheDocument()
    const row = (name: string) => within(table).getByRole("row", { name: new RegExp(`^${name}`) })
    expect(row("小雨")).toHaveTextContent("小雨1000100")
    expect(row("志明")).toHaveTextContent("志明0900900")
    expect(row("合計")).toHaveTextContent("合計1009001,000")
  })

  it("disables submit and shows the draft error", () => {
    renderForm()
    expect(screen.getByRole("alert")).toHaveTextContent("請輸入有效金額")
    expect(screen.getByRole("button", { name: /新增支出/ })).toBeDisabled()
  })

  it("submits when valid", () => {
    const { hook, rerender, onSubmit } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("shows the LINE toggle only when notifications are possible", () => {
    renderForm({ canNotifyLine: false })
    expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
  })

  it("edit mode shows 儲存變更 and delete", () => {
    const onRequestDelete = vi.fn()
    const { hook, rerender } = renderForm({ mode: "edit", onRequestDelete })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("button", { name: "儲存變更" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "刪除支出" }))
    expect(onRequestDelete).toHaveBeenCalled()
  })

  it("shows the server error", () => {
    const { hook, rerender } = renderForm({ submitError: "分攤明細與分攤金額不一致" })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("alert")).toHaveTextContent("分攤明細與分攤金額不一致")
  })
})
