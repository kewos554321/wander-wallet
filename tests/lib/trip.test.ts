import { describe, it, expect } from "vitest"
import { getTripStatus, getTripDays, formatTripDateRange, getGreeting } from "@/lib/trip"

// Local-time dates keep the assertions timezone independent.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

describe("getTripStatus", () => {
  const now = new Date(2026, 10, 16, 12) // 2026-11-16 12:00 local

  it("is active without an end date", () => {
    expect(getTripStatus(null, now)).toBe("active")
  })

  it("is active on the last day", () => {
    expect(getTripStatus(local(2026, 11, 16, 0), now)).toBe("active")
  })

  it("is completed after the last day", () => {
    expect(getTripStatus(local(2026, 11, 15), now)).toBe("completed")
  })
})

describe("getTripDays", () => {
  it("counts both ends", () => {
    expect(getTripDays(local(2026, 11, 12), local(2026, 11, 16))).toBe(5)
  })

  it("is 1 for a same-day trip", () => {
    expect(getTripDays(local(2026, 11, 12), local(2026, 11, 12))).toBe(1)
  })

  it("is null when a date is missing", () => {
    expect(getTripDays(null, local(2026, 11, 16))).toBeNull()
    expect(getTripDays(local(2026, 11, 12), null)).toBeNull()
  })
})

describe("formatTripDateRange", () => {
  it("formats a full range", () => {
    expect(formatTripDateRange(local(2026, 11, 12), local(2026, 11, 16))).toBe("11/12 – 11/16")
  })

  it("formats a start date only", () => {
    expect(formatTripDateRange(local(2026, 9, 20), null)).toBe("9/20 出發")
  })

  it("handles no dates", () => {
    expect(formatTripDateRange(null, null)).toBe("尚未設定日期")
    expect(formatTripDateRange(null, local(2026, 9, 25))).toBe("尚未設定日期")
  })
})

describe("getGreeting", () => {
  it.each([
    [3, "晚安"],
    [5, "早安"],
    [10, "早安"],
    [11, "午安"],
    [17, "午安"],
    [18, "晚安"],
  ])("hour %i → %s", (hour, expected) => {
    expect(getGreeting(new Date(2026, 0, 1, hour))).toBe(expected)
  })
})
