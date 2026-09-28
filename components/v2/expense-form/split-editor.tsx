"use client"

import { CheckCircle2, CornerRightDown, Pin, PinOff, Plus, Trash2, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"
import { memberPillClass, memberTone } from "./payer-picker"

type Draft = ReturnType<typeof useExpenseDraft>

// Must match the server-enforced splitDetail limit (lib/expense-split.ts).
const MAX_PERSONAL_ITEM_NAME = 30

// Money inputs accept digits with at most one decimal point and two decimals.
// Full-width digits/period from CJK keyboards are normalized first.
const MONEY_PATTERN = /^\d*(\.\d{0,2})?$/
function toMoneyInput(raw: string): string | null {
  const v = raw.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  return MONEY_PATTERN.test(v) ? v : null
}

const smallButton = "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
const itemInput = "min-w-0 rounded-lg border border-[#DDEDE6] bg-v2-surface px-2.5 py-1.5 text-xs outline-none"

export function SplitEditor({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { state, actions, derived } = draft
  const fmt = (n: number) => formatCurrency(Math.round(n * 100) / 100, currency)
  const tone = (id: string) => memberTone(members.findIndex((m) => m.id === id))
  const name = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  // Shared-pool portion only: personal items are shown in their own section.
  const personalOf = (id: string) => derived.splitInput.personalItems[id]?.reduce((s, i) => s + i.amount, 0) ?? 0
  const poolShareOf = (id: string) =>
    Math.round(((derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0) - personalOf(id)) * 100) / 100
  const sharedTotal = Math.round((derived.splitInput.amount - derived.personalTotal) * 100) / 100
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
            {members.map((m) => {
              const on = state.personalMembers.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`${m.displayName}的個人項目`}
                  aria-pressed={on}
                  onClick={() => actions.togglePersonalMember(m.id)}
                  className={memberPillClass(on)}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                    {m.displayName.charAt(0)}
                  </span>
                  <span className="text-xs font-semibold">{m.displayName}</span>
                </button>
              )
            })}
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
                      <button type="button" aria-label={`為${name(id)}新增品項`} onClick={() => actions.addItem(id)} className="flex h-[22px] shrink-0 items-center justify-center gap-px rounded-md bg-[#D2EAE1] px-1 text-v2-lake">
                        <CornerRightDown className="h-3 w-3" aria-hidden="true" />
                        <Plus className="h-3 w-3" aria-hidden="true" />
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
                            onChange={(e) => {
                              const v = toMoneyInput(e.target.value)
                              if (v !== null) actions.updateItem(id, item.id, "amount", v)
                            }}
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
          共同分攤 <span className="font-bold text-v2-lake">（應分攤金額 {fmt(Math.max(0, sharedTotal))}）</span>
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
              className={memberPillClass(on)}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </button>
          )
        })}
      </div>
      {state.pool.length === 0 && (
        <p className="mt-2.5 rounded-[14px] border border-dashed border-v2-line bg-v2-surface py-3.5 text-center text-xs text-v2-ink-subtle">
          目前沒有人參與共同分攤，點上面的名字挑選分攤的人。
        </p>
      )}
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
                  placeholder={String(poolShareOf(id))}
                  onChange={(e) => {
                    const v = toMoneyInput(e.target.value)
                    if (v === null) return
                    if (v === "") actions.clearCustomShare(id)
                    else actions.setCustomShare(id, v)
                  }}
                  className={`w-24 rounded-lg border px-2.5 py-1.5 text-right text-[13px] font-bold outline-none ${
                    isCustom ? "border-v2-lake bg-v2-surface" : "border-[#DDEDE6] bg-v2-surface placeholder:text-v2-ink"
                  }`}
                />
                <button
                  type="button"
                  aria-label={isCustom ? `${name(id)}取消固定金額` : `${name(id)}固定金額`}
                  aria-pressed={isCustom}
                  onClick={() => (isCustom ? actions.clearCustomShare(id) : actions.setCustomShare(id, String(poolShareOf(id))))}
                  className={`${smallButton} ${isCustom ? "bg-v2-lake text-white" : "bg-[#D2EAE1] text-v2-lake"}`}
                >
                  {isCustom ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                </button>
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
          個人項目 {fmt(derived.personalTotal)}（{derived.itemCount} 項）＋ 共同分攤 {fmt(sharedTotal)}（{poolCount} 人）＝{" "}
          {fmt(derived.shares.reduce((s, x) => s + x.shareAmount, 0))} / {fmt(derived.splitInput.amount)}
        </p>
      </div>
    </section>
  )
}
