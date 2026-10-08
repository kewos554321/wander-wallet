export interface SplitItem {
  name: string
  amount: number
}

export interface SplitInput {
  amount: number
  participantIds: string[]
  personalItems: Record<string, SplitItem[]>
  customShares: Record<string, number>
}

export interface SplitDetail {
  version: 1
  personalItems: Record<string, SplitItem[]>
  customShares: Record<string, number>
}

export interface ParticipantShare {
  memberId: string
  shareAmount: number
}

export type V1SplitMode = "none" | "personal" | "custom" | "unsupported"

export const SPLIT_DETAIL_FORMAT_ERROR = "分攤明細格式不正確"
export const SPLIT_DETAIL_MEMBER_ERROR = "分攤明細包含非分攤成員"
export const SPLIT_DETAIL_AMOUNT_ERROR = "分攤明細金額不正確"
export const SPLIT_DETAIL_NAME_ERROR = "個人項目名稱需為 1–30 字"
export const SPLIT_DETAIL_COUNT_ERROR = "每人最多 20 個個人項目"
export const SPLIT_DETAIL_MISMATCH_ERROR = "分攤明細與分攤金額不一致"

const MAX_ITEMS = 20
const MAX_NAME = 30
const TOLERANCE = 0.01

const round2 = (n: number) => Math.round(n * 100) / 100
const sumItems = (items: SplitItem[] | undefined) => (items ?? []).reduce((s, i) => s + i.amount, 0)
const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

// share = personal items + (custom share if set, otherwise the auto share).
// The first auto member absorbs the rounding remainder; with no auto members
// nothing is absorbed so a mismatch surfaces in validation.
export function computeShares(input: SplitInput): ParticipantShare[] {
  const { amount, participantIds, personalItems, customShares } = input
  if (participantIds.length === 0) return []

  const personal = (id: string) => sumItems(personalItems[id])
  const autoIds = participantIds.filter((id) => !hasOwn(customShares, id))

  if (autoIds.length === 0) {
    return participantIds.map((id) => ({ memberId: id, shareAmount: round2(personal(id) + customShares[id]) }))
  }

  const personalTotal = participantIds.reduce((s, id) => s + personal(id), 0)
  const customTotal = participantIds.reduce((s, id) => s + (hasOwn(customShares, id) ? customShares[id] : 0), 0)
  const perAuto = round2((amount - personalTotal - customTotal) / autoIds.length)
  const firstAuto = autoIds[0]

  const shares = participantIds.map((id) => ({
    memberId: id,
    shareAmount: hasOwn(customShares, id) ? round2(personal(id) + customShares[id]) : round2(personal(id) + perAuto),
  }))
  const others = shares.filter((s) => s.memberId !== firstAuto).reduce((s, x) => s + x.shareAmount, 0)
  const first = shares.find((s) => s.memberId === firstAuto)!
  first.shareAmount = round2(amount - others)
  return shares
}

// Unrounded split weights: personal items plus each auto member's even share of
// the pool. These are the proportions fed to the tail-account allocator, which
// is the single source of both the original and settlement share amounts.
export function computeIdealShares(input: SplitInput): { memberId: string; weight: number }[] {
  const { amount, participantIds, personalItems, customShares } = input
  if (participantIds.length === 0) return []

  const personal = (id: string) => sumItems(personalItems[id])
  const autoIds = participantIds.filter((id) => !hasOwn(customShares, id))
  const personalTotal = participantIds.reduce((s, id) => s + personal(id), 0)
  const customTotal = participantIds.reduce((s, id) => s + (hasOwn(customShares, id) ? customShares[id] : 0), 0)
  const perAuto = autoIds.length > 0 ? (amount - personalTotal - customTotal) / autoIds.length : 0

  return participantIds.map((id) => ({
    memberId: id,
    weight: hasOwn(customShares, id) ? personal(id) + customShares[id] : personal(id) + perAuto,
  }))
}

export function buildSplitDetail(input: SplitInput): SplitDetail | null {
  const members = new Set(input.participantIds)
  const personalItems: Record<string, SplitItem[]> = {}
  for (const [id, items] of Object.entries(input.personalItems)) {
    if (!members.has(id) || items.length === 0) continue
    personalItems[id] = items.map((i) => ({ name: i.name.trim(), amount: i.amount }))
  }
  const customShares: Record<string, number> = {}
  for (const [id, value] of Object.entries(input.customShares)) {
    if (members.has(id)) customShares[id] = value
  }
  if (Object.keys(personalItems).length === 0 && Object.keys(customShares).length === 0) return null
  return { version: 1, personalItems, customShares }
}

