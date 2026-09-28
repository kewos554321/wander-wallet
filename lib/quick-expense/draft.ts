import type { ExpenseItemResult } from "@/lib/ai/expense-parser"
import type { ImagePickerValue } from "@/components/ui/image-picker"

// A parsed expense being reviewed in the quick-expense confirm step.
// `amount` stays a string so partially typed input ("12.") survives edits.
export interface QuickItem extends Omit<ExpenseItemResult, "amount" | "selected"> {
  amount: string
  expenseDate: Date
  location: string | null
  latitude: number | null
  longitude: number | null
  image: ImagePickerValue
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
  }))
}

const amountOf = (item: QuickItem) => {
  const n = Number(item.amount)
  return item.amount.trim() !== "" && Number.isFinite(n) ? n : 0
}

export function validateItems(items: QuickItem[]): { index: number; message: string } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const n = i + 1
    if (!(amountOf(item) > 0)) return { index: i, message: `第 ${n} 筆請輸入有效金額` }
    if (!item.payerId) return { index: i, message: `第 ${n} 筆請選擇付款成員` }
    if (item.participantIds.length === 0) return { index: i, message: `第 ${n} 筆請選擇至少一位分攤成員` }
  }
  return null
}

export function itemTotals(items: QuickItem[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + amountOf(item))
  return [...totals].map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }))
}
