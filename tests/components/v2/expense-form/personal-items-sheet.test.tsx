import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { useExpenseDraft, type DraftExpense } from "@/components/v2/expense-form/use-expense-draft"
import { PersonalItemsSheet } from "@/components/v2/expense-form/personal-items-sheet"

const SEED: DraftExpense = {
  amount: 1280,
  currency: "JPY",
  exchangeRate: null,
  rateKind: null,
  rateDate: null,
  description: "拉麵",
  category: "food",
  payers: [{ memberId: "me", amount: 1280 }],
  expenseDate: "2026-10-11",
  location: null,
  latitude: null,
  longitude: null,
  image: null,
  participants: DEMO_MEMBERS.map((member) => ({ memberId: member.id, shareAmount: 320 })),
  splitDetail: null,
}

function Harness() {
  const [open, setOpen] = useState(false)
  const draft = useExpenseDraft(
    { members: DEMO_MEMBERS, currency: "JPY", projectCurrency: "TWD", paidBy: "me", expense: SEED },
    () => ({ rate: 0.215, source: "live" }),
  )
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        開啟
      </button>
      <output data-testid="items">{JSON.stringify(draft.state.personalItems)}</output>
      <PersonalItemsSheet open={open} onClose={() => setOpen(false)} members={DEMO_MEMBERS} draft={draft} memberId="me" />
    </>
  )
}

describe("PersonalItemsSheet", () => {
  it("removes blank placeholders when Escape closes the sheet", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "開啟" }))
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(JSON.parse(screen.getByTestId("items").textContent ?? "{}").me ?? []).toEqual([])
  })
})
