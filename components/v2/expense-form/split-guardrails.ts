// Client-side split guardrails shared by the product form and the demo:
//   1. amount input: 8 integer digits, decimals only for currencies that use them
//   2. invalid splits: say WHO is wrong and by how much, instead of a generic error
//   3. negative shares: never render them as a normal total
//
// The API still needs to enforce the same limits server-side; these checks
// keep the client honest and explain the problem next to the field.

import { formatAmount, formatCurrency, getCurrencyDecimals } from "@/lib/constants/currencies"
import type { Draft, DraftMember } from "@/lib/expense-draft"
import { isCompleteItem, isTouchedItem } from "./personal-item-state"

/**
 * `Expense.amount` is Decimal(10,2) → 8 integer digits. For currencies with
 * cents we stop at 7 integer digits so `amountProject` (an Int of minor units)
 * cannot overflow: 9,999,999.99 × 100 < 2^31.
 */
export function maxIntegerDigitsFor(currency: string): number {
  return getCurrencyDecimals(currency) === 0 ? 8 : 7
}

export function maxAmountFor(currency: string): number {
  return getCurrencyDecimals(currency) === 0 ? 99_999_999 : 9_999_999.99
}

export type AmountLimit = "digits" | "decimals" | null

/** Keep the raw input editable, but never let it exceed the storage limits. */
export function sanitizeAmountInput(raw: string, currency: string): { value: string; limited: AmountLimit } {
  const normalized = raw
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")
  const decimals = getCurrencyDecimals(currency)
  const [integerRaw = "", ...rest] = normalized.split(".")

  let limited: AmountLimit = null
  const maxIntegerDigits = maxIntegerDigitsFor(currency)
  let integer = integerRaw.replace(/^0+(?=\d)/, "")
  if (integer.length > maxIntegerDigits) {
    integer = integer.slice(0, maxIntegerDigits)
    limited = "digits"
  }

  // An empty field stays empty; a lone "." becomes "0." so it can be typed.
  if (normalized === "") return { value: "", limited }
  if (rest.length === 0) return { value: integer, limited }
  if (decimals === 0) return { value: integer, limited: "decimals" }

  const fractionRaw = rest.join("")
  const fraction = fractionRaw.slice(0, decimals)
  if (fractionRaw.length > decimals) limited = "decimals"
  return { value: `${integer || "0"}.${fraction}`, limited }
}

export function amountLimitNote(limit: AmountLimit, currency: string): string | null {
  if (limit === "digits") {
    return `金額上限為 ${formatCurrency(maxAmountFor(currency), currency)}`
  }
  if (limit === "decimals") {
    const decimals = getCurrencyDecimals(currency)
    return decimals === 0 ? `${currency} 不支援小數，已忽略小數點` : `${currency} 最多 ${decimals} 位小數`
  }
  return null
}

/** Re-normalise an existing value when the currency (and its decimals) changes. */
export function normalizeAmountForCurrency(raw: string, currency: string): { value: string; note: string | null } {
  if (raw.trim() === "") return { value: "", note: null }
  const decimals = getCurrencyDecimals(currency)
  const n = Number(raw)
  if (!Number.isFinite(n)) return { value: "", note: null }

  const factor = 10 ** decimals
  const rounded = Math.round(n * factor) / factor
  const capped = Math.min(rounded, maxAmountFor(currency))
  const value = String(capped)
  if (capped !== n) {
    const reason = capped !== rounded ? "超過上限" : "不支援小數"
    return { value, note: `${currency} ${reason}，已調整為 ${formatCurrency(capped, currency)}` }
  }
  return { value, note: null }
}

/** The amount rules the footer shows before submit (shared by the form and AI result). */
export function amountIssueFor(amount: string, currency: string): string | null {
  const n = Number(amount)
  if (amount.trim() === "") return "請輸入金額"
  if (!Number.isFinite(n)) return "請輸入有效金額"
  if (n <= 0) return "金額必須大於 0"
  if (n > maxAmountFor(currency)) return `金額不可超過 ${formatCurrency(maxAmountFor(currency), currency)}`
  return null
}

export interface ExpenseFormIssues {
  amountIssue: string | null
  splitIssue: string | null
  /** Footer blocking error: amount first, then split, then the draft's own error. */
  blockingError: string | null
  descMissing: boolean
}

/** One source of truth for the form's submit-blocking rules. */
export function expenseFormIssues(draft: Draft, members: DraftMember[]): ExpenseFormIssues {
  const amountIssue = amountIssueFor(draft.state.amount, draft.state.currency)
  const splitIssue = describeSplitIssue(draft, members)
  return {
    amountIssue,
    splitIssue,
    blockingError: amountIssue ?? splitIssue ?? draft.derived.error,
    descMissing: draft.state.description.trim() === "",
  }
}

/**
 * The generic `derived.error` says "分攤金額與支出金額不符". This adds the
 * missing who/how-much, and catches the case where a fixed share is larger
 * than the whole expense (which silently produces a negative share).
 */
export function describeSplitIssue(draft: Draft, members: DraftMember[]): string | null {
  const { state, derived } = draft
  const amount = derived.splitInput.amount
  if (!Number.isFinite(amount) || amount <= 0) return null

  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? "成員"
  const money = (n: number) => `$${formatAmount(Math.abs(n), state.currency)}`

  // Personal items are edited in the detail sheet; an empty name or a zero /
  // empty amount is caught there first, and this keeps the parent form blocked
  // even if the sheet is dismissed.
  // Blank placeholder rows are ignored; a row the user started must be complete.
  const incomplete = state.personalMode
    ? Object.entries(state.personalItems).flatMap(([id, items]) =>
        items
          .filter((item) => isTouchedItem(item) && !isCompleteItem(item))
          .map((item) => ({ id, item }))
      )
    : []
  if (incomplete.length > 0) {
    const first = incomplete[0]
    const label = first.item.name.trim() || "未命名品項"
    return `${nameOf(first.id)} 的「${label}」尚未填寫完整（名稱與金額）`
  }

  const fixedOverTotal = Object.entries(state.customShares)
    .filter(([, raw]) => raw.trim() !== "")
    .map(([id, raw]) => ({ id, amount: Number(raw) }))
    .filter((entry) => Number.isFinite(entry.amount) && entry.amount > amount + 0.01)
  if (fixedOverTotal.length > 0) {
    const top = fixedOverTotal.reduce((a, b) => (b.amount > a.amount ? b : a))
    return `${nameOf(top.id)} 的固定金額 ${money(top.amount)} 超過支出總額 ${money(amount)}，請調低`
  }

  const negative = derived.shares.filter((s) => s.shareAmount < -0.001)
  if (negative.length > 0) {
    const names = negative.map((s) => nameOf(s.memberId)).join("、")
    return `${names} 的分攤變成負數，請降低固定金額或個人項目`
  }

  if (derived.error === "分攤金額與支出金額不符") {
    const total = derived.shares.reduce((sum, s) => sum + s.shareAmount, 0)
    return `分攤金額與支出金額差 ${money(amount - total)}`
  }

  return null
}