export function splitDetailToInput(detail: SplitDetail) {
  return {
    personalItems: Object.fromEntries(
      Object.entries(detail.personalItems).map(([id, items]) => [id, items.map((i) => ({ ...i }))])
    ),
    customShares: { ...detail.customShares },
  }
}

function canonical(detail: SplitDetail): string {
  const sortObj = <T>(obj: Record<string, T>) =>
    Object.keys(obj)
      .sort()
      .map((k) => [k, obj[k]])
  return JSON.stringify([sortObj(detail.personalItems), sortObj(detail.customShares)])
}

export function isSameSplitDetail(a: SplitDetail | null, b: SplitDetail | null): boolean {
  if (!a || !b) return a === b
  return canonical(a) === canonical(b)
}

export function getV1SplitMode(detail: SplitDetail | null): V1SplitMode {
  if (!detail) return "none"
  const hasPersonal = Object.keys(detail.personalItems).length > 0
  const hasCustom = Object.keys(detail.customShares).length > 0
  if (hasPersonal && hasCustom) return "unsupported"
  if (hasPersonal) return "personal"
  if (hasCustom) return "custom"
  return "none"
}

const isAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0

export function validateSplitDetail(
  value: unknown,
  participants: ParticipantShare[]
): { ok: true; detail: SplitDetail } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error })
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(SPLIT_DETAIL_FORMAT_ERROR)
  const raw = value as Record<string, unknown>
  if (raw.version !== 1) return fail(SPLIT_DETAIL_FORMAT_ERROR)
  const rawItems = raw.personalItems ?? {}
  const rawCustom = raw.customShares ?? {}
  if (typeof rawItems !== "object" || Array.isArray(rawItems) || typeof rawCustom !== "object" || Array.isArray(rawCustom)) {
    return fail(SPLIT_DETAIL_FORMAT_ERROR)
  }

  const shareOf = new Map(participants.map((p) => [p.memberId, Number(p.shareAmount)]))
  const personalItems: Record<string, SplitItem[]> = {}
  for (const [id, items] of Object.entries(rawItems as Record<string, unknown>)) {
    if (!shareOf.has(id)) return fail(SPLIT_DETAIL_MEMBER_ERROR)
    if (!Array.isArray(items)) return fail(SPLIT_DETAIL_FORMAT_ERROR)
    if (items.length > MAX_ITEMS) return fail(SPLIT_DETAIL_COUNT_ERROR)
    const clean: SplitItem[] = []
    for (const item of items) {
      if (!item || typeof item !== "object") return fail(SPLIT_DETAIL_FORMAT_ERROR)
      const { name, amount } = item as Record<string, unknown>
      if (!isAmount(amount)) return fail(SPLIT_DETAIL_AMOUNT_ERROR)
      const trimmed = typeof name === "string" ? name.trim() : ""
      if (trimmed.length === 0 || trimmed.length > MAX_NAME) return fail(SPLIT_DETAIL_NAME_ERROR)
      clean.push({ name: trimmed, amount })
    }
    if (clean.length > 0) personalItems[id] = clean
  }

  const customShares: Record<string, number> = {}
  for (const [id, amount] of Object.entries(rawCustom as Record<string, unknown>)) {
    if (!shareOf.has(id)) return fail(SPLIT_DETAIL_MEMBER_ERROR)
    if (!isAmount(amount)) return fail(SPLIT_DETAIL_AMOUNT_ERROR)
    customShares[id] = amount
  }

  for (const [id, share] of shareOf) {
    const personal = sumItems(personalItems[id])
    if (hasOwn(customShares, id)) {
      if (Math.abs(share - (personal + customShares[id])) > TOLERANCE) return fail(SPLIT_DETAIL_MISMATCH_ERROR)
    } else if (share < personal - TOLERANCE) {
      return fail(SPLIT_DETAIL_MISMATCH_ERROR)
    }
  }

  return { ok: true, detail: { version: 1, personalItems, customShares } }
}
