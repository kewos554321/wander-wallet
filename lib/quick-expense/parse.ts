import type { ExpenseItemResult, ParseExpensesResult } from "@/lib/ai/expense-parser"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants/expenses"
import type { QuickItem } from "./draft"

export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>

export interface ReceiptResult {
  amount: number
  description: string
  category: string
  date: string | null
  confidence: number
}

async function postJson<T>(authFetch: AuthFetch, url: string, body: unknown, fallback: string): Promise<T> {
  const res = await authFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || fallback)
  return data.data as T
}

export async function parseText(
  authFetch: AuthFetch,
  input: { transcript: string; members: { id: string; displayName: string }[]; currentUserMemberId: string; defaultCurrency: string }
): Promise<ExpenseItemResult[]> {
  const data = await postJson<ParseExpensesResult>(authFetch, "/api/voice/parse", input, "解析失敗，請重試")
  return data?.expenses ?? []
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function parseReceipt(authFetch: AuthFetch, file: File): Promise<ReceiptResult> {
  const imageData = await fileToDataUrl(file)
  return postJson<ReceiptResult>(authFetch, "/api/receipt/parse", { imageData }, "收據辨識失敗")
}

export function receiptToItem(
  r: ReceiptResult,
  o: { currency: string; payerId: string; memberIds: string[]; file: File; preview: string; today?: Date }
): QuickItem {
  const today = o.today ?? new Date()
  const parsedDate = r.date ? new Date(r.date) : null
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(r.category) ? (r.category as ExpenseCategory) : "other"
  return {
    id: `receipt-${Date.now()}`,
    amount: String(r.amount),
    description: r.description,
    category,
    currency: o.currency,
    exchangeRate: null,
    ratePinned: false,
    // Receipts keep a single payer (the current user) covering the full amount.
    payerIds: [o.payerId],
    pinnedPayerAmounts: {},
    participantIds: [...o.memberIds],
    expenseDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date(today),
    location: null,
    latitude: null,
    longitude: null,
    image: { image: null, pendingFile: o.file, preview: o.preview },
    personalMode: false,
    personalItems: {},
    personalMembers: [],
    customShares: {},
  }
}
