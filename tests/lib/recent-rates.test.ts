import { describe, it, expect } from "vitest"
import { recentRatesFor } from "@/lib/recent-rates"

type Row = {
  id?: string
  currency: string
  exchangeRate: number | null
  rateKind: string | null
  rateDate: string | null
  description: string | null
  expenseDate: string
}
const e = (o: Partial<Row> = {}): Row => ({
  id: "exp-1",
  currency: "JPY",
  exchangeRate: 0.215,
  rateKind: "market",
  rateDate: "2026-10-08",
  description: "晚餐",
  expenseDate: "2026-10-08",
  ...o,
})

describe("recentRatesFor", () => {
  it("lists foreign rates newest-first, deduped by rate, capped", () => {
    const rows = recentRatesFor({
      expenses: [
        e({}),
        e({ exchangeRate: 0.22, rateKind: "custom", description: "藥妝", expenseDate: "2026-10-06" }),
        e({ exchangeRate: 0.215, description: "dup", expenseDate: "2026-10-01" }),
        e({ currency: "TWD", exchangeRate: null, expenseDate: "2026-10-09" }),
      ],
      fromCurrency: "JPY",
    })
    expect(rows.map((r) => r.rate)).toEqual([0.215, 0.22])
  })

  it("caps at the limit", () => {
    const rows = recentRatesFor({
      expenses: Array.from({ length: 8 }, (_, i) =>
        e({ exchangeRate: 0.2 + i / 1000, description: `d${i}`, expenseDate: `2026-10-0${i + 1}` }),
      ),
      fromCurrency: "JPY",
      limit: 3,
    })
    expect(rows).toHaveLength(3)
  })

  it("maps a legacy project kind to custom", () => {
    expect(recentRatesFor({ expenses: [e({ rateKind: "project" })], fromCurrency: "JPY" })[0].kind).toBe("custom")
  })

  it("skips rows with no usable rate or the wrong currency", () => {
    const rows = recentRatesFor({
      expenses: [e({ exchangeRate: null }), e({ exchangeRate: 0 }), e({ currency: "USD" }), e({})],
      fromCurrency: "JPY",
    })
    expect(rows).toHaveLength(1)
  })

  it("accepts an exchangeRate serialized as a string (Prisma Decimal over JSON)", () => {
    const rows = recentRatesFor({
      expenses: [e({ exchangeRate: "0.215" as unknown as number })],
      fromCurrency: "JPY",
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].rate).toBe(0.215)
  })

  it("excludes the expense being edited, so the list shows earlier uses", () => {
    const rows = recentRatesFor({
      expenses: [
        e({ id: "self", exchangeRate: 0.215 }),
        e({ id: "prev", exchangeRate: 0.22, rateKind: "custom", expenseDate: "2026-10-06" }),
      ],
      fromCurrency: "JPY",
      excludeExpenseId: "self",
    })
    expect(rows.map((r) => r.rate)).toEqual([0.22])
  })
})
