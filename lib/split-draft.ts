import {
  computeShares,
  type ParticipantShare,
  type SplitInput,
} from "@/lib/expense-split"

// Editable split state shared by the expense form and the AI quick-expense
// flow. Amounts stay strings so partially typed input ("12.") survives edits.
export interface SplitDraftItem {
  id: string
  name: string
  amount: string
}

export interface SplitState {
  pool: string[]
  personalMode: boolean
  personalItems: Record<string, SplitDraftItem[]>
  personalMembers: string[]
  customShares: Record<string, string>
}

export interface SplitDerived {
  splitInput: SplitInput
  shares: ParticipantShare[]
  personalTotal: number
  itemCount: number
  autoRemaining: number
  matches: boolean
}

export interface SplitActions {
  setPersonalMode: (value: boolean) => void
  togglePersonalMember: (id: string) => void
  setPersonalAll: (selectAll: boolean) => void
  addItem: (memberId: string) => void
  updateItem: (memberId: string, itemId: string, field: "name" | "amount", value: string) => void
  removeItem: (memberId: string, itemId: string) => void
  togglePool: (id: string) => void
  setPoolAll: (selectAll: boolean) => void
  setCustomShare: (memberId: string, value: string) => void
  clearCustomShare: (memberId: string) => void
}

export interface SplitDraft {
  state: SplitState
  actions: SplitActions
  derived: SplitDerived
}

// Sequential id generator for locally-created draft items (not persisted).
let itemSeq = 0
export const newSplitItem = (name = "", amount = ""): SplitDraftItem => ({ id: `draft-item-${++itemSeq}`, name, amount })

const round2 = (n: number) => Math.round(n * 100) / 100

// Split math shared by both flows, so the preview, validation and saved payload
// always agree. `participantOrder` keeps the stored/member order stable so any
// rounding remainder lands on the same person.
export function deriveSplit(amount: number, participantOrder: string[], state: SplitState): SplitDerived {
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
    amount: Number.isFinite(amount) ? amount : 0,
    participantIds,
    personalItems,
    customShares,
  }
  const shares = computeShares(splitInput)
  const personalTotal = Object.values(personalItems).flat().reduce((s, i) => s + i.amount, 0)
  const itemCount = Object.values(personalItems).flat().length
  const customTotal = Object.values(customShares).reduce((s, v) => s + v, 0)
  const autoRemaining = round2(splitInput.amount - personalTotal - customTotal)
  const shareTotal = shares.reduce((s, x) => s + x.shareAmount, 0)
  const matches =
    shares.length > 0 && Math.abs(shareTotal - splitInput.amount) <= 0.01 && shares.every((s) => s.shareAmount >= 0)
  return { splitInput, shares, personalTotal, itemCount, autoRemaining, matches }
}

export function withPersonalMode(state: SplitState, personalMode: boolean): SplitState {
  return { ...state, personalMode }
}

export function withToggledPool(state: SplitState, id: string): SplitState {
  const next = state.pool.includes(id) ? state.pool.filter((x) => x !== id) : [...state.pool, id]
  const customShares = { ...state.customShares }
  if (!next.includes(id)) delete customShares[id]
  return { ...state, pool: next, customShares }
}

export function withPoolAll(state: SplitState, memberIds: string[], selectAll: boolean): SplitState {
  return { ...state, pool: selectAll ? [...memberIds] : [], customShares: selectAll ? state.customShares : {} }
}

export function withToggledPersonalMember(state: SplitState, id: string): SplitState {
  if (state.personalMembers.includes(id)) {
    const personalItems = { ...state.personalItems }
    delete personalItems[id]
    return { ...state, personalMembers: state.personalMembers.filter((x) => x !== id), personalItems }
  }
  return {
    ...state,
    personalMembers: [...state.personalMembers, id],
    personalItems: { ...state.personalItems, [id]: [newSplitItem()] },
  }
}

// Select all keeps existing items and gives newly added members one empty item;
// deselect all drops every member's items.
export function withPersonalAll(state: SplitState, memberIds: string[], selectAll: boolean): SplitState {
  if (!selectAll) return { ...state, personalMembers: [], personalItems: {} }
  const personalItems = { ...state.personalItems }
  for (const id of memberIds) {
    if (!state.personalMembers.includes(id)) personalItems[id] = [newSplitItem()]
  }
  return { ...state, personalMembers: [...memberIds], personalItems }
}

export function withAddedItem(state: SplitState, memberId: string): SplitState {
  const current = state.personalItems[memberId] ?? []
  if (current.length >= 20) return state
  return { ...state, personalItems: { ...state.personalItems, [memberId]: [...current, newSplitItem()] } }
}

export function withUpdatedItem(
  state: SplitState,
  memberId: string,
  itemId: string,
  field: "name" | "amount",
  value: string
): SplitState {
  return {
    ...state,
    personalItems: {
      ...state.personalItems,
      [memberId]: (state.personalItems[memberId] ?? []).map((i) => (i.id === itemId ? { ...i, [field]: value } : i)),
    },
  }
}

export function withRemovedItem(state: SplitState, memberId: string, itemId: string): SplitState {
  return {
    ...state,
    personalItems: {
      ...state.personalItems,
      [memberId]: (state.personalItems[memberId] ?? []).filter((i) => i.id !== itemId),
    },
  }
}

export function withCustomShare(state: SplitState, memberId: string, value: string): SplitState {
  return { ...state, customShares: { ...state.customShares, [memberId]: value } }
}

export function withClearedCustomShare(state: SplitState, memberId: string): SplitState {
  const customShares = { ...state.customShares }
  delete customShares[memberId]
  return { ...state, customShares }
}
