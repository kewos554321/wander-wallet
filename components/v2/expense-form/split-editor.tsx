"use client"

import { CheckCircle2, Plus, RotateCcw, Trash2, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"
import { memberTone } from "./payer-picker"

type Draft = ReturnType<typeof useExpenseDraft>

// Must match the server-enforced splitDetail limit (lib/expense-split.ts).
const MAX_PERSONAL_ITEM_NAME = 30

const smallButton = "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
const itemInput = "min-w-0 rounded-lg border border-[#DDEDE6] bg-v2-surface px-2.5 py-1.5 text-xs outline-none"

export function SplitEditor({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { state, actions, derived } = draft
  const fmt = (n: number) => formatCurrency(Math.round(n * 100) / 100, currency)
  const tone = (id: string) => memberTone(members.findIndex((m) => m.id === id))
  const name = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  const shareOf = (id: string) => derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0
  const allInPool = members.every((m) => state.pool.includes(m.id))
  const poolCount = state.pool.length

  return (
    <section aria-label="分攤成員" className="mx-4 mb-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">分攤成員</p>
        <label className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${state.personalMode ? "text-v2-link" : "text-v2-ink-muted"}`}>先扣個人項目</span>
          <button
            type="button"
            role="switch"
            aria-checked={state.personalMode}
            aria-label="先扣個人項目"
            onClick={() => actions.setPersonalMode(!state.personalMode)}
            className={`relative inline-block h-[19px] w-8 shrink-0 rounded-full ${state.personalMode ? "bg-v2-link" : "bg-[#DCD3C2]"}`}
          >
            <span className={`absolute top-0.5 h-[15px] w-[15px] rounded-full bg-white transition-[left] ${state.personalMode ? "left-[15px]" : "left-0.5"}`} />
          </button>
        </label>
      </div>

      {state.personalMode && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold text-v2-ink-muted">個人項目</p>
          <div className="mb-2.5 flex flex-wrap gap-2">
            {members
              .filter((m) => !state.personalMembers.includes(m.id))
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`${m.displayName}加入個人項目`}
                  onClick={() => actions.togglePersonalMember(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#DDEDE6] bg-v2-lake-soft px-3.5 py-[5px]"
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                    {m.displayName.charAt(0)}
                  </span>
                  <span className="text-xs font-semibold">{m.displayName}</span>
                </button>
              ))}
          </div>
          {state.personalMembers.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-v2-line bg-v2-surface py-3.5 text-center text-xs text-v2-ink-subtle">
              目前沒有人有個人項目，點上面的名字挑一位。
            </p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-surface">
              {state.personalMembers.map((id) => {
                const items = state.personalItems[id] ?? []
                const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
                return (
                  <div key={id} className="border-b border-[#F0EAE0] bg-v2-lake-soft px-3.5 py-2 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${tone(id)}`} aria-hidden="true">
                        {name(id).charAt(0)}
                      </span>
                      <span className="flex flex-1 items-center justify-between gap-2 text-[13px]">
                        <span className="font-semibold">{name(id)}</span>
                        <span className="font-bold">{fmt(sum)}</span>
                      </span>
                      <button type="button" aria-label={`為${name(id)}新增品項`} onClick={() => actions.addItem(id)} className={`${smallButton} bg-[#D2EAE1] text-v2-lake`}>
                        <Plus className="h-3 w-3" />
                      </button>
                      <button type="button" aria-label={`移除${name(id)}的個人項目`} onClick={() => actions.togglePersonalMember(id)} className={`${smallButton} bg-[#F6DCD3] text-[#C4432A]`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="ml-[34px] mt-1 border-l border-[#DCD3C2] pl-2.5">
                      {items.map((item, idx) => (
                        <div key={item.id} className="mt-1.5 flex items-center gap-1.5">
                          <input
                            aria-label={`${name(id)}的品項名稱 ${idx + 1}`}
                            placeholder="品項名稱"
                            maxLength={MAX_PERSONAL_ITEM_NAME}
                            value={item.name}
                            onChange={(e) => actions.updateItem(id, item.id, "name", e.target.value)}
                            className={`${itemInput} flex-[2]`}
                          />
                          <input
                            aria-label={`${name(id)}的品項金額 ${idx + 1}`}
                            placeholder="金額"
                            inputMode="decimal"
                            value={item.amount}
                            onChange={(e) => actions.updateItem(id, item.id, "amount", e.target.value)}
                            className={`${itemInput} flex-1`}
                          />
                          <button type="button" aria-label="刪除項目" onClick={() => actions.removeItem(id, item.id)} className="flex h-5 w-5 shrink-0 items-center justify-center text-[#C4432A]">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mb-2.5 mt-3 flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">
          共同分攤 <span className="font-bold text-v2-lake">（剩餘應攤分金額 {fmt(Math.max(0, derived.autoRemaining))}）</span>
        </p>
        <button type="button" onClick={() => actions.setPoolAll(!allInPool)} className="shrink-0 text-xs font-bold text-v2-lake">
          {allInPool ? "取消全選" : "全選"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = state.pool.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => actions.togglePool(m.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
                on ? "border border-v2-lake bg-v2-lake text-white" : "border border-[#DDEDE6] bg-v2-lake-soft text-v2-ink opacity-50"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </button>
          )
        })}
      </div>
      {state.pool.length > 0 && (
        <div className="mt-2.5 overflow-hidden rounded-[14px] border border-v2-line bg-v2-surface">
          {state.pool.map((id) => {
            const custom = state.customShares[id]
            const isCustom = custom !== undefined
            return (
              <div key={id} className="flex items-center gap-2.5 border-b border-[#F0EAE0] bg-v2-lake-soft px-3.5 py-3 last:border-b-0">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${tone(id)}`} aria-hidden="true">
                  {name(id).charAt(0)}
                </span>
                <span className="flex-1 text-[13px] font-semibold">{name(id)}</span>
                <input
                  aria-label={`${name(id)}的分攤金額`}
                  inputMode="decimal"
                  value={isCustom ? custom : ""}
                  placeholder={String(shareOf(id))}
                  onChange={(e) => (e.target.value === "" ? actions.clearCustomShare(id) : actions.setCustomShare(id, e.target.value))}
                  className={`w-24 rounded-lg border px-2.5 py-1.5 text-right text-[13px] font-bold outline-none ${
                    isCustom ? "border-v2-lake bg-v2-surface" : "border-[#DDEDE6] bg-v2-surface placeholder:text-v2-ink"
                  }`}
                />
                {isCustom && (
                  <button type="button" aria-label={`${name(id)}恢復自動分攤`} onClick={() => actions.clearCustomShare(id)} className={`${smallButton} bg-[#D2EAE1] text-v2-lake`}>
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
                <button type="button" aria-label={`${name(id)}不參與共同分攤`} onClick={() => actions.togglePool(id)} className={`${smallButton} bg-[#F6DCD3] text-[#C4432A]`}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-v2-ink-muted">已選 {derived.splitInput.participantIds.length} 人</span>
          {derived.matches ? (
            <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              金額相符
            </span>
          ) : (
            <span className="text-xs font-bold text-v2-danger">金額不符</span>
          )}
        </div>
        <p className="mt-[3px] break-words text-xs leading-normal text-v2-ink-muted">
          個人項目 {fmt(derived.personalTotal)}（{derived.itemCount} 項）＋ 共同分攤 {fmt(derived.splitInput.amount - derived.personalTotal)}（{poolCount} 人）＝{" "}
          {fmt(derived.shares.reduce((s, x) => s + x.shareAmount, 0))} / {fmt(derived.splitInput.amount)}
        </p>
      </div>
    </section>
  )
}
