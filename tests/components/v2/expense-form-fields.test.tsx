import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ExpenseFormFields } from "@/components/v2/expense-form/expense-form-fields"
import {
  createDraftActions,
  deriveExpenseDraft,
  initialState,
  type Draft,
} from "@/lib/expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

function makeDraft(): Draft {
  const state = {
    ...initialState({ members, currency: "TWD", paidBy: "a" }),
    amount: "100",
    description: "午餐",
    category: "food",
    pool: ["a", "b"],
  }
  const actions = createDraftActions(() => {}, members)
  const derived = deriveExpenseDraft({
    state,
    members,
    projectCurrency: "TWD",
    participantOrder: ["a", "b"],
  })
  return { state, actions, derived }
}

describe("ExpenseFormFields", () => {
  it("renders the required description marker", () => {
    render(<ExpenseFormFields draft={makeDraft()} members={members} />)
    expect(screen.getByText(/描述/)).toBeInTheDocument()
    expect(screen.getByText("*")).toBeInTheDocument()
  })

  it("hides the LINE checkbox when showNotifyLine is false", () => {
    render(<ExpenseFormFields draft={makeDraft()} members={members} showNotifyLine={false} />)
    expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
  })

  it("writes amount edits back through the draft actions", () => {
    const draft = makeDraft()
    const setAmount = vi.fn()
    render(
      <ExpenseFormFields
        draft={{ ...draft, actions: { ...draft.actions, setAmount } }}
        members={members}
      />,
    )
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "120" } })
    expect(setAmount).toHaveBeenCalledWith("120")
  })
})
