"use client"

import { CheckCircle2 } from "lucide-react"
import { formatAmount, formatCurrency } from "@/lib/constants/currencies"
import { roundMajorToMinor } from "@/lib/currency-conversion"
import { MemberAvatar } from "@/components/v2/ui/member-avatar"
import type { SplitDraft } from "@/lib/split-draft"
import type { DraftMember } from "./use-expense-draft"
import { memberTone } from "./payer-picker"

export interface SummaryRow {
  id: string
  name: string
  image: string | null
  isPlaceholder: boolean
  tone: string
  personal: number
  pool: number
  total: number
}

// Per-member breakdown math. Exported so the split editor can tell whether the
// table will render at all, keeping the inline equation and the table in
// agreement about which one is shown.
export function buildSummaryRows(members: DraftMember[], draft: SplitDraft): SummaryRow[] {
  const { derived } = draft
  const shareOf = (id: string) => derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0
  const personalOf = (id: string) => derived.splitInput.personalItems[id]?.reduce((sum, i) => sum + i.amount, 0) ?? 0
  return members.map((m, index) => {
    const personal = personalOf(m.id)
    const total = shareOf(m.id)
    return {
      id: m.id,
      name: m.displayName,
      image: m.image ?? null,
      isPlaceholder: m.isPlaceholder ?? false,
      tone: memberTone(index),
      personal,
      pool: Math.round((total - personal) * 100) / 100,
      total,
    }
  })
}

// The breakdown table takes over as soon as the personal-items switch is on,
// before any member or item is chosen, and as long as at least one member still
// has a non-zero share. Plain equal splits and custom shares fall back to the
// text summary instead.
export function shouldShowBreakdown(members: DraftMember[], draft: SplitDraft): boolean {
  return draft.state.personalMode && buildSummaryRows(members, draft).some((r) => r.total !== 0)
}

// Signed gap between the split's ideal shares and the expense amount, matching
// what `matches` compares. Positive = over, negative = short.
export function splitGap(draft: SplitDraft): number {
  const { derived } = draft
  return Math.round((derived.weights.reduce((s, w) => s + w.weight, 0) - derived.splitInput.amount) * 100) / 100
}

// Whether any member is allocated a negative amount (an invalid split).
export function splitHasNegative(draft: SplitDraft): boolean {
  const { derived } = draft
  return derived.weights.some((w) => w.weight < 0) || derived.shares.some((s) => s.shareAmount < 0)
}

// Match status for the split. A mismatch shows the signed gap from the expense
// amount (e.g. 尚差 $40 / 超出 $20), or 含負數金額 when a share went negative.
export function MatchBadge({
  matches,
  diff,
  currency,
  hasNegative,
}: {
  matches: boolean
  diff: number
  currency: string
  hasNegative: boolean
}) {
  if (matches) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        金額相符
      </span>
    )
  }
  let text = "金額不符"
  if (hasNegative) text = "含負數金額"
  else if (diff > 0) text = `超出 $${formatAmount(diff, currency)}`
  else if (diff < 0) text = `尚差 $${formatAmount(Math.abs(diff), currency)}`
  return <span className="text-xs font-bold text-v2-danger">{text}</span>
}

// Per-member breakdown (design A3d, deliberately deviating): members whose
// subtotal is 0 are hidden instead of rendering as 0/0 rows.
export function SplitSummary({
  members,
  draft,
  currency,
  projectCurrency,
  rate,
  displayCurrency,
}: {
  members: DraftMember[]
  draft: SplitDraft
  currency: string
  projectCurrency?: string
  rate?: number | null
  /** When set, every cell renders in this currency instead of the expense currency. */
  displayCurrency?: string
}) {
  const { derived } = draft
  if (derived.shares.length === 0) return null

  const viewCurrency = displayCurrency ?? currency
  const settleView = displayCurrency != null && displayCurrency !== currency && rate != null
  const view = (n: number) => (settleView ? roundMajorToMinor(n * rate!, viewCurrency) : n)
  const money = (n: number) => `$${formatAmount(view(n), viewCurrency)}`
  // ≈ flags any cell that actually holds an amount; a structural 0 stays plain.
  const approx = (n: number) => `${settleView ? "≈" : ""}$${formatAmount(view(n), viewCurrency)}`
  const amount = (n: number) => (n !== 0 ? approx(n) : money(n))
  const rows = buildSummaryRows(members, draft)
  const visibleRows = rows.filter((r) => r.total !== 0)
  if (visibleRows.length === 0) return null
  const sum = (key: "personal" | "pool" | "total") => rows.reduce((s, r) => s + r[key], 0)
  const cols = "grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center gap-1 px-3.5"
  const cell = "text-right text-[13px] tabular-nums"

  return (
    <section aria-label="分攤明細" className="mt-3">
      <p className="mb-2 text-xs font-semibold text-v2-ink-muted">
        分攤明細<span className="text-v2-lake">（{viewCurrency}）</span>
      </p>
      <div role="table">
        <div role="row" className={`${cols} pb-1.5 text-[11px] text-v2-ink-subtle`}>
          <span role="columnheader" className="text-left">成員</span>
          <span role="columnheader" className="text-right">個人項目</span>
          <span role="columnheader" className="text-right">共同分攤</span>
          <span role="columnheader" className="text-right">小計</span>
        </div>
        <div role="rowgroup" className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {visibleRows.map((r) => (
            <div key={r.id} role="row" className={`${cols} border-t border-v2-line-soft bg-v2-lake-soft py-2.5 first:border-t-0`}>
              <span role="rowheader" className="flex min-w-0 items-center gap-2 text-left text-[13px] font-semibold">
                <MemberAvatar
                  image={r.image}
                  name={r.name}
                  placeholder={r.isPlaceholder}
                  className="h-[22px] w-[22px] shrink-0 rounded-full"
                  fallbackClassName={`text-[9px] font-bold ${r.tone}`}
                  iconClassName="h-[11px] w-[11px]"
                />
                <span className="truncate">{r.name}</span>
              </span>
              <span role="cell" className={`${cell} ${r.personal ? "" : "text-v2-ink-subtle"}`}>{amount(r.personal)}</span>
              <span role="cell" className={`${cell} ${r.pool ? "" : "text-v2-ink-subtle"}`}>{amount(r.pool)}</span>
              <span role="cell" className={`${cell} font-bold`}>
                <span className="block">{amount(r.total)}</span>
                {displayCurrency == null && projectCurrency && rate != null && currency !== projectCurrency && (
                  <span className="block text-[10px] font-normal text-v2-ink-muted">
                    ≈ {formatCurrency(r.total * rate, projectCurrency)}
                  </span>
                )}
              </span>
            </div>
          ))}
          <div role="row" className={`${cols} border-t border-v2-lake-border bg-v2-lake-tint py-2.5 font-bold`}>
            <span role="rowheader" className="text-left text-[13px]">合計</span>
            <span role="cell" className={cell}>{amount(sum("personal"))}</span>
            <span role="cell" className={cell}>{amount(sum("pool"))}</span>
            <span role="cell" className={`${cell} text-v2-lake`}>{amount(sum("total"))}</span>
          </div>
        </div>
      </div>
      {derived.splitInput.amount !== 0 && (
        <div className="mt-2 flex justify-end">
          <MatchBadge matches={derived.matches} diff={splitGap(draft)} hasNegative={splitHasNegative(draft)} currency={currency} />
        </div>
      )}
    </section>
  )
}
