"use client"

import { formatAmount } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"
import { memberTone } from "./payer-picker"

type Draft = ReturnType<typeof useExpenseDraft>

// Always-visible per-member breakdown (design A3d). Non-participants render as
// 0/0 rows, matching the design.
export function SplitSummary({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { derived } = draft
  if (derived.shares.length === 0) return null

  const money = (n: number) => `$${formatAmount(Math.round(n * 100) / 100, currency)}`
  const shareOf = (id: string) => derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0
  const personalOf = (id: string) => derived.splitInput.personalItems[id]?.reduce((sum, i) => sum + i.amount, 0) ?? 0
  const rows = members.map((m, index) => {
    const personal = personalOf(m.id)
    const total = shareOf(m.id)
    return {
      id: m.id,
      name: m.displayName,
      tone: memberTone(index),
      personal,
      pool: Math.round((total - personal) * 100) / 100,
      total,
    }
  })
  const sum = (key: "personal" | "pool" | "total") => rows.reduce((s, r) => s + r[key], 0)
  const cols = "grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center gap-1 px-3.5"
  const cell = "text-right text-[13px] tabular-nums"

  return (
    <section aria-label="分攤明細" className="mt-3">
      <p className="mb-2 text-xs font-semibold text-v2-ink-muted">
        分攤明細<span className="text-v2-lake">（{currency}）</span>
      </p>
      <div role="table">
        <div role="row" className={`${cols} pb-1.5 text-[11px] text-v2-ink-subtle`}>
          <span role="columnheader" className="text-left">成員</span>
          <span role="columnheader" className="text-right">個人項目</span>
          <span role="columnheader" className="text-right">共同分攤</span>
          <span role="columnheader" className="text-right">小計</span>
        </div>
        <div role="rowgroup" className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {rows.map((r) => (
            <div key={r.id} role="row" className={`${cols} border-t border-v2-line-soft bg-v2-lake-soft py-2.5 first:border-t-0`}>
              <span role="rowheader" className="flex min-w-0 items-center gap-2 text-left text-[13px] font-semibold">
                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${r.tone}`} aria-hidden="true">
                  {r.name.charAt(0)}
                </span>
                <span className="truncate">{r.name}</span>
              </span>
              <span role="cell" className={`${cell} ${r.personal ? "" : "text-v2-ink-subtle"}`}>{money(r.personal)}</span>
              <span role="cell" className={`${cell} ${r.pool ? "" : "text-v2-ink-subtle"}`}>{money(r.pool)}</span>
              <span role="cell" className={`${cell} font-bold`}>{money(r.total)}</span>
            </div>
          ))}
          <div role="row" className={`${cols} border-t border-v2-lake-border bg-v2-lake-tint py-2.5 font-bold`}>
            <span role="rowheader" className="text-left text-[13px]">合計</span>
            <span role="cell" className={cell}>{money(sum("personal"))}</span>
            <span role="cell" className={cell}>{money(sum("pool"))}</span>
            <span role="cell" className={`${cell} text-v2-lake`}>{money(sum("total"))}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
