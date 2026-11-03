import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="結算幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { NewProjectV2View } from "@/components/v2/new-project/new-project-v2-view"
import { emptyProjectForm } from "@/lib/hooks/use-project-form"
import { DEMO_FORM_VALUES } from "@/app/demo/_data/fixtures"

describe("NewProjectV2View", () => {
  it("shows the current values and calls onCreate", () => {
    const set = vi.fn()
    const onCreate = vi.fn()
    render(
      <NewProjectV2View values={DEMO_FORM_VALUES} set={set} submitting={false} error={null} onCreate={onCreate} />,
    )
    expect(screen.getByLabelText("旅程名稱")).toHaveValue("東京之旅")
    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    expect(onCreate).toHaveBeenCalled()
  })

  it("shows a server error in the footer when the form itself is valid", () => {
    render(
      <NewProjectV2View
        values={DEMO_FORM_VALUES}
        set={vi.fn()}
        submitting={false}
        error="建立失敗，請重試"
        onCreate={vi.fn()}
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("建立失敗，請重試")
  })

  it("shows a validation error next to the field, not in the footer", () => {
    render(
      <NewProjectV2View values={emptyProjectForm("TWD")} set={vi.fn()} submitting={false} error="請輸入旅程名稱" onCreate={vi.fn()} />,
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("請輸入旅程名稱")
    expect(alert.closest("div.rounded-\\[18px\\]")).toContainElement(screen.getByLabelText("旅程名稱"))
  })
})
