"use client"

import { useMemo, useState } from "react"
import {
  buildSplitDetail,
  computeShares,
  type SplitDetail,
  type SplitInput,
} from "@/lib/expense-split"

export interface DraftItem {
  id: string
  name: string
  amount: string
}

export interface DraftMember {
  id: string
  displayName: string
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

// Sequential id generator for locally-created draft items (not persisted).
let itemSeq = 0
const newItem = (name = "", amount = ""): DraftItem => ({ id: `draft-item-${++itemSeq}`, name, amount })

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
    personalItems[id] = items.map((i) => newItem(i.name, String(i.amount)))
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
    togglePool: (id: string) =>
      setState((s) => {
        const next = s.pool.includes(id) ? s.pool.filter((x) => x !== id) : [...s.pool, id]
        const customShares = { ...s.customShares }
        if (!next.includes(id)) delete customShares[id]
        return { ...s, pool: next, customShares }
      }),
    setPoolAll: (selectAll: boolean) =>
      setState((s) => ({
        ...s,
        pool: selectAll ? init.members.map((m) => m.id) : [],
        customShares: selectAll ? s.customShares : {},
      })),
    togglePersonalMember: (id: string) =>
      setState((s) => {
        if (s.personalMembers.includes(id)) {
          const personalItems = { ...s.personalItems }
          delete personalItems[id]
          return { ...s, personalMembers: s.personalMembers.filter((x) => x !== id), personalItems }
        }
        return {
          ...s,
          personalMembers: [...s.personalMembers, id],
          personalItems: { ...s.personalItems, [id]: [newItem()] },
        }
      }),
    // Select all keeps existing items and gives newly added members one empty item;
    // deselect all drops every member's items.
    setPersonalAll: (selectAll: boolean) =>
      setState((s) => {
        if (!selectAll) return { ...s, personalMembers: [], personalItems: {} }
        const personalItems = { ...s.personalItems }
        for (const m of init.members) {
          if (!s.personalMembers.includes(m.id)) personalItems[m.id] = [newItem()]
        }
        return { ...s, personalMembers: init.members.map((m) => m.id), personalItems }
      }),
    addItem: (memberId: string) =>
      setState((s) => {
        const current = s.personalItems[memberId] ?? []
        if (current.length >= 20) return s
        return { ...s, personalItems: { ...s.personalItems, [memberId]: [...current, newItem()] } }
      }),
    updateItem: (memberId: string, itemId: string, field: "name" | "amount", value: string) =>
      setState((s) => ({
        ...s,
        personalItems: {
          ...s.personalItems,
          [memberId]: (s.personalItems[memberId] ?? []).map((i) => (i.id === itemId ? { ...i, [field]: value } : i)),
        },
      })),
    removeItem: (memberId: string, itemId: string) =>
      setState((s) => ({
        ...s,
        personalItems: { ...s.personalItems, [memberId]: (s.personalItems[memberId] ?? []).filter((i) => i.id !== itemId) },
      })),
    setCustomShare: (memberId: string, value: string) =>
      setState((s) => ({ ...s, customShares: { ...s.customShares, [memberId]: value } })),
    clearCustomShare: (memberId: string) =>
      setState((s) => {
        const customShares = { ...s.customShares }
        delete customShares[memberId]
        return { ...s, customShares }
      }),
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
    const withItems = (id: string) =>
      state.personalMode && state.personalMembers.includes(id) && (state.personalItems[id]?.length ?? 0) > 0
    const participantIds = participantOrder.filter((id) => state.pool.includes(id) || withItems(id))

    const personalItems: SplitInput["personalItems"] = {}
    if (state.personalMode) {
      for (const id of participantIds) {
        const items = state.personalItems[id] ?? []
        if (items.length > 0) personalItems[id] = items.map((i) => ({ name: i.name.trim(), amount: Number(i.amount) || 0 }))
      }
    }
    const customShares: SplitInput["customShares"] = {}
    for (const id of participantIds) {
      if (!state.pool.includes(id)) customShares[id] = 0
      else if ((state.customShares[id] ?? "").trim() !== "") customShares[id] = Number(state.customShares[id]) || 0
    }

    const splitInput: SplitInput = {
      amount: Number.isFinite(amountNum) ? amountNum : 0,
      participantIds,
      personalItems,
      customShares,
    }
    const shares = computeShares(splitInput)
    const personalTotal = Object.values(personalItems).flat().reduce((s, i) => s + i.amount, 0)
    const itemCount = Object.values(personalItems).flat().length
    const customTotal = Object.values(customShares).reduce((s, v) => s + v, 0)
    const autoRemaining = Math.round((splitInput.amount - personalTotal - customTotal) * 100) / 100
    const shareTotal = shares.reduce((s, x) => s + x.shareAmount, 0)
    const matches =
      shares.length > 0 && Math.abs(shareTotal - splitInput.amount) <= 0.01 && shares.every((s) => s.shareAmount >= 0)

    let error: string | null = null
    const unnamed = participantIds.find((id) =>
      (state.personalMode ? state.personalItems[id] ?? [] : []).some((i) => !i.name.trim())
    )
    if (state.amount.trim() === "" || !Number.isFinite(amountNum) || amountNum < 0) error = "請輸入有效金額"
    else if (!state.paidBy) error = "請選擇付款成員"
    else if (participantIds.length === 0) error = "請選擇至少一位分擔者"
    else if (unnamed) error = `${init.members.find((m) => m.id === unnamed)?.displayName} 有個人項目未填寫名稱`
    else if (personalTotal > splitInput.amount) error = "個人項目總額不可超過支出總額"
    else if (!matches) error = "分攤金額與支出金額不符"

    return {
      splitInput,
      shares,
      splitDetail: buildSplitDetail(splitInput),
      personalTotal,
      itemCount,
      autoRemaining,
      matches,
      error,
    }
  }, [state, init.members, participantOrder])

  return { state, actions, derived }
}
