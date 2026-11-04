"use client"

import { useMemo, useState } from "react"
import type { PreviewRateInfo } from "@/lib/currency-conversion"
import {
  createDraftActions,
  deriveExpenseDraft,
  deriveParticipantOrder,
  initialState,
  type Draft,
  type DraftInit,
} from "@/lib/expense-draft"

export type {
  Draft,
  DraftActions,
  DraftDerived,
  DraftExpense,
  DraftInit,
  DraftItem,
  DraftMember,
  DraftState,
} from "@/lib/expense-draft"

export function useExpenseDraft(init: DraftInit, previewRateInfo?: (currency: string) => PreviewRateInfo): Draft {
  const [state, setState] = useState(() => initialState(init))
  const actions = useMemo(() => createDraftActions((updater) => setState(updater), init.members), [init.members])
  const participantOrder = useMemo(
    () => deriveParticipantOrder(init.expense, init.members),
    [init.expense, init.members],
  )
  const projectCurrency = init.projectCurrency ?? init.currency
  const derived = useMemo(
    () => deriveExpenseDraft({ state, members: init.members, projectCurrency, participantOrder, previewRateInfo }),
    [state, init.members, projectCurrency, participantOrder, previewRateInfo],
  )
  return { state, actions, derived }
}
