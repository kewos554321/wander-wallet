import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CheckboxRow } from "@/components/v2/ui/checkbox-row"

describe("CheckboxRow", () => {
  it("reports toggles and renders label/description", () => {
    const onCheckedChange = vi.fn()
    render(
      <CheckboxRow
        checked={false}
        onCheckedChange={onCheckedChange}
        label="支出明細"
        description="每筆支出的日期、金額、類別、付款人"
      />
    )
    const box = screen.getByRole("checkbox")
    expect(box).not.toBeChecked()
    fireEvent.click(box)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByText("支出明細")).toBeInTheDocument()
    expect(screen.getByText("每筆支出的日期、金額、類別、付款人")).toBeInTheDocument()
  })

  it("reflects the checked state", () => {
    render(<CheckboxRow checked onCheckedChange={vi.fn()} label="結算資訊" />)
    expect(screen.getByRole("checkbox")).toBeChecked()
  })
})
