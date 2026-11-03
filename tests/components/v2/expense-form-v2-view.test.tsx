import { describe, expect, it } from "vitest"
import { act, render, renderHook, screen } from "@testing-library/react"
import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

function renderForm({ canNotifyLine = false }: { canNotifyLine?: boolean } = {}) {
  const hook = renderHook(() =>
    useExpenseDraft({ members, currency: "TWD", paidBy: "a", projectCurrency: "TWD" }),
  )
  act(() => {
    hook.result.current.actions.setAmount("100")
    hook.result.current.actions.setDescription("晚餐")
  })
  const utils = render(
    <ExpenseFormV2View
      mode="create"
      projectId="p1"
      members={members}
      draft={hook.result.current}
      canNotifyLine={canNotifyLine}
      submitting={false}
      submitError={null}
      onSubmit={() => {}}
    />,
  )
  return { hook, ...utils }
}

describe("ExpenseFormV2View (platform wrapper)", () => {
  it("renders the platform list layout", () => {
    renderForm()
    expect(screen.getByText("誰付這筆")).toBeInTheDocument()
    expect(screen.getByText("誰一起分")).toBeInTheDocument()
    expect(screen.getByText("分攤金額")).toBeInTheDocument()
  })

  it("keeps the create submit label", () => {
    renderForm()
    expect(screen.getByRole("button", { name: "新增支出 · TWD 100" })).toBeInTheDocument()
  })

  it("forwards canNotifyLine", () => {
    renderForm({ canNotifyLine: true })
    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })
})
