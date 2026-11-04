import type { Draft } from "@/lib/expense-draft"
import type { PayerShare } from "@/lib/expense-payers"
import type { ParticipantShare, SplitDetail } from "@/lib/expense-split"

// The expense API body shared by the add-expense form and the AI quick flow.
// Keeping one builder means a new field cannot be added to one path only.
export interface ExpensePayload {
  payers: PayerShare[]
  amount: number
  currency: string
  exchangeRate?: number | null
  rateKind?: "market" | "custom" | null
  rateDate?: string | null
  description: string | null
  category: string
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  participants: ParticipantShare[]
  splitDetail: SplitDetail | null
}

export function buildExpensePayload(draft: Pick<Draft, "state" | "derived">): ExpensePayload {
  const { state, derived } = draft
  return {
    payers: derived.payers,
    amount: derived.splitInput.amount,
    currency: state.currency,
    exchangeRate:
      state.ratePinned && state.exchangeRate?.trim() && Number(state.exchangeRate) > 0
        ? Number(state.exchangeRate)
        : undefined,
    rateKind: state.ratePinned ? state.rateKind ?? undefined : undefined,
    rateDate: state.ratePinned && state.rateKind === "market" ? state.rateDate ?? undefined : undefined,
    description: state.description.trim() || null,
    category: state.category || "other",
    location: state.location.location,
    latitude: state.location.latitude,
    longitude: state.location.longitude,
    expenseDate: state.expenseDate.toISOString(),
    participants: derived.weights.map((w) => ({ memberId: w.memberId, shareAmount: w.weight })),
    splitDetail: derived.splitDetail,
  }
}
