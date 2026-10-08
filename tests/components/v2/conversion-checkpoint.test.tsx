import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConversionCheckpoint } from "@/components/v2/expense-form/conversion-checkpoint"

describe("ConversionCheckpoint", () => {
  it("states that settlement converts before splitting, then the rate", () => {
    render(<ConversionCheckpoint currency="JPY" projectCurrency="TWD" rate={0.213504} />)
    const note = screen.getByLabelText("匯率換算")
    expect(note).toHaveTextContent("結算會先換匯，再以 TWD 分攤")
    expect(note).toHaveTextContent("1 JPY = 0.213504 TWD")
  })

  it("shows a dash when the rate is unknown", () => {
    render(<ConversionCheckpoint currency="JPY" projectCurrency="TWD" rate={null} />)
    expect(screen.getByLabelText("匯率換算")).toHaveTextContent("1 JPY = — TWD")
  })
})
