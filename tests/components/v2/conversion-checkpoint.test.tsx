import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConversionCheckpoint } from "@/components/v2/expense-form/conversion-checkpoint"

describe("ConversionCheckpoint", () => {
  it("states the conversion rate then that the split uses the settlement currency", () => {
    render(<ConversionCheckpoint currency="JPY" projectCurrency="TWD" rate={0.213504} />)
    const note = screen.getByLabelText("匯率換算")
    expect(note).toHaveTextContent("1 JPY = 0.213504 TWD")
    expect(note).toHaveTextContent("以下以結算幣別 TWD 分攤與付款")
  })

  it("shows a dash when the rate is unknown", () => {
    render(<ConversionCheckpoint currency="JPY" projectCurrency="TWD" rate={null} />)
    expect(screen.getByLabelText("匯率換算")).toHaveTextContent("1 JPY = — TWD")
  })
})
