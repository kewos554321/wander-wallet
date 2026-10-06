import type { ExpenseItemResult } from "@/lib/ai/expense-parser"
import type { ImagePickerValue } from "@/components/ui/image-picker"
import { derivePayerShares, type PayerShare } from "@/lib/expense-payers"
import { deriveSplit, type SplitDraftItem, type SplitState } from "@/lib/split-draft"

// A parsed expense being reviewed in the quick-expense confirm step.
// `amount` stays a string so partially typed input ("12.") survives edits.
// `participantIds` is the shared-split pool; the rest is the same editable split
// state the expense form uses, so both flows share SplitEditor.
// Payer state mirrors useExpenseDraft: `payerIds` (ordered, multi-select) plus
// `pinnedPayerAmounts` for manually-set amounts (absent = auto/equal).
export interface QuickItem extends Omit<ExpenseItemResult, "amount" | "selected" | "payers"> {
  amount: string
  payerIds: string[]
  pinnedPayerAmounts: Record<string, string>
  expenseDate: Date
  location: string | null
  latitude: number | null
  longitude: number | null
  image: ImagePickerValue
  personalMode: boolean
  personalItems: Record<string, SplitDraftItem[]>
  personalMembers: string[]
  customShares: Record<string, string>
}

export const EMPTY_IMAGE: ImagePickerValue = { image: null, pendingFile: null, preview: null }

export function fromParsed(results: ExpenseItemResult[], today: Date = new Date()): QuickItem[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return results.map(({ selected: _selected, amount, payers, ...rest }) => {
    const parsedPayers = payers ?? []
    const payerIds = parsedPayers.map((p) => p.memberId)
    // Pin amounts only when the AI returned an explicit split that differs from
    // a plain equal split, so a default single/equal payer stays auto.
    const equal = derivePayerShares({ amount, payerIds, pinned: {} }).shares
    const isEqualPayerSplit =
      payerIds.length > 0 &&
      parsedPayers.length === equal.length &&
      parsedPayers.every((p, i) => Math.abs(p.amount - equal[i].amount) <= 0.01)
    const pinnedPayerAmounts: Record<string, string> = {}
    if (!isEqualPayerSplit) {
      for (const p of parsedPayers) pinnedPayerAmounts[p.memberId] = String(p.amount)
    }
    return {
      ...rest,
      amount: String(amount),
      payerIds,
      pinnedPayerAmounts,
      expenseDate: new Date(today),
      location: null,
      latitude: null,
      longitude: null,
      image: { ...EMPTY_IMAGE },
      personalMode: false,
      personalItems: {},
      personalMembers: [],
      customShares: {},
    }
  })
}

const amountOf = (item: QuickItem) => {
  const n = Number(item.amount)
  return item.amount.trim() !== "" && Number.isFinite(n) ? n : 0
}

const pinnedNumbersOf = (item: QuickItem): Record<string, number> => {
  const pinned: Record<string, number> = {}
  for (const [id, value] of Object.entries(item.pinnedPayerAmounts)) pinned[id] = Number(value) || 0
  return pinned
}

// Derived payer amounts for one quick item, reusing the shared payer math so the
// card preview, validation and saved payload always agree.
export function itemDerivedPayers(item: QuickItem): {
  payers: PayerShare[]
  payerTotal: number
  payerMatches: boolean
  ok: boolean
} {
  const amount = amountOf(item)
  const result = derivePayerShares({ amount, payerIds: item.payerIds, pinned: pinnedNumbersOf(item) })
  const payerTotal = result.shares.reduce((sum, p) => sum + p.amount, 0)
  return {
    payers: result.shares,
    payerTotal,
    payerMatches: result.ok && Math.abs(payerTotal - amount) <= 0.01,
    ok: result.ok,
  }
}

export function validateItems(
  items: QuickItem[],
  members: { id: string; displayName: string }[]
): { index: number; message: string } | null {
  const order = members.map((m) => m.id)
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const n = i + 1
    const amount = amountOf(item)
    if (!(amount > 0)) return { index: i, message: `第 ${n} 筆請輸入有效金額` }
    if (item.payerIds.length === 0) return { index: i, message: `第 ${n} 筆請選擇付款成員` }
    const payer = itemDerivedPayers(item)
    if (!payer.ok) return { index: i, message: `第 ${n} 筆付款金額合計超過支出金額` }
    if (!payer.payerMatches) return { index: i, message: `第 ${n} 筆付款金額與支出金額不符` }
    const state: SplitState = {
      pool: item.participantIds,
      personalMode: item.personalMode,
      personalItems: item.personalItems,
      personalMembers: item.personalMembers,
      customShares: item.customShares,
    }
    const derived = deriveSplit(amount, order, state)
    if (derived.splitInput.participantIds.length === 0) return { index: i, message: `第 ${n} 筆請選擇至少一位分攤成員` }
    const unnamed = derived.splitInput.participantIds.find((id) =>
      (item.personalMode ? item.personalItems[id] ?? [] : []).some((it) => !it.name.trim())
    )
    if (unnamed) {
      const name = members.find((m) => m.id === unnamed)?.displayName ?? ""
      return { index: i, message: `第 ${n} 筆：${name} 有個人項目未填寫名稱` }
    }
    if (derived.personalTotal > derived.splitInput.amount) {
      return { index: i, message: `第 ${n} 筆個人項目總額不可超過支出總額` }
    }
    if (!derived.matches) return { index: i, message: `第 ${n} 筆分攤金額與支出金額不符` }
  }
  return null
}

export function itemTotals(items: QuickItem[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + amountOf(item))
  return [...totals].map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }))
}
