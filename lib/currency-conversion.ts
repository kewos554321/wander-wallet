import { getCurrencyDecimals } from "@/lib/constants/currencies"

/** Convert a major-unit amount (e.g. 10.57 USD) to integer minor units (1057). */
export function toMinorUnits(major: number, currencyCode: string): number {
  const factor = 10 ** getCurrencyDecimals(currencyCode)
  return Math.round(major * factor)
}

/** Convert integer minor units back to a major-unit amount. */
export function fromMinorUnits(minor: number, currencyCode: string): number {
  const factor = 10 ** getCurrencyDecimals(currencyCode)
  return minor / factor
}

/** Round a major-unit amount to the currency's nearest minor unit, returned in major units. */
export function roundMajorToMinor(major: number, currencyCode: string): number {
  return fromMinorUnits(toMinorUnits(major, currencyCode), currencyCode)
}

export interface AllocationWeights {
  id: string
  weight: number
}

export interface AllocationResult {
  allocations: Map<string, number>
  bumped: string[]
}

/**
 * Split `totalMinor` across weighted members as integers. Everyone gets
 * floor(exact); the remainder is handed out +1 at a time, lowest current
 * discrepancy first (ties in original order). The sum always equals totalMinor.
 */
export function allocate(
  totalMinor: number,
  weights: AllocationWeights[],
  discrepancy: Map<string, number>,
): AllocationResult {
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0)
  const effective = totalWeight === 0 ? weights.map((w) => ({ ...w, weight: 1 })) : weights
  const effTotal = totalWeight === 0 ? weights.length : totalWeight

  const allocations = new Map<string, number>()
  let assigned = 0
  for (const w of effective) {
    const v = Math.floor((totalMinor * w.weight) / effTotal)
    allocations.set(w.id, v)
    assigned += v
  }

  const remainder = totalMinor - assigned
  // Only members whose exact share was rounded down have a claim to a unit;
  // among them the lowest discrepancy wins (ties by original order). This keeps
  // every allocation within [floor(exact), ceil(exact)].
  const fractional = effective.filter((w) => {
    const exact = (totalMinor * w.weight) / effTotal
    return w.weight > 0 && exact > Math.floor(exact)
  })
  const positive = effective.filter((w) => w.weight > 0)
  const orderSource =
    fractional.length > 0 ? fractional : positive.length > 0 ? positive : effective
  const order = orderSource
    .map((w, i) => ({ id: w.id, i, d: discrepancy.get(w.id) ?? 0 }))
    .sort((a, b) => a.d - b.d || a.i - b.i)

  const bumped: string[] = []
  if (order.length > 0) {
    for (let k = 0; k < remainder; k++) {
      const id = order[k % order.length].id
      allocations.set(id, (allocations.get(id) ?? 0) + 1)
      bumped.push(id)
    }
  }

  return { allocations, bumped }
}

/**
 * Undo a previous `allocate` from the ledger: for each member subtract exactly
 * the extra they received (stored − floor(exact)). Returns the updated ledger.
 */
export function rollbackAllocation(
  totalMinor: number,
  weights: AllocationWeights[],
  stored: Map<string, number>,
  discrepancy: Map<string, number>,
): Map<string, number> {
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0)
  const effective = totalWeight === 0 ? weights.map((w) => ({ ...w, weight: 1 })) : weights
  const effTotal = totalWeight === 0 ? weights.length : totalWeight

  const next = new Map(discrepancy)
  for (const w of effective) {
    const floorShare = Math.floor((totalMinor * w.weight) / effTotal)
    const extra = (stored.get(w.id) ?? 0) - floorShare
    next.set(w.id, (next.get(w.id) ?? 0) - extra)
  }
  return next
}

export type RateSource = "fixed" | "live"
export interface ResolvedRate {
  rate: number
  source: "same" | "provided" | "fixed" | "seeded" | "live"
  shouldSeedFixed: boolean
}

/**
 * Decide which rate a new expense should bind to. Same currency → 1. An
 * explicit provided rate wins. Otherwise, fixed rate source uses the project
 * custom rate (seeding from live when absent); live uses the live rate.
 */
export function resolveRate(input: {
  currency: string
  projectCurrency: string
  provided?: number | null
  rateSource: RateSource
  customRate?: number | null
  liveRate?: number | null
}): ResolvedRate {
  const { currency, projectCurrency, provided, rateSource, customRate, liveRate } = input

  if (currency === projectCurrency) {
    return { rate: 1, source: "same", shouldSeedFixed: false }
  }
  if (provided != null) {
    return { rate: provided, source: "provided", shouldSeedFixed: false }
  }
  if (rateSource === "live") {
    return { rate: liveRate ?? 1, source: "live", shouldSeedFixed: false }
  }
  if (customRate != null) {
    return { rate: customRate, source: "fixed", shouldSeedFixed: false }
  }
  return { rate: liveRate ?? 1, source: "seeded", shouldSeedFixed: liveRate != null }
}

/**
 * Resolve a display-only conversion rate (1 unit of `currency` = ? `projectCurrency`).
 * Prefers the project's fixed rate, else derives from live USD-based rates.
 * Returns null when no rate is known (so callers can hide the preview instead of
 * showing a misleading 1:1).
 */
export function previewRate(
  currency: string,
  projectCurrency: string,
  customRates: Record<string, number> | null | undefined,
  exchangeRates: Record<string, number> | null | undefined,
): number | null {
  if (!currency || currency === projectCurrency) return null
  const custom = customRates?.[currency]
  if (typeof custom === "number" && custom > 0) return custom
  if (!exchangeRates) return null
  const fromRate = exchangeRates[currency]
  const toRate = exchangeRates[projectCurrency]
  if (!fromRate || !toRate) return null
  const rate = toRate / fromRate
  return rate > 0 && Number.isFinite(rate) ? rate : null
}
