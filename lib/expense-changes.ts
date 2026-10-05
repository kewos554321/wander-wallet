// Builds the field-level change list used for LINE update notifications.
// Extracted from v1's `calculateChanges` in components/expense/expense-form.tsx
// so both the v1 and v2 expense forms can share the same diff logic.
import { format } from "date-fns"
import type { ExpenseChange } from "@/lib/liff"
import { CATEGORIES } from "@/lib/constants/expenses"

export interface ExpenseSnapshot {
  amount: number
  currency: string
  description: string | null
  category: string | null
  paidByMemberId: string
  payerName: string
  expenseDate: Date
  location: string | null
  image: string | null
  participantIds: string[]
}

function categoryLabel(category: string | null): string {
  if (!category) return "其他"
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export function buildExpenseChanges(
  original: ExpenseSnapshot,
  next: ExpenseSnapshot,
  opts: { imageReplaced: boolean }
): ExpenseChange[] {
  const changes: ExpenseChange[] = []

  if (original.amount !== next.amount || original.currency !== next.currency) {
    changes.push({
      field: "amount",
      label: "金額",
      oldValue: `${original.currency} ${original.amount.toLocaleString()}`,
      newValue: `${next.currency} ${next.amount.toLocaleString()}`,
    })
  }
  if (original.description !== next.description) {
    changes.push({
      field: "description",
      label: "描述",
      oldValue: original.description || "無",
      newValue: next.description || "無",
    })
  }
  if (original.category !== next.category) {
    changes.push({
      field: "category",
      label: "類別",
      oldValue: categoryLabel(original.category),
      newValue: categoryLabel(next.category),
    })
  }
  if (original.paidByMemberId !== next.paidByMemberId) {
    changes.push({ field: "payer", label: "付款人", oldValue: original.payerName, newValue: next.payerName })
  }
  const oldDate = format(original.expenseDate, "yyyy/MM/dd")
  const newDate = format(next.expenseDate, "yyyy/MM/dd")
  if (oldDate !== newDate) {
    changes.push({ field: "date", label: "日期", oldValue: oldDate, newValue: newDate })
  }
  if (original.location !== next.location) {
    changes.push({
      field: "location",
      label: "地點",
      oldValue: original.location || "無",
      newValue: next.location || "無",
    })
  }
  const hadImage = !!original.image
  const hasImage = !!next.image
  const replaced = hadImage && hasImage && opts.imageReplaced
  if (hadImage !== hasImage || replaced) {
    changes.push({
      field: "image",
      label: "圖片",
      oldValue: hadImage ? "有圖片" : "無",
      newValue: replaced ? "已更換" : hasImage ? "有圖片" : "無",
    })
  }
  const oldIds = [...original.participantIds].sort()
  const newIds = [...next.participantIds].sort()
  if (oldIds.length !== newIds.length || oldIds.some((id, i) => id !== newIds[i])) {
    changes.push({ field: "participants", label: "分攤者", oldValue: `${oldIds.length}人`, newValue: `${newIds.length}人` })
  }
  return changes
}
