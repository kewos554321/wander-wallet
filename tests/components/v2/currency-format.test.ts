import { describe, it, expect } from "vitest"
import { formatRelativeTime, isRatesStale, customRateDiff, rateFromRates } from "@/components/v2/currency/format"

const NOW = new Date("2026-10-04T12:00:00.000Z").getTime()
const minutesAgo = (n: number) => NOW - n * 60 * 1000
const hoursAgo = (n: number) => NOW - n * 60 * 60 * 1000

describe("formatRelativeTime", () => {
  it("formats <1 minute as 剛剛", () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("剛剛")
  })
  it("formats minutes/hours/days", () => {
    expect(formatRelativeTime(minutesAgo(5), NOW)).toBe("5 分鐘前")
    expect(formatRelativeTime(hoursAgo(3), NOW)).toBe("3 小時前")
    expect(formatRelativeTime(hoursAgo(48), NOW)).toBe("2 天前")
  })
})

describe("isRatesStale", () => {
  it("is stale past 24h", () => {
    expect(isRatesStale(hoursAgo(25), NOW)).toBe(true)
    expect(isRatesStale(hoursAgo(1), NOW)).toBe(false)
  })
  it("treats null as not stale", () => {
    expect(isRatesStale(null, NOW)).toBe(false)
  })
})

describe("customRateDiff", () => {
  it("returns the percentage difference vs the live rate", () => {
    expect(customRateDiff(0.21, 0.214)).toBeCloseTo(-1.869, 2)
    expect(customRateDiff(0.214, 0.21)).toBeCloseTo(1.905, 2)
  })
})

describe("rateFromRates", () => {
  it("returns 1 for same currency", () => {
    expect(rateFromRates("TWD", "TWD", { JPY: 0.2 })).toBe(1)
  })
  it("returns the to/from ratio", () => {
    expect(rateFromRates("JPY", "TWD", { TWD: 1, JPY: 0.2 })).toBe(5)
  })
  it("never returns NaN with missing keys (Review Focus 2)", () => {
    expect(rateFromRates("JPY", "TWD", {})).toBe(1)
  })
})
