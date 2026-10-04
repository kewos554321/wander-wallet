"use client"

import { useMemo, useState } from "react"
import { buildSplitDetail, computeShares, type SplitDetail } from "@/lib/expense-split"
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
}

export interface DraftInit {
  members: DraftMember[]
  currency: string
  paidBy: string
  expense?: {
    amount: number
    currency: string
    description: string | null
    category: string | null
    paidByMemberId: string
    expenseDate: string
    location: string | null
    latitude: number | null
    longitude: number | null
    image: string | null
    participants: { memberId: string; shareAmount: number }[]
    splitDetail: SplitDetail | null
  }
}

// Sequential ids for locally-created draft items come from lib/split-draft so
// the AI quick-expense flow shares the same generator.

function initialState(init: DraftInit) {
  const e = init.expense
  if (!e) {
    return {
      amount: "",
      currency: init.currency,
      description: "",
      category: "",
      paidBy: init.paidBy,
      expenseDate: new Date(),
      location: { location: null as string | null, latitude: null as number | null, longitude: null as number | null },
      image: { image: null as string | null, pendingFile: null as File | null, preview: null as string | null },
      notifyLine: true,
      pool: init.members.map((m) => m.id),
      personalMode: false,
      personalItems: {} as Record<string, DraftItem[]>,
      personalMembers: [] as string[],
      customShares: {} as Record<string, string>,
    }
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
      description: e.description ?? "",
      category: e.category ?? "",
      paidBy: e.paidByMemberId,
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
    description: e.description ?? "",
    category: e.category ?? "",
    paidBy: e.paidByMemberId,
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

export function useExpenseDraft(init: DraftInit) {
  const [state, setState] = useState(() => initialState(init))
  const set = <K extends keyof typeof state>(key: K) => (value: (typeof state)[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const actions = {
    setAmount: set("amount"),
    setCurrency: set("currency"),
    setDescription: set("description"),
    setCategory: set("category"),
    setPaidBy: set("paidBy"),
    setExpenseDate: set("expenseDate"),
    setLocation: set("location"),
    setImage: set("image"),
    setNotifyLine: set("notifyLine"),
    setPersonalMode: set("personalMode"),
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

  const derived = useMemo(() => {
    const amountNum = Number(state.amount)
    const base = deriveSplit(amountNum, participantOrder, state)

    let error: string | null = null
    const unnamed = base.splitInput.participantIds.find((id) =>
      (state.personalMode ? state.personalItems[id] ?? [] : []).some((i) => !i.name.trim())
    )
    if (state.amount.trim() === "" || !Number.isFinite(amountNum) || amountNum < 0) error = "請輸入有效金額"
    else if (!state.paidBy) error = "請選擇付款成員"
    else if (base.splitInput.participantIds.length === 0) error = "請選擇至少一位分擔者"
    else if (unnamed) error = `${init.members.find((m) => m.id === unnamed)?.displayName} 有個人項目未填寫名稱`
    else if (base.personalTotal > base.splitInput.amount) error = "個人項目總額不可超過支出總額"
    else if (!base.matches) error = "分攤金額與支出金額不符"

    return { ...base, splitDetail: buildSplitDetail(base.splitInput), error }
  }, [state, init.members, participantOrder])

  return { state, actions, derived }
}
