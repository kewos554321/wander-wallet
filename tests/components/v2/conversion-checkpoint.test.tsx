import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConversionCheckpoint } from "@/components/v2/expense-form/conversion-checkpoint"

describe("ConversionCheckpoint", () => {
  it("states that settlement converts before splitting, in the settlement currency", () => {
    render(<ConversionCheckpoint projectCurrency="TWD" />)
    expect(screen.getByLabelText("匯率換算")).toHaveTextContent("結算會先換匯，再以 TWD 分攤")
  })
})
