import type { ExpenseItemResult } from "@/lib/ai/expense-parser"
import type { ImagePickerValue } from "@/components/ui/image-picker"
import { deriveSplit, type SplitDraftItem, type SplitState } from "@/lib/split-draft"

// A parsed expense being reviewed in the quick-expense confirm step.
// `amount` stays a string so partially typed input ("12.") survives edits.
// `participantIds` is the shared-split pool; the rest is the same editable split
// state the expense form uses, so both flows share SplitEditor.
export interface QuickItem extends Omit<ExpenseItemResult, "amount" | "selected"> {
  amount: string
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
  return results.map(({ selected: _selected, amount, ...rest }) => ({
    ...rest,
    amount: String(amount),
    expenseDate: new Date(today),
    location: null,
    latitude: null,
    longitude: null,
    image: { ...EMPTY_IMAGE },
    personalMode: false,
    personalItems: {},
    personalMembers: [],
    customShares: {},
  }))
}

const amountOf = (item: QuickItem) => {
  const n = Number(item.amount)
  return item.amount.trim() !== "" && Number.isFinite(n) ? n : 0
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
    if (!item.payerId) return { index: i, message: `第 ${n} 筆請選擇付款成員` }
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
