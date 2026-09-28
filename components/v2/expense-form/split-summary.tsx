"use client"

import { formatCurrency } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"

type Draft = ReturnType<typeof useExpenseDraft>

// Experimental: per-member breakdown of personal items vs shared pool.
// Only shown when personal items are in use; a plain split already shows
// each member's share in the shared-pool rows.
export function SplitSummary({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { derived } = draft
  if (derived.itemCount === 0 || derived.shares.length === 0) return null

  const fmt = (n: number) => formatCurrency(Math.round(n * 100) / 100, currency)
  const rows = derived.shares.map((s) => {
    const personal = derived.splitInput.personalItems[s.memberId]?.reduce((sum, i) => sum + i.amount, 0) ?? 0
    return {
      id: s.memberId,
      name: members.find((m) => m.id === s.memberId)?.displayName ?? "",
      personal,
      pool: Math.round((s.shareAmount - personal) * 100) / 100,
      total: s.shareAmount,
    }
  })
  const sum = (key: "personal" | "pool" | "total") => rows.reduce((s, r) => s + r[key], 0)
  const cell = "px-2 py-2 text-right tabular-nums"

  return (
    <section aria-label="分攤明細" className="mx-4 mb-4">
      <p className="mb-2.5 text-sm font-medium leading-5 tracking-[.1px]">分攤明細</p>
      <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-surface">
        <table className="w-full text-xs">
          <thead className="bg-v2-lake-soft text-v2-ink-muted">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">成員</th>
              <th scope="col" className={`${cell} font-semibold`}>個人項目</th>
              <th scope="col" className={`${cell} font-semibold`}>共同分攤</th>
              <th scope="col" className={`${cell} pr-3 font-semibold`}>小計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#F0EAE0]">
                <th scope="row" className="px-3 py-2 text-left font-semibold">{r.name}</th>
                <td className={`${cell} ${r.personal ? "" : "text-v2-ink-subtle"}`}>{fmt(r.personal)}</td>
                <td className={`${cell} ${r.pool ? "" : "text-v2-ink-subtle"}`}>{fmt(r.pool)}</td>
                <td className={`${cell} pr-3 font-bold`}>{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-v2-line font-bold">
            <tr>
              <th scope="row" className="px-3 py-2 text-left">合計</th>
              <td className={cell}>{fmt(sum("personal"))}</td>
              <td className={cell}>{fmt(sum("pool"))}</td>
              <td className={`${cell} pr-3 text-v2-lake`}>{fmt(sum("total"))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
