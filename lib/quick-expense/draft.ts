import type { ExpenseItemResult } from "@/lib/ai/expense-parser"
import type { DraftMember, DraftState } from "@/lib/expense-draft"
import { deriveExpenseDraft } from "@/lib/expense-draft"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants/expenses"
import { derivePayerShares } from "@/lib/expense-payers"
import { newSplitItem, type SplitDraftItem } from "@/lib/split-draft"
import type { ReceiptResult } from "./parse"

// A parsed expense being reviewed in the quick-expense confirm step. It is the
// exact same draft state the add-expense form edits, plus the AI's temporary id
// so the batch can track which items were saved.
export type QuickItem = DraftState & { id: string }

const EMPTY_IMAGE = { image: null, pendingFile: null, preview: null }

function itemBase(id: string, currency: string, today: Date): QuickItem {
  return {
    id,
    amount: "",
    currency,
    exchangeRate: "",
    ratePinned: false,
    rateKind: null,
    rateDate: null,
    description: "",
    category: "",
    payerIds: [],
    pinnedPayerAmounts: {},
    expenseDate: new Date(today),
    location: { location: null, latitude: null, longitude: null },
    image: { ...EMPTY_IMAGE },
    notifyLine: true,
    pool: [],
    personalMode: false,
    personalItems: {},
    personalMembers: [],
    customShares: {},
  }
}

export function parsedToQuickItems(results: ExpenseItemResult[], today: Date = new Date()): QuickItem[] {
  return results.map((result) => {
    const payerIds = result.payers.map((p) => p.memberId)
    // Pin amounts only when the AI returned an explicit split that differs from
    // a plain equal split, so a default single/equal payer stays auto.
    const equal = derivePayerShares({
      amount: result.amount,
      payerIds,
      pinned: {},
      currency: result.currency,
    }).shares
    const isEqualPayerSplit =
      payerIds.length > 0 &&
      result.payers.length === equal.length &&
      result.payers.every((p, i) => Math.abs(p.amount - equal[i].amount) <= 0.01)
    const pinnedPayerAmounts: Record<string, string> = {}
    if (!isEqualPayerSplit) {
      for (const p of result.payers) pinnedPayerAmounts[p.memberId] = String(p.amount)
    }

    // Seed "先扣個人項目" from whatever the AI extracted (if any).
    const personalItems: Record<string, SplitDraftItem[]> = {}
    for (const item of result.personalItems ?? []) {
      if (!personalItems[item.memberId]) personalItems[item.memberId] = []
      personalItems[item.memberId].push(newSplitItem(item.name, String(item.amount)))
    }
    const personalMembers = Object.keys(personalItems)

    return {
      ...itemBase(result.id, result.currency, today),
      amount: String(result.amount),
      description: result.description,
      category: result.category,
      payerIds,
      pinnedPayerAmounts,
      pool: [...result.participantIds],
      personalMode: personalMembers.length > 0,
      personalItems,
      personalMembers,
    }
  })
}

export function receiptToQuickItem(
  result: ReceiptResult,
  options: {
    currency: string
    payerId: string
    memberIds: string[]
    file: File
    preview: string
    today?: Date
  },
): QuickItem {
  const today = options.today ?? new Date()
  const parsedDate = result.date ? new Date(result.date) : null
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(result.category)
    ? (result.category as ExpenseCategory)
    : "other"
  return {
    ...itemBase(`receipt-${Date.now()}`, options.currency, today),
    amount: String(result.amount),
    description: result.description,
    category,
    // Receipts keep a single payer (the current user) covering the full amount.
    payerIds: [options.payerId],
    expenseDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date(today),
    image: { image: null, pendingFile: options.file, preview: options.preview },
    pool: [...options.memberIds],
  }
}

function derivedOf(item: QuickItem, members: DraftMember[]) {
  return deriveExpenseDraft({
    state: item,
    members,
    projectCurrency: item.currency,
    participantOrder: members.map((m) => m.id),
  })
}

export function validateItems(
  items: QuickItem[],
  members: DraftMember[],
): { index: number; message: string } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const n = i + 1
    const derived = derivedOf(item, members)
    const amount = derived.splitInput.amount
    if (!(amount > 0)) return { index: i, message: `第 ${n} 筆請輸入有效金額` }
    if (item.payerIds.length === 0) return { index: i, message: `第 ${n} 筆請選擇付款成員` }
    if (derived.error === "付款金額合計超過支出金額") return { index: i, message: `第 ${n} 筆付款金額合計超過支出金額` }
    if (derived.error === "付款金額與支出金額不符") return { index: i, message: `第 ${n} 筆付款金額與支出金額不符` }
    if (derived.splitInput.participantIds.length === 0) return { index: i, message: `第 ${n} 筆請選擇至少一位分攤成員` }
    const unnamed = derived.splitInput.participantIds.find((id) =>
      (item.personalMode ? item.personalItems[id] ?? [] : []).some((it) => !it.name.trim()),
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

const amountOf = (item: QuickItem) => {
  const n = Number(item.amount)
  return item.amount.trim() !== "" && Number.isFinite(n) ? n : 0
}

export function itemTotals(items: QuickItem[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + amountOf(item))
  return [...totals].map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }))
}
