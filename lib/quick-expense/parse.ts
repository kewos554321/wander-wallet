import type { ExpenseItemResult, ParseExpensesResult } from "@/lib/ai/expense-parser"

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
