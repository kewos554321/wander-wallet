"use client"

import { useMemo, useState } from "react"
import { buildSplitDetail, computeShares, type SplitDetail } from "@/lib/expense-split"
import { derivePayerShares, type PayerShare } from "@/lib/expense-payers"
import type { PreviewRateInfo } from "@/lib/currency-conversion"
import {
  deriveSplit,
  newSplitItem,
  withAddedItem,
  withClearedCustomShare,
  withCustomShare,
  withPersonalAll,
  withPoolAll,
  withRemovedItem,
  withToggledPersonalMember,
  withToggledPool,
  withUpdatedItem,
  type SplitDraftItem,
} from "@/lib/split-draft"

export type DraftItem = SplitDraftItem

export interface DraftMember {
  id: string
  displayName: string
  image?: string | null
  /** Per-project remainder ledger; decides which member absorbs a rounding unit. */
  remainderDiscrepancy?: number
}

export interface DraftExpense {
  amount: number
  currency: string
  exchangeRate?: number | null
  description: string | null
  category: string | null
  payers: { memberId: string; amount: number }[]
  expenseDate: string
  location: string | null
  latitude: number | null
  longitude: number | null
  image: string | null
  participants: { memberId: string; shareAmount: number }[]
  splitDetail: SplitDetail | null
}

export interface DraftInit {
  members: DraftMember[]
  currency: string
  /** Settlement currency; defaults to `currency` when omitted. */
  projectCurrency?: string
  paidBy: string
  expense?: DraftExpense
}

// Sequential ids for locally-created draft items come from lib/split-draft so
// the AI quick-expense flow shares the same generator.

function initialState(init: DraftInit) {
  const e = init.expense
  if (!e) {
    return {
      amount: "",
      currency: init.currency,
      exchangeRate: "",
      ratePinned: false,
      description: "",
      category: "",
      payerIds: init.paidBy ? [init.paidBy] : ([] as string[]),
      pinnedPayerAmounts: {} as Record<string, string>,
      expenseDate: new Date(),
      location: { location: null as string | null, latitude: null as number | null, longitude: null as number | null },
      image: { image: null as string | null, pendingFile: null as File | null, preview: null as string | null },
      notifyLine: true,
      // Start aligned with the payer (only the current user) so a new expense
      // is not silently split across the whole project; add co-splitters via
      // the member pills or 全選.
      pool: init.paidBy ? [init.paidBy] : init.members.slice(0, 1).map((m) => m.id),
      personalMode: false,
      personalItems: {} as Record<string, DraftItem[]>,
      personalMembers: [] as string[],
      customShares: {} as Record<string, string>,
    }
  }

  const payerIds = e.payers.map((p) => p.memberId)
  // Seed pinned amounts only when the stored split is not a plain equal split,
  // so re-saving keeps custom amounts without pinning a plain equal split.
  const equal = derivePayerShares({ amount: e.amount, payerIds, pinned: {}, currency: e.currency }).shares
  const isEqualPayerSplit =
    payerIds.length > 0 &&
    e.payers.length === equal.length &&
    e.payers.every((p, i) => Math.abs(Number(p.amount) - equal[i].amount) <= 0.01)
  const pinnedPayerAmounts: Record<string, string> = {}
  if (!isEqualPayerSplit) {
    for (const p of e.payers) pinnedPayerAmounts[p.memberId] = String(Number(p.amount))
  }

  const detail = e.splitDetail
  if (!detail) {
    // Legacy split with no stored splitDetail: a plain equal split also has no
    // stored detail, so we can't tell the two apart from `splitDetail` alone.
    // Compare the stored shares against what a fresh equal split (same
    // computeShares/order a real one would use) would produce; if they
    // differ, seed customShares from every stored share so re-saving keeps
    // the original split instead of silently flattening it to equal. This
    // mirrors v1's "all fixed" legacy fallback (components/expense/expense-form.tsx).
    const participantIds = e.participants.map((p) => p.memberId)
    const equalShares = computeShares({ amount: e.amount, participantIds, personalItems: {}, customShares: {} })
    const isEqual = e.participants.every((p, i) => Math.abs(p.shareAmount - equalShares[i].shareAmount) <= 0.01)
    const customShares: Record<string, string> = {}
    if (!isEqual) {
      for (const p of e.participants) customShares[p.memberId] = String(p.shareAmount)
    }
    return {
      amount: String(e.amount),
      currency: e.currency,
      exchangeRate: e.exchangeRate != null ? String(e.exchangeRate) : "",
      ratePinned: e.exchangeRate != null,
      description: e.description ?? "",
      category: e.category ?? "",
      payerIds,
      pinnedPayerAmounts,
      expenseDate: new Date(e.expenseDate),
      location: { location: e.location, latitude: e.latitude, longitude: e.longitude },
      image: { image: e.image, pendingFile: null, preview: null },
      notifyLine: true,
      pool: participantIds,
      personalMode: false,
      personalItems: {} as Record<string, DraftItem[]>,
      personalMembers: [] as string[],
      customShares,
    }
  }
  // A member is "personal-only" when their custom share is 0 and they have personal
  // items: they were removed from the shared pool but still hold their own items.
  const personalOnly = new Set(
    Object.entries(detail?.customShares ?? {})
      .filter(([id, v]) => v === 0 && (detail?.personalItems[id]?.length ?? 0) > 0)
      .map(([id]) => id)
  )
  const personalItems: Record<string, DraftItem[]> = {}
  for (const [id, items] of Object.entries(detail?.personalItems ?? {})) {
    personalItems[id] = items.map((i) => newSplitItem(i.name, String(i.amount)))
  }
  const customShares: Record<string, string> = {}
  for (const [id, v] of Object.entries(detail?.customShares ?? {})) {
    if (!personalOnly.has(id)) customShares[id] = String(v)
  }
  return {
    amount: String(e.amount),
    currency: e.currency,
    exchangeRate: e.exchangeRate != null ? String(e.exchangeRate) : "",
    ratePinned: e.exchangeRate != null,
    description: e.description ?? "",
    category: e.category ?? "",
    payerIds,
    pinnedPayerAmounts,
    expenseDate: new Date(e.expenseDate),
    location: { location: e.location, latitude: e.latitude, longitude: e.longitude },
    image: { image: e.image, pendingFile: null, preview: null },
    notifyLine: true,
    pool: e.participants.map((p) => p.memberId).filter((id) => !personalOnly.has(id)),
    personalMode: Object.keys(personalItems).length > 0,
    personalItems,
    personalMembers: Object.keys(personalItems),
    customShares,
  }
}

