import { describe, it, expect } from "vitest"
import { computeDailyAverage } from "@/lib/settlement"

const local = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).toISOString()

describe("computeDailyAverage", () => {
  it("uses the trip length when both dates are set", () => {
    expect(computeDailyAverage(5000, { startDate: local(11, 12), endDate: local(11, 16) }, [local(11, 13)])).toBe(1000)
  })

  it("falls back to the span of expense dates", () => {
    expect(computeDailyAverage(900, { startDate: null, endDate: null }, [local(11, 15, 23), local(11, 13, 1), local(11, 14)])).toBe(300)
  })

  it("uses the expense span when only one trip date is set", () => {
    expect(computeDailyAverage(400, { startDate: local(11, 12), endDate: null }, [local(11, 12), local(11, 13)])).toBe(200)
  })

  it("is 0 without expenses and dates", () => {
    expect(computeDailyAverage(0, { startDate: null, endDate: null }, [])).toBe(0)
  })

  it("treats a single expense day as one day", () => {
    expect(computeDailyAverage(350, { startDate: null, endDate: null }, [local(11, 12)])).toBe(350)
  })
})
