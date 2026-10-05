import { describe, it, expect } from "vitest"
import { computePopoverPosition } from "@/components/v2/expenses/filter-popover"

const viewport = { viewportWidth: 390, viewportHeight: 844 }

describe("computePopoverPosition", () => {
  it("keeps a right-aligned panel attached to a left-column trigger", () => {
    // 歷史紀錄 付款日期 chip sits in column 1 (x 16..130). A 236px panel
    // cannot right-align to it without running off-screen, so it must anchor
    // to the trigger's left edge instead of clamping to x=4.
    const pos = computePopoverPosition({
      align: "right",
      trigger: { top: 218, bottom: 250, left: 16, right: 130 },
      panelWidth: 236,
      panelHeight: 300,
      ...viewport,
    })
    expect(pos.left).toBe(16)
  })

  it("right-aligns a panel on a right-column trigger", () => {
    // 全部支出 付款日期 chip sits in column 3 (x 260..374).
    const pos = computePopoverPosition({
      align: "right",
      trigger: { top: 344, bottom: 376, left: 260, right: 374 },
      panelWidth: 236,
      panelHeight: 300,
      ...viewport,
    })
    expect(pos.left).toBe(138)
  })

  it("left-aligns a panel on a left-column trigger", () => {
    const pos = computePopoverPosition({
      align: "left",
      trigger: { top: 100, bottom: 132, left: 16, right: 130 },
      panelWidth: 144,
      panelHeight: 300,
      ...viewport,
    })
    expect(pos.left).toBe(16)
  })

  it("clamps a right-aligned panel to the filter grid's left edge", () => {
    // Single-currency 360px layout: the grid content spans 16..344 and the
    // 付款日期 chip sits in column 2 (128..232). The 236px panel cannot
    // right-align to the chip without crossing the 金額 chip's left edge
    // (x=16), so it must be clamped to the grid's content box.
    const pos = computePopoverPosition({
      align: "right",
      trigger: { top: 344, bottom: 376, left: 128, right: 232 },
      panelWidth: 236,
      panelHeight: 300,
      viewportWidth: 360,
      viewportHeight: 844,
      bounds: { left: 16, right: 344 },
    })
    expect(pos.left).toBe(16)
  })

  it("falls back to the viewport when the panel is wider than its bounds", () => {
    const pos = computePopoverPosition({
      align: "right",
      trigger: { top: 100, bottom: 132, left: 128, right: 232 },
      panelWidth: 236,
      panelHeight: 300,
      viewportWidth: 360,
      viewportHeight: 844,
      bounds: { left: 200, right: 260 },
    })
    expect(pos.left).toBeGreaterThanOrEqual(4)
    expect(pos.left).toBeLessThanOrEqual(360 - 236 - 4)
  })

  it("flips the panel above the trigger when there is no room below", () => {
    const pos = computePopoverPosition({
      align: "left",
      trigger: { top: 760, bottom: 792, left: 16, right: 130 },
      panelWidth: 236,
      panelHeight: 300,
      ...viewport,
    })
    expect(pos.top).toBe(760 - 300 - 4)
  })
})
