import { allocate } from "@/lib/currency-conversion"

export interface WeightedMember {
  id: string
  weight: number
}

export interface DualAllocation {
  /** Allocated amounts in integer minor units of the ORIGINAL currency. */
  original: Map<string, number>
  /** Allocated amounts in integer minor units of the SETTLEMENT currency. */
  settlement: Map<string, number>
  /** Members whose ORIGINAL share took a rounding unit (+1 minor unit). */
  originalBumped: string[]
  /** Members who received a settlement remainder unit; the only ledger update. */
  bumped: string[]
}

/**
 * Allocate one set of weights across two totals (original and settlement) with
 * the same tail-account ordering, so both currencies hand any rounding
 * remainder to the same member in the same priority order. The ledger is read
 * for ordering but never mutated here; `bumped` is the settlement remainder,
 * which is the fairness event the caller persists.
 */
export function allocateBothCurrencies(
  originalTotalMinor: number,
  settlementTotalMinor: number,
  weights: WeightedMember[],
  discrepancy: Map<string, number>,
): DualAllocation {
  const original = allocate(originalTotalMinor, weights, discrepancy)
  const settlement = allocate(settlementTotalMinor, weights, discrepancy)
  return {
    original: original.allocations,
    settlement: settlement.allocations,
    originalBumped: original.bumped,
    bumped: settlement.bumped,
  }
}
