import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { useExpenseDraft, type DraftExpense } from "@/components/v2/expense-form/use-expense-draft"
import { SplitDetailSheet } from "@/components/v2/expense-form/split-detail-sheet"

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
        查看我
      </button>
      <output data-testid="items">{JSON.stringify(draft.state.personalItems)}</output>
      <SplitDetailSheet
        open={open}
        onClose={() => setOpen(false)}
        members={DEMO_MEMBERS}
        draft={draft}
        memberId="me"
      />
    </>
  )
}

function openSheet() {
  render(<Harness />)
  const trigger = screen.getByRole("button", { name: "查看我" })
  trigger.focus()
  fireEvent.click(trigger)
  return trigger
}

describe("SplitDetailSheet", () => {
  it("renders the collapsed summary", () => {
    openSheet()
    expect(screen.getByRole("button", { name: /個人項目/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: /均分/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.getAllByText("$320")).toHaveLength(2)
    expect(screen.queryByLabelText("共同分攤金額")).not.toBeInTheDocument()
  })

  it("expands one section at a time and exposes a labelled region", () => {
    openSheet()
    fireEvent.click(screen.getByRole("button", { name: /個人項目/ }))
    expect(screen.getByRole("button", { name: /個人項目/ })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("region", { name: /個人項目/ })).toBeInTheDocument()
    expect(screen.getByText("尚未新增品項")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /均分/ }))
    expect(screen.queryByRole("region", { name: /個人項目/ })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: /均分/ })).toBeInTheDocument()
    expect(screen.getByLabelText("分攤金額")).toBeInTheDocument()
  })

  it("closes on Escape and returns focus to the trigger", () => {
    const trigger = openSheet()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it("keeps 完成 enabled for a blank placeholder and removes it on close", () => {
    openSheet()
    fireEvent.click(screen.getByRole("button", { name: /個人項目/ }))
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    expect(screen.queryByText(/請填寫/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "完成" })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(JSON.parse(screen.getByTestId("items").textContent ?? "{}").me ?? []).toEqual([])
  })

  it("announces a clamped personal amount", () => {
    openSheet()
    fireEvent.click(screen.getByRole("button", { name: /個人項目/ }))
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    fireEvent.change(screen.getByLabelText("品項名稱 1"), { target: { value: "咖啡" } })
    fireEvent.change(screen.getByLabelText("品項金額 1"), { target: { value: "999999999" } })
    const note = screen.getByText(/上限/)
    expect(note).toHaveAttribute("role", "status")
    expect(note).toHaveAttribute("id", "personal-limit-note")
    expect(screen.getByLabelText("品項金額 1")).toHaveAttribute("aria-describedby", "personal-limit-note")
  })

  it("returns the summary to — after deleting the last item", () => {
    openSheet()
    fireEvent.click(screen.getByRole("button", { name: /個人項目/ }))
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    fireEvent.change(screen.getByLabelText("品項名稱 1"), { target: { value: "咖啡" } })
    fireEvent.change(screen.getByLabelText("品項金額 1"), { target: { value: "120" } })
    expect(screen.getByText("$120")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "刪除項目" }))
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.getAllByText("$320")).toHaveLength(2)
  })

  it("disables 完成 for a touched incomplete row", () => {
    openSheet()
    fireEvent.click(screen.getByRole("button", { name: /個人項目/ }))
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    fireEvent.change(screen.getByLabelText("品項名稱 1"), { target: { value: "咖啡" } })
    expect(screen.getByText("請填寫金額")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "完成" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "關閉" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByTestId("items")).not.toHaveTextContent("{}")
  })
})
