import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react"
import { ExpenseFormPlatformView } from "@/components/v2/expense-form/expense-form-platform-view"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

beforeEach(() => {
  createObjectURL.mockReset().mockReturnValue("blob:first")
  revokeObjectURL.mockReset()
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: createObjectURL })
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeObjectURL })
})

interface Submitted {
  amount: number
  description: string
  shares: { memberId: string; shareAmount: number }[]
  splitDetail: unknown
}

function renderForm(
  overrides: Partial<Parameters<typeof ExpenseFormPlatformView>[0]> = {},
  { description = "晚餐", seedPool = true, amount = "100" }: { description?: string | null; seedPool?: boolean; amount?: string } = {},
) {
  const hook = renderHook(() =>
    useExpenseDraft(
      { members, currency: "TWD", paidBy: "a", projectCurrency: overrides.projectCurrency },
      overrides.previewRateInfo,
    ),
  )
  if (seedPool) {
    act(() => {
      for (const m of members) {
        if (!hook.result.current.state.pool.includes(m.id)) hook.result.current.actions.togglePool(m.id)
      }
    })
  }
  if (description !== null) {
    act(() => hook.result.current.actions.setDescription(description))
  }
  act(() => hook.result.current.actions.setAmount(amount))

  const submissions: Submitted[] = []
  const onSubmit = vi.fn(() => {
    const { state, derived } = hook.result.current
    submissions.push({
      amount: derived.splitInput.amount,
      description: state.description,
      shares: derived.shares.map((s) => ({ ...s })),
      splitDetail: derived.splitDetail,
    })
  })

  const view = () => (
    <ExpenseFormPlatformView
      mode="create"
      projectId="p1"
      members={members}
      draft={hook.result.current}
      canNotifyLine={false}
      submitting={false}
      submitError={null}
      onSubmit={onSubmit}
      {...overrides}
    />
  )
  const utils = render(view())
  const rerender = () => utils.rerender(view())
  return { hook, onSubmit, submissions, rerender, unmount: utils.unmount }
}

const openOptionalSection = () => {
  fireEvent.click(screen.getByRole("button", { name: /日期 · 地點 · 收據圖片/ }))
}

