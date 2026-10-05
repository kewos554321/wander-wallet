import { describe, it, expect } from "vitest"
import { nextOffset, SWIPE_OPEN } from "@/components/v2/expenses/swipe-math"

describe("nextOffset", () => {
  it("snaps back when movement is below the threshold", () => {
    expect(nextOffset(100, 130, 0)).toBe(0)
    expect(nextOffset(100, 70, 0)).toBe(0)
  })

  it("opens to the left when dragged left past the threshold", () => {
    expect(nextOffset(100, 50, 0)).toBe(-SWIPE_OPEN)
  })

  it("opens to the right when dragged right past the threshold", () => {
    expect(nextOffset(100, 150, 0)).toBe(SWIPE_OPEN)
  })

  it("closes when tapping an already open row", () => {
    expect(nextOffset(100, 100, SWIPE_OPEN)).toBe(0)
    expect(nextOffset(100, 100, -SWIPE_OPEN)).toBe(0)
  })

  it("keeps the open side when dragged further", () => {
    expect(nextOffset(100, 30, -SWIPE_OPEN)).toBe(-SWIPE_OPEN)
    expect(nextOffset(100, 170, SWIPE_OPEN)).toBe(SWIPE_OPEN)
  })

  it("clamps to the open width for long drags", () => {
    expect(nextOffset(100, -900, 0)).toBe(-SWIPE_OPEN)
    expect(nextOffset(100, 900, 0)).toBe(SWIPE_OPEN)
  })

  it("ignores a gesture without horizontal movement", () => {
    expect(nextOffset(100, 100, 0)).toBe(0)
  })
})
