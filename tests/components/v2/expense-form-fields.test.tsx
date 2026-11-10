import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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

function makeDraft(overrides: Partial<Draft["state"]> = {}, onSetCategory = vi.fn()): Draft {
  const state = {
    ...initialState({ members, currency: "TWD", paidBy: "a" }),
    amount: "100",
    description: "午餐",
    category: "food",
    pool: ["a", "b"],
    ...overrides,
  }
  const actions = { ...createDraftActions(() => {}, members), setCategory: onSetCategory }
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

  it("asks the classifier on description blur and applies the category", async () => {
    const categorize = vi.fn().mockResolvedValue({ category: "transport", confidence: 0.9 })
    const setCategory = vi.fn()
    render(
      <ExpenseFormFields
        draft={makeDraft({ category: "", description: "計程車" }, setCategory)}
        members={members}
        categorize={categorize}
      />,
    )

    fireEvent.blur(screen.getByLabelText(/描述/))

    await waitFor(() => expect(setCategory).toHaveBeenCalledWith("transport"))
    expect(categorize).toHaveBeenCalledWith("計程車")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("does not ask the classifier when a category is already set", () => {
    const categorize = vi.fn().mockResolvedValue({ category: "transport", confidence: 0.9 })
    render(
      <ExpenseFormFields
        draft={makeDraft({ category: "food", description: "計程車" })}
        members={members}
        categorize={categorize}
      />,
    )

    fireEvent.blur(screen.getByLabelText(/描述/))

    expect(categorize).not.toHaveBeenCalled()
  })

  it("does not ask the classifier in edit mode", () => {
    const categorize = vi.fn().mockResolvedValue({ category: "transport", confidence: 0.9 })
    render(
      <ExpenseFormFields
        mode="edit"
        draft={makeDraft({ category: "", description: "計程車" })}
        members={members}
        categorize={categorize}
      />,
    )

    fireEvent.blur(screen.getByLabelText(/描述/))

    expect(categorize).not.toHaveBeenCalled()
  })

  it("keeps the form unchanged when classification fails", async () => {
    const categorize = vi.fn().mockRejectedValue(new Error("boom"))
    const setCategory = vi.fn()
    render(
      <ExpenseFormFields
        draft={makeDraft({ category: "", description: "計程車" }, setCategory)}
        members={members}
        categorize={categorize}
      />,
    )

    fireEvent.blur(screen.getByLabelText(/描述/))

    await waitFor(() => expect(categorize).toHaveBeenCalledWith("計程車"))
    expect(setCategory).not.toHaveBeenCalled()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