export function useExpenseDraft(init: DraftInit, previewRateInfo?: (currency: string) => PreviewRateInfo) {
  const [state, setState] = useState(() => initialState(init))
  const set = <K extends keyof typeof state>(key: K) => (value: (typeof state)[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const actions = {
    setAmount: set("amount"),
    setCurrency: (code: string) =>
      // Changing currency invalidates a previously-bound rate for this expense.
      setState((s) => ({ ...s, currency: code, exchangeRate: "", ratePinned: false })),
    setExchangeRate: set("exchangeRate"),
    setRatePinned: set("ratePinned"),
    setDescription: set("description"),
    setCategory: set("category"),
    setExpenseDate: set("expenseDate"),
    setLocation: set("location"),
    setImage: set("image"),
    setNotifyLine: set("notifyLine"),
    setPersonalMode: set("personalMode"),
    // Payer actions: selection is multi-select; `pinnedPayerAmounts` holds
    // manually-set amounts (absent = auto/equal).
    togglePayer: (id: string) =>
      setState((s) => {
        const payerIds = s.payerIds.includes(id) ? s.payerIds.filter((x) => x !== id) : [...s.payerIds, id]
        const pinnedPayerAmounts = { ...s.pinnedPayerAmounts }
        if (!payerIds.includes(id)) delete pinnedPayerAmounts[id]
        return { ...s, payerIds, pinnedPayerAmounts }
      }),
    setPayersAll: (selectAll: boolean) =>
      setState((s) => ({
        ...s,
        payerIds: selectAll ? init.members.map((m) => m.id) : [],
        pinnedPayerAmounts: selectAll ? s.pinnedPayerAmounts : {},
      })),
    setPayerAmount: (id: string, value: string) =>
      setState((s) => {
        const pinnedPayerAmounts = { ...s.pinnedPayerAmounts }
        if (value.trim() === "") delete pinnedPayerAmounts[id]
        else pinnedPayerAmounts[id] = value
        return { ...s, pinnedPayerAmounts }
      }),
    clearPayerAmount: (id: string) =>
      setState((s) => {
        const pinnedPayerAmounts = { ...s.pinnedPayerAmounts }
        delete pinnedPayerAmounts[id]
        return { ...s, pinnedPayerAmounts }
      }),
    togglePool: (id: string) => setState((s) => ({ ...s, ...withToggledPool(s, id) })),
    setPoolAll: (selectAll: boolean) => setState((s) => ({ ...s, ...withPoolAll(s, init.members.map((m) => m.id), selectAll) })),
    togglePersonalMember: (id: string) => setState((s) => ({ ...s, ...withToggledPersonalMember(s, id) })),
    setPersonalAll: (selectAll: boolean) =>
      setState((s) => ({ ...s, ...withPersonalAll(s, init.members.map((m) => m.id), selectAll) })),
    addItem: (memberId: string) => setState((s) => ({ ...s, ...withAddedItem(s, memberId) })),
    updateItem: (memberId: string, itemId: string, field: "name" | "amount", value: string) =>
      setState((s) => ({ ...s, ...withUpdatedItem(s, memberId, itemId, field, value) })),
    removeItem: (memberId: string, itemId: string) => setState((s) => ({ ...s, ...withRemovedItem(s, memberId, itemId) })),
    setCustomShare: (memberId: string, value: string) => setState((s) => ({ ...s, ...withCustomShare(s, memberId, value) })),
    clearCustomShare: (memberId: string) => setState((s) => ({ ...s, ...withClearedCustomShare(s, memberId) })),
  }

  // In edit mode, order participants the way the expense was originally
  // stored (falling back to member order for anyone newly added to the
  // pool). computeShares hands any rounding remainder to the first auto
  // member, so keeping the stored order keeps that remainder on the same
  // person instead of shifting it when the project's member order differs.
  const participantOrder = useMemo(() => {
    if (!init.expense) return init.members.map((m) => m.id)
    const stored = init.expense.participants.map((p) => p.memberId)
    const storedSet = new Set(stored)
    const extra = init.members.map((m) => m.id).filter((id) => !storedSet.has(id))
    return [...stored, ...extra]
  }, [init.expense, init.members])

  const projectCurrency = init.projectCurrency ?? init.currency
  const selectedCurrency = state.currency
  const isForeign = selectedCurrency !== projectCurrency
  const rateInfo = isForeign
    ? previewRateInfo?.(selectedCurrency) ?? { rate: null, source: "none" as const }
    : { rate: null, source: "same" as const }
  const autoRate = rateInfo.rate
  const exchangeRateInput = state.exchangeRate ?? ""
  const manualRate = exchangeRateInput.trim() ? Number(exchangeRateInput) : null
  const usableManual = manualRate != null && Number.isFinite(manualRate) && manualRate > 0 ? manualRate : null
  const customRate = state.ratePinned ?? false
  const rate = customRate ? usableManual ?? autoRate : autoRate
  const rateSource = customRate ? ("custom" as const) : rateInfo.source

  const derived = useMemo(() => {
    const amountNum = Number(state.amount)
    const discrepancy = Object.fromEntries(init.members.map((m) => [m.id, m.remainderDiscrepancy ?? 0]))
    // Same currency always allocates (rate 1); foreign needs a known rate.
    const context =
      rate != null || !isForeign
        ? { currency: selectedCurrency, projectCurrency, rate: rate ?? 1, discrepancy }
        : undefined
    const base = deriveSplit(amountNum, participantOrder, state, context)

    const pinnedNumbers: Record<string, number> = {}
    for (const [id, value] of Object.entries(state.pinnedPayerAmounts)) {
      pinnedNumbers[id] = Number(value) || 0
    }
    const payerResult = derivePayerShares({ amount: amountNum, payerIds: state.payerIds, pinned: pinnedNumbers, currency: state.currency })
    const payers: PayerShare[] = payerResult.shares
    const payerTotal = payers.reduce((s, p) => s + p.amount, 0)
    const payerMatches = payerResult.ok && Math.abs(payerTotal - amountNum) <= 0.01
    const primaryPayer = state.payerIds.length > 0
      ? payers.reduce((best, p) => (p.amount > best.amount ? p : best), payers[0]).memberId
      : ""

    let error: string | null = null
    const unnamed = base.splitInput.participantIds.find((id) =>
      (state.personalMode ? state.personalItems[id] ?? [] : []).some((i) => !i.name.trim())
    )
    if (state.amount.trim() === "" || !Number.isFinite(amountNum) || amountNum < 0) error = "請輸入有效金額"
    else if (state.payerIds.length === 0) error = "請選擇付款成員"
    else if (!payerResult.ok) error = "付款金額合計超過支出金額"
    else if (!payerMatches) error = "付款金額與支出金額不符"
    else if (base.splitInput.participantIds.length === 0) error = "請選擇至少一位分擔者"
    else if (unnamed) error = `${init.members.find((m) => m.id === unnamed)?.displayName} 有個人項目未填寫名稱`
    else if (base.personalTotal > base.splitInput.amount) error = "個人項目總額不可超過支出總額"
    else if (!base.matches) error = "分攤金額與支出金額不符"

    return {
      ...base,
      splitDetail: buildSplitDetail(base.splitInput),
      payers,
      payerTotal,
      payerMatches,
      primaryPayerId: primaryPayer,
      error,
      rate,
      autoRate,
      customRate,
      rateSource,
      rateInput: exchangeRateInput,
      rateEditable: isForeign,
    }
  }, [state, init.members, participantOrder, rate, autoRate, customRate, rateSource, exchangeRateInput, isForeign, selectedCurrency, projectCurrency])

  return { state, actions, derived }
}
