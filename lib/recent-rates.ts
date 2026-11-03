export interface RecentRate {
  rate: number
  kind: "market" | "custom"
  /** The market day the rate reflects, when it was a feed rate. */
  date: string | null
  /** The expense the rate came from, for the reuse list. */
  description: string | null
}

export interface RecentRateExpense {
  currency: string
  /** A number, or a string when the API serialized a Prisma Decimal over JSON. */
  exchangeRate: number | string | null
  rateKind: string | null
  rateDate: string | null
  description: string | null
  expenseDate: string
}

/**
 * The rates recently used on this project's expenses for one foreign currency,
 * newest first, deduped by value and capped. Feeds the 自訂 tab's reuse list so
 * a traveller can reapply a rate they used earlier in the trip. Legacy
 * `rateKind === "project"` rows read as `custom` (the project-fixed concept is
 * retired). `exchangeRate` may arrive as a string (Prisma Decimal), so it is
 * coerced with `Number`.
 */
export function recentRatesFor(input: {
  expenses: RecentRateExpense[]
  fromCurrency: string
  limit?: number
}): RecentRate[] {
  const { expenses, fromCurrency, limit = 5 } = input
  const seen = new Set<number>()
  const rows: RecentRate[] = []

  const sorted = expenses
    .map((x) => ({ x, rate: Number(x.exchangeRate) }))
    .filter(({ x, rate }) => x.currency === fromCurrency && Number.isFinite(rate) && rate > 0)
    .sort((a, b) => new Date(b.x.expenseDate).getTime() - new Date(a.x.expenseDate).getTime())

  for (const { x, rate } of sorted) {
    if (seen.has(rate)) continue
    seen.add(rate)
    rows.push({
      rate,
      kind: x.rateKind === "market" ? "market" : "custom",
      date: x.rateDate,
      description: x.description,
    })
    if (rows.length >= limit) break
  }
  return rows
}
