// Shared payer logic for multi-payer expenses.
//
// An expense can be paid by several members, each contributing an amount; the
// sum must equal the expense amount. This module is pure (no I/O) so it can be
// used by both the client forms and the server API routes.
//
// Design: docs/superpowers/specs/2026-10-06-multi-payer-expenses-design.md

export interface PayerShare {
  memberId: string
  amount: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

/**
 * Distribute an expense amount across the selected payers.
 * Payers with a pinned amount keep it; the rest share the remainder equally.
 * The first unpinned payer absorbs the rounding remainder so the total matches
 * `amount` exactly.
 */
export function derivePayerShares(input: {
  amount: number
  payerIds: string[]
  pinned: Record<string, number>
}): { shares: PayerShare[]; pinnedTotal: number; autoIds: string[]; ok: boolean } {
  const { amount, payerIds, pinned } = input
  const autoIds = payerIds.filter((id) => !hasOwn(pinned, id))
  const pinnedTotal = round2(
    payerIds.reduce((sum, id) => sum + (hasOwn(pinned, id) ? Number(pinned[id]) || 0 : 0), 0)
  )
  const ok = pinnedTotal <= amount + 0.01

  if (payerIds.length === 0) return { shares: [], pinnedTotal, autoIds, ok: true }

  const shares: PayerShare[] = payerIds.map((id) => ({
    memberId: id,
    amount: hasOwn(pinned, id) ? round2(Number(pinned[id]) || 0) : 0,
  }))

  if (autoIds.length > 0) {
    const remaining = round2(amount - pinnedTotal)
    const perAuto = round2(remaining / autoIds.length)
    for (const share of shares) {
      if (!hasOwn(pinned, share.memberId)) share.amount = perAuto
    }
    const firstAuto = autoIds[0]
    const others = shares
      .filter((s) => s.memberId !== firstAuto)
      .reduce((sum, s) => sum + s.amount, 0)
    const first = shares.find((s) => s.memberId === firstAuto)!
    first.amount = round2(amount - others)
  }

  return { shares, pinnedTotal, autoIds, ok }
}

/**
 * Primary payer = the payer with the largest amount; ties go to the earliest
 * entry (which follows `sortOrder`). Pure derived value, never stored.
 */
export function primaryPayerId(payers: PayerShare[]): string {
  let best: PayerShare | null = null
  for (const payer of payers) {
    if (!best || payer.amount > best.amount) best = payer
  }
  return best?.memberId ?? ""
}

/**
 * Display name of the primary payer from a list that carries member info.
 * Returns "未知" when the list is empty or has no member details.
 */
export function primaryPayerName<
  T extends { memberId: string; amount: number | string; member?: { displayName: string } | null }
>(payers: T[]): string {
  const id = primaryPayerId(payers.map((p) => ({ memberId: p.memberId, amount: Number(p.amount) })))
  return payers.find((p) => p.memberId === id)?.member?.displayName ?? "未知"
}

/**
 * Validate a `payers` payload for create/update.
 * Returns the normalized payer list, or the first validation error.
 */
export function validatePayers(
  value: unknown,
  amount: number,
  memberIds: Set<string>
): { ok: true; payers: PayerShare[] } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error })
  if (!Array.isArray(value) || value.length === 0) return fail("至少需要一位付款人")

  const seen = new Set<string>()
  const payers: PayerShare[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return fail("付款人格式不正確")
    const { memberId, amount: rawAmount } = item as Record<string, unknown>
    if (typeof memberId !== "string" || memberId.length === 0) return fail("付款人格式不正確")
    if (seen.has(memberId)) return fail("付款人不可重複")
    if (!memberIds.has(memberId)) return fail("付款人必須是專案成員")
    const payerAmount = Number(rawAmount)
    if (!Number.isFinite(payerAmount) || payerAmount < 0) return fail("付款金額不正確")
    seen.add(memberId)
    payers.push({ memberId, amount: round2(payerAmount) })
  }

  const total = payers.reduce((sum, p) => sum + p.amount, 0)
  if (Math.abs(total - amount) > 0.01) return fail("付款金額合計必須等於費用總額")

  return { ok: true, payers }
}

export const PAYER_ERROR = {
  none: "請選擇付款成員",
  over: "付款金額合計超過支出金額",
  mismatch: "付款金額與支出金額不符",
} as const