describe("ExpenseFormPlatformView", () => {
  it("renders the platform payer and split lists", () => {
    renderForm()
    expect(screen.getByText("誰付這筆")).toBeInTheDocument()
    expect(screen.getByText("誰一起分")).toBeInTheDocument()
    expect(screen.getByText("付款金額")).toBeInTheDocument()
    expect(screen.getByText("分攤金額")).toBeInTheDocument()
    expect(screen.getAllByText("小雨").length).toBeGreaterThan(0)
    expect(screen.getAllByText("志明").length).toBeGreaterThan(0)
  })

  it("hides the 均分 hint when only one member shares the expense", () => {
    renderForm({}, { seedPool: false })
    expect(screen.getByRole("button", { name: /查看小雨的分帳明細/ })).toBeInTheDocument()
    expect(screen.queryByText("均分")).not.toBeInTheDocument()
  })

  it("selects every member from the 誰付這筆 section", () => {
    const { hook, rerender } = renderForm({}, { seedPool: false })
    const payerSection = document.getElementById("expense-payer-section") as HTMLElement
    fireEvent.click(within(payerSection).getByRole("button", { name: "全選" }))
    rerender()

    expect(hook.result.current.state.payerIds).toEqual(["a", "b"])
    const allSelected = within(payerSection).getByRole("button", { name: "取消全選" })
    fireEvent.click(allSelected)
    rerender()
    expect(hook.result.current.state.payerIds).toEqual([])
  })

  it("shows the 均分 hint when several members share the expense", () => {
    renderForm()
    expect(screen.getAllByText("均分").length).toBeGreaterThan(0)
  })

  it("keeps the ledger variant available for the demo comparison", () => {
    renderForm({ variant: "ledger" })
    expect(screen.getByText("共同分攤")).toBeInTheDocument()
    expect(screen.queryByText("分攤金額")).not.toBeInTheDocument()
  })

  it("requires a description before submit", () => {
    renderForm({}, { description: null })
    expect(screen.getByRole("button", { name: /新增支出/ })).toBeDisabled()
    fireEvent.blur(screen.getByLabelText(/描述/))
    expect(screen.getByText("請填寫描述，讓大家知道這筆是什麼")).toBeInTheDocument()
  })

  it("sends description, shares and splitDetail on submit", () => {
    const { onSubmit, submissions } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: /新增支出/ }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(submissions[0].description).toBe("晚餐")
    expect(submissions[0].amount).toBe(100)
    expect(submissions[0].shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(100)
    expect(submissions[0].splitDetail).toBeNull()
  })

  it("shows the amount error only once", () => {
    renderForm({}, { amount: "" })
    expect(screen.getAllByRole("alert").map((el) => el.textContent?.trim())).toEqual(["請輸入金額"])
  })

  it("shows the split blocker in the footer and links to it", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setCustomShare("a", "200"))
    rerender()

    expect(screen.getByRole("button", { name: /新增支出/ })).toBeDisabled()
    const alerts = screen.getAllByRole("alert").map((el) => el.textContent?.trim())
    expect(alerts).toHaveLength(1)
    expect(alerts.some((text) => text?.includes("固定金額"))).toBe(true)
    expect(alerts.some((text) => text?.includes("TWD 200"))).toBe(true)
    expect(screen.getByRole("button", { name: "查看" })).toBeInTheDocument()
  })

  it("caps an over-limit amount instead of accepting it", () => {
    const { rerender } = renderForm()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "999999999" } })
    rerender()
    expect(screen.getByLabelText("金額")).toHaveValue("99999999")
    expect(screen.getByText(/金額上限為 TWD 99,999,999/)).toBeInTheDocument()
  })

  it("opens a member sheet and pins a fixed share", () => {
    const { onSubmit, submissions, rerender } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: /查看小雨的分帳明細/ }))
    const sheet = screen.getByRole("dialog")
    expect(within(sheet).getByText("小雨 的分帳明細")).toBeInTheDocument()

    fireEvent.click(within(sheet).getByRole("button", { name: /均分/ }))
    fireEvent.change(within(sheet).getByLabelText("分攤金額"), { target: { value: "60" } })
    fireEvent.click(within(sheet).getByRole("button", { name: "完成" }))
    rerender()

    expect(screen.getByText("固定金額")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /新增支出/ }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect((submissions[0].splitDetail as { customShares: Record<string, number> }).customShares.a).toBe(60)
  })

  it("lets a blank personal-items row stay untouched", () => {
    renderForm()
    fireEvent.click(screen.getByRole("button", { name: /查看小雨的分帳明細/ }))
    const sheet = screen.getByRole("dialog")
    fireEvent.click(within(sheet).getByRole("button", { name: /個人項目/ }))
    expect(within(sheet).getByRole("button", { name: "新增品項" })).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole("button", { name: "完成" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /新增支出/ }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows the LINE notify toggle only when enabled", () => {
    const { hook, unmount } = renderForm({ canNotifyLine: true })
    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeInTheDocument()
    expect(screen.getByText("儲存後自動發送通知到群組")).toBeInTheDocument()

    fireEvent.click(checkbox)
    expect(hook.result.current.state.notifyLine).toBe(false)
    unmount()

    renderForm({ canNotifyLine: false })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("uses the edit LINE notify copy", () => {
    renderForm({ mode: "edit", canNotifyLine: true })
    expect(screen.getByText("變更後自動發送通知到群組")).toBeInTheDocument()
  })

  it("keeps personal items after the sheet closes", () => {
    const { rerender, onSubmit, submissions } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: /查看小雨的分帳明細/ }))
    const sheet = screen.getByRole("dialog")
    fireEvent.click(within(sheet).getByRole("button", { name: /個人項目/ }))
    fireEvent.click(within(sheet).getByRole("button", { name: "新增品項" }))
    rerender()

    fireEvent.change(within(sheet).getByLabelText("品項名稱 1"), { target: { value: "咖啡" } })
    fireEvent.change(within(sheet).getByLabelText("品項金額 1"), { target: { value: "20" } })
    rerender()

    fireEvent.click(within(sheet).getByRole("button", { name: "完成" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: /新增支出/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(
      (submissions[0].splitDetail as { personalItems: Record<string, { name: string; amount: number }[]> })
        .personalItems.a,
    ).toEqual([{ name: "咖啡", amount: 20 }])
  })

  it("revokes the previous preview URL when replacing an image", () => {
    const { rerender } = renderForm()
    openOptionalSection()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const first = new File(["a"], "first.png", { type: "image/png" })
    const second = new File(["b"], "second.png", { type: "image/png" })

    fireEvent.change(input, { target: { files: [first] } })
    rerender()
    createObjectURL.mockReturnValue("blob:second")
    fireEvent.change(input, { target: { files: [second] } })
    rerender()

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first")
    fireEvent.click(screen.getByRole("button", { name: "移除照片" }))
    rerender()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second")
  })

  it("shows the edit delete action", () => {
    const onRequestDelete = vi.fn()
    renderForm({ mode: "edit", onRequestDelete })
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(onRequestDelete).toHaveBeenCalledTimes(1)
  })

  it("keeps submit enabled after a server error so the user can retry", () => {
    const { onSubmit } = renderForm({ submitError: "存檔失敗" })
    expect(screen.getByRole("alert")).toHaveTextContent("存檔失敗")
    const button = screen.getByRole("button", { name: /新增支出/ })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("shows the server error and submitting state", () => {
    renderForm({ submitError: "存檔失敗", submitting: true })
    expect(screen.getByRole("alert")).toHaveTextContent("存檔失敗")
    expect(screen.getByRole("button", { name: "儲存中..." })).toBeDisabled()
  })
})
