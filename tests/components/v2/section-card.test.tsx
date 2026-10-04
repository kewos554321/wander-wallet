import { describe, it, expect } from "vitest"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"

describe("expense form section card classes", () => {
  it("provides the shared card wrapper", () => {
    expect(SECTION_CARD).toContain("rounded-2xl")
    expect(SECTION_CARD).toContain("border-v2-line")
    expect(SECTION_CARD).toContain("bg-v2-surface")
    expect(SECTION_CARD).toContain("mx-4")
    expect(SECTION_CARD).toContain("mb-4")
    expect(SECTION_CARD).toContain("p-4")
  })

  it("provides the shared lake section title", () => {
    expect(SECTION_TITLE).toBe("text-[13px] font-bold text-v2-lake")
  })
})
