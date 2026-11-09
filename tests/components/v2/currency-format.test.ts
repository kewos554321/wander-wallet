import { describe, it, expect } from "vitest"
import {
  formatRelativeTime,
  customRateDiff,
  rateFromRates,
  rateIfAvailable,
  rateDiffPercent,
  formatRate,
  formatRateDate,
  rateChip,
} from "@/components/v2/currency/format"

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

describe("rateIfAvailable", () => {
  it("returns the cross rate when both legs exist", () => {
    expect(rateIfAvailable("JPY", "TWD", { TWD: 1, JPY: 0.2 })).toBe(5)
  })
  it("returns null instead of guessing 1:1 when a leg is missing", () => {
    expect(rateIfAvailable("JPY", "TWD", { TWD: 1 })).toBeNull()
    expect(rateIfAvailable("JPY", "TWD", {})).toBeNull()
  })
  it("returns 1 for the same currency", () => {
    expect(rateIfAvailable("TWD", "TWD", {})).toBe(1)
  })
})

describe("rateDiffPercent", () => {
  it("returns the percentage difference against the baseline", () => {
    expect(rateDiffPercent(0.21, 0.214)).toBeCloseTo(-1.869, 2)
    expect(rateDiffPercent(0.214, 0.21)).toBeCloseTo(1.905, 2)
  })
  it("returns null when either value is missing or the baseline is zero", () => {
    expect(rateDiffPercent(null, 0.214)).toBeNull()
    expect(rateDiffPercent(0.21, null)).toBeNull()
    expect(rateDiffPercent(0.21, 0)).toBeNull()
  })
})

describe("formatRate", () => {
  it("uses significant digits rather than a fixed four decimals", () => {
    expect(formatRate(0.21456789)).toBe("0.214568")
    expect(formatRate(149.5)).toBe("149.5")
    expect(formatRate(1344.5678)).toBe("1344.57")
  })
})

describe("formatRateDate", () => {
  it("formats an ISO date with its year", () => {
    expect(formatRateDate("2026-11-06")).toBe("2026/11/6")
  })
})

describe("rateChip", () => {
  const now = new Date("2026-10-09T12:00:00")

  it("describes today's market rate as 市場 · 今天", () => {
    expect(rateChip({ kind: "market", date: now, now })).toEqual({
      chip: "市場",
      tone: "market",
      context: "今天",
    })
  })
  it("describes a past market rate as 市場 with its date", () => {
    const chip = rateChip({ kind: "market", date: new Date("2026-10-06T00:00:00"), now })
    expect(chip?.chip).toBe("市場")
    expect(chip?.context).toBe("10/6")
  })
  it("describes the custom kind", () => {
    expect(rateChip({ kind: "custom", date: null, now })).toEqual({
      chip: "自訂",
      tone: "custom",
      context: "手動輸入",
    })
  })
  it("returns null without a kind", () => {
    expect(rateChip({ kind: null, date: null, now })).toBeNull()
  })
})
