"use client"

// Thin adapter between one AI-parsed item and the shared expense form fields.
// The item is already a DraftState, so the same actions/derivation the
// add-expense page uses can drive it without a second form model.

import { useMemo } from "react"
import { ExpenseFormFields } from "@/components/v2/expense-form/expense-form-fields"
import { createDraftActions, deriveExpenseDraft, type Draft, type DraftMember, type DraftState } from "@/lib/expense-draft"
import type { QuickItem } from "@/lib/quick-expense/draft"
import type { PreviewRateInfo } from "@/lib/currency-conversion"
import type { RecentRate } from "@/lib/recent-rates"

export function QuickItemCard({
  item,
  members,
  onChange,
  projectCurrency,
  displayCurrency,
  previewRateInfo,
  rateContext,
  recentRates,
}: {
  item: QuickItem
  members: DraftMember[]
  onChange: (updater: (state: DraftState) => DraftState) => void
  projectCurrency?: string
  displayCurrency?: string
  previewRateInfo?: (currency: string) => PreviewRateInfo
  rateContext?: (currency: string) => { liveRate: number | null; liveTimestamp: number | null }
  recentRates?: (currency: string) => RecentRate[]
}) {
  const actions = useMemo(() => createDraftActions(onChange, members), [onChange, members])
  const derived = useMemo(
    () =>
      deriveExpenseDraft({
        state: item,
        members,
        projectCurrency: projectCurrency ?? item.currency,
        participantOrder: members.map((m) => m.id),
        previewRateInfo,
      }),
    [item, members, projectCurrency, previewRateInfo],
  )
  const draft: Draft = { state: item, actions, derived }

  return (
    <ExpenseFormFields
      draft={draft}
      members={members}
      projectCurrency={projectCurrency}
      displayCurrency={displayCurrency}
      rateContext={rateContext}
      recentRates={recentRates}
      showNotifyLine={false}
      mode="quick"
    />
  )
}
