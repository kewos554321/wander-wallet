import {
  allocate,
  rollbackAllocation,
  roundMajorToMinor,
  toMinorUnits,
} from "@/lib/currency-conversion"

export interface ProjectAmountInput {
  amount: number
  currency: string
  projectCurrency: string
  rate: number
  participants: { memberId: string; shareAmount: number }[]
  payers: { memberId: string; amount: number }[]
  discrepancy: Map<string, number>
  previous?: {
    totalMinor: number
    participants: { memberId: string; shareAmount: number; shareAmountProject: number }[]
    payers: { memberId: string; amount: number; amountProject: number }[]
  }
}

export interface ProjectAmountResult {
  totalMinor: number
  participants: { memberId: string; shareAmountProject: number }[]
  payers: { memberId: string; amountProject: number }[]
  discrepancy: Map<string, number>
}

/**
 * Convert an expense to settlement-currency integer minor units and split both
 * the participant shares and payer amounts across members using the shared
 * per-member discrepancy ledger. When `previous` is supplied, the previous
 * allocation is rolled back first so an edit never double-counts.
 */
export function computeProjectAmounts(input: ProjectAmountInput): ProjectAmountResult {
  let discrepancy = new Map(input.discrepancy)

  if (input.previous) {
    discrepancy = rollbackAllocation(
      input.previous.totalMinor,
      input.previous.participants.map((p) => ({ id: p.memberId, weight: p.shareAmount })),
      new Map(input.previous.participants.map((p) => [p.memberId, p.shareAmountProject])),
      discrepancy,
    )
    discrepancy = rollbackAllocation(
      input.previous.totalMinor,
      input.previous.payers.map((p) => ({ id: p.memberId, weight: p.amount })),
      new Map(input.previous.payers.map((p) => [p.memberId, p.amountProject])),
      discrepancy,
    )
  }

  const totalMinor = toMinorUnits(
    roundMajorToMinor(input.amount * input.rate, input.projectCurrency),
    input.projectCurrency,
  )

  const participantResult = allocate(
    totalMinor,
    input.participants.map((p) => ({ id: p.memberId, weight: p.shareAmount })),
    discrepancy,
  )
  for (const id of participantResult.bumped) {
    discrepancy.set(id, (discrepancy.get(id) ?? 0) + 1)
  }

  const payerResult = allocate(
    totalMinor,
    input.payers.map((p) => ({ id: p.memberId, weight: p.amount })),
    discrepancy,
  )
  for (const id of payerResult.bumped) {
    discrepancy.set(id, (discrepancy.get(id) ?? 0) + 1)
  }

  return {
    totalMinor,
    participants: input.participants.map((p) => ({
      memberId: p.memberId,
      shareAmountProject: participantResult.allocations.get(p.memberId) ?? 0,
    })),
    payers: input.payers.map((p) => ({
      memberId: p.memberId,
      amountProject: payerResult.allocations.get(p.memberId) ?? 0,
    })),
    discrepancy,
  }
}
