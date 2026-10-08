"use client"

import { CornerRightDown, Info, Pin, PinOff, Plus, UserMinus, X } from "lucide-react"
import { formatAmount, formatCurrency } from "@/lib/constants/currencies"
import { fromMinorUnits, roundMajorToMinor } from "@/lib/currency-conversion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toMoneyInput } from "@/lib/money-input"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"
import type { DraftMember } from "./use-expense-draft"
import { memberPillClass, memberTone } from "./payer-picker"
import { CurrencyToggle } from "./currency-toggle"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"
import { MatchBadge, SplitEquation, SplitSummary, shouldShowBreakdown } from "./split-summary"
import type { SplitDraft } from "@/lib/split-draft"

// Must match the server-enforced splitDetail limit (lib/expense-split.ts).
const MAX_PERSONAL_ITEM_NAME = 30

const smallButton = "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
const itemInput = "min-w-0 rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-xs outline-none"

export function SplitEditor({
  members,
  draft,
  currency,
  projectCurrency,
  rate,
  displayCurrency,
  onDisplayCurrencyChange,
}: {
  members: DraftMember[]
  draft: SplitDraft
  currency: string
  projectCurrency?: string
  rate?: number | null
  /** When set, the section renders in this currency (see `onDisplayCurrencyChange`). */
  displayCurrency?: string
  /** When set, a currency toggle is shown; selecting the settlement currency flips the section. */
  onDisplayCurrencyChange?: (currency: string) => void
}) {
  const { state, actions, derived } = draft
  // In a settlement flip the section is a glance view: amounts show converted,
  // every amount field becomes read-only and the tail-account annotation (an
  // expense-currency artefact) is hidden. Edits still happen in the expense
  // currency, reached by flipping back.
  const viewCurrency = displayCurrency ?? currency
  const settleView = displayCurrency != null && displayCurrency !== currency && rate != null
  const view = (n: number) => (settleView ? roundMajorToMinor(n * rate!, viewCurrency) : n)
  // Currency code only on totals; per-member amounts show the number alone.
  const num = (n: number) => formatAmount(view(n), viewCurrency)
  // A settlement figure is an approximation, so it is marked with ≈.
  const money = (n: number) => `${settleView ? "≈" : ""}$${num(n)}`
  const tone = (id: string) => memberTone(members.findIndex((m) => m.id === id))
  const name = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  // Shared-pool portion only: personal items are shown in their own section.
  const personalOf = (id: string) => derived.splitInput.personalItems[id]?.reduce((s, i) => s + i.amount, 0) ?? 0
  const poolShareOf = (id: string) =>
    Math.round(((derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0) - personalOf(id)) * 100) / 100
  const allInPool = members.every((m) => state.pool.includes(m.id))
  const allPersonal = members.every((m) => state.personalMembers.includes(m.id))
  // The breakdown table is shown only when personal items make its 個人項目
  // column meaningful; otherwise the header text summary stands alone.
  const showBreakdown = shouldShowBreakdown(members, draft)
  const showLegacyEstimate = displayCurrency == null && !!projectCurrency && rate != null && currency !== projectCurrency
  const showCurrencyToggle =
    onDisplayCurrencyChange != null && !!projectCurrency && rate != null && currency !== projectCurrency

  return (
    <section aria-label="分攤成員" className={SECTION_CARD}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className={`m-0 flex items-center gap-2 ${SECTION_TITLE}`}>
          分攤成員
          {showCurrencyToggle && (
            <CurrencyToggle
              currency={currency}
              projectCurrency={projectCurrency!}
              displayCurrency={viewCurrency}
              onChange={onDisplayCurrencyChange!}
            />
          )}
        </p>
        {!settleView && (
          <label className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-v2-lake">先扣個人項目</span>
            <button
              type="button"
              role="switch"
              aria-checked={state.personalMode}
              aria-label="先扣個人項目"
              onClick={() => actions.setPersonalMode(!state.personalMode)}
              className={`relative inline-block h-[14px] w-6 shrink-0 rounded-full ${state.personalMode ? "bg-v2-link" : "bg-v2-check"}`}
            >
              <span className={`absolute top-0.5 h-[10px] w-[10px] rounded-full bg-v2-knob transition-[left] ${state.personalMode ? "left-[12px]" : "left-0.5"}`} />
            </button>
          </label>
        )}
      </div>

      {state.personalMode && (
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-xs font-semibold text-v2-ink-muted">個人項目</p>
            {!settleView && (
              <button
                type="button"
                aria-label={allPersonal ? "取消全選個人項目" : "全選個人項目"}
                onClick={() => actions.setPersonalAll(!allPersonal)}
                className="shrink-0 text-xs font-bold text-v2-lake"
              >
                {allPersonal ? "取消全選" : "全選"}
              </button>
            )}
          </div>
          {!settleView && (
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
                    <V2Avatar
                      image={m.image ?? null}
                      name={m.displayName}
                      className="h-5 w-5 rounded-full"
                      fallbackClassName={`text-[9px] font-bold ${tone(m.id)}`}
                    />
                    <span className="text-xs font-semibold">{m.displayName}</span>
                  </button>
                )
              })}
            </div>
          )}
          {!settleView && state.personalMembers.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-v2-line bg-v2-paper py-3.5 text-center text-xs text-v2-ink-subtle">
              目前沒有人有個人項目，點上面的名字挑一位。
            </p>
          ) : state.personalMembers.length > 0 ? (
            <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
              {state.personalMembers.map((id) => {
                const items = state.personalItems[id] ?? []
                const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
                return (
                  <div key={id} className="border-b border-v2-line-soft bg-v2-lake-soft px-3.5 py-2 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <V2Avatar
                        image={members.find((m) => m.id === id)?.image ?? null}
                        name={name(id)}
                        className="h-6 w-6 rounded-full"
                        fallbackClassName={`text-[10px] font-bold ${tone(id)}`}
                      />
                      <span className="flex flex-1 items-center justify-between gap-2 text-[13px]">
                        <span className="font-semibold">{name(id)}</span>
                        <span className="font-bold">{money(sum)}</span>
                      </span>
                      {!settleView && (
                        <button type="button" aria-label={`為${name(id)}新增品項`} onClick={() => actions.addItem(id)} className="flex h-[22px] shrink-0 items-center justify-center gap-px rounded-md bg-v2-lake-tint px-1 text-v2-lake">
                          <CornerRightDown className="h-3 w-3" aria-hidden="true" />
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                      {!settleView && (
                        <button type="button" aria-label={`移除${name(id)}的個人項目`} onClick={() => actions.togglePersonalMember(id)} className={`${smallButton} bg-v2-danger-soft text-v2-danger-strong`}>
                          <UserMinus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {showLegacyEstimate && (
                      <p
                        data-testid="personal-project-estimate"
                        className="mt-1 break-words pl-[34px] text-[10px] text-v2-ink-muted"
                      >
                        ≈ {formatCurrency(sum * rate!, projectCurrency!)}
                      </p>
                    )}
                    <div className="ml-[34px] mt-1 border-l border-v2-check pl-2.5">
                      {items.map((item, idx) =>
                        settleView ? (
                          <div key={item.id} className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 flex-1 truncate text-v2-ink">{item.name.trim() || "（未命名品項）"}</span>
                            <span className="shrink-0 font-bold" aria-label={`${name(id)}的品項金額 ${idx + 1}`}>
                              {money(Number(item.amount) || 0)}
                            </span>
                          </div>
                        ) : (
                          <div key={item.id} className="mt-1.5 flex items-center gap-1.5">
                            <input
                              aria-label={`${name(id)}的品項名稱 ${idx + 1}`}
                              placeholder="品項名稱"
                              maxLength={MAX_PERSONAL_ITEM_NAME}
                              value={item.name}
                              onChange={(e) => actions.updateItem(id, item.id, "name", e.target.value)}
                              className={`${itemInput} flex-[2]`}
                            />
                            <label className={`${itemInput} flex flex-1 items-center gap-1`}>
                              <span aria-hidden="true">$</span>
                              <input
                                aria-label={`${name(id)}的品項金額 ${idx + 1}`}
                                placeholder="金額"
                                inputMode="decimal"
                                value={item.amount}
                                onChange={(e) => {
                                  const v = toMoneyInput(e.target.value)
                                  if (v !== null) actions.updateItem(id, item.id, "amount", v)
                                }}
                                className="w-full min-w-0 bg-transparent text-right outline-none"
                              />
                            </label>
                            <button type="button" aria-label="刪除項目" onClick={() => actions.removeItem(id, item.id)} className="flex h-5 w-5 shrink-0 items-center justify-center text-v2-danger-strong">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="mb-2.5 mt-3 flex items-center justify-between gap-2">
        <p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-v2-ink-muted">
          共同分攤 <span className="font-bold text-v2-ink">（{state.personalMode ? "剩餘 " : ""}{money(Math.max(0, derived.splitInput.amount - derived.personalTotal))}）</span>
          {!settleView && derived.remainderMembers.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="尾差說明"
                  className="inline-flex items-center gap-0.5 rounded-full bg-v2-lake-tint px-1.5 py-px text-[10px] font-bold text-v2-lake"
                >
                  <Info className="h-3 w-3" aria-hidden="true" />
                  尾差 ${formatAmount(fromMinorUnits(derived.remainderMinor, currency), currency)}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                sideOffset={6}
                collisionPadding={12}
                className="w-auto max-w-[15rem] text-xs leading-relaxed"
              >
                除不盡的零頭會依公平原則輪替，由不同成員承擔，長期平均。
              </PopoverContent>
            </Popover>
          )}
        </p>
        {!settleView && (
          <button type="button" onClick={() => actions.setPoolAll(!allInPool)} className="shrink-0 text-xs font-bold text-v2-lake">
            {allInPool ? "取消全選" : "全選"}
          </button>
        )}
      </div>
      {!settleView && (
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
                <V2Avatar
                  image={m.image ?? null}
                  name={m.displayName}
                  className={`h-5 w-5 rounded-full ${on ? "" : "opacity-40"}`}
                  fallbackClassName={`text-[9px] font-bold ${tone(m.id)}`}
                />
                <span className="text-xs font-semibold">{m.displayName}</span>
              </button>
            )
          })}
        </div>
      )}
      {!settleView && state.pool.length === 0 && (
        <p className="mt-2.5 rounded-[14px] border border-dashed border-v2-line bg-v2-paper py-3.5 text-center text-xs text-v2-ink-subtle">
          目前沒有人參與共同分攤，點上面的名字挑選分攤的人。
        </p>
      )}
      {state.pool.length > 0 && (
        <div className="mt-2.5 overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {state.pool.map((id) => {
            const custom = state.customShares[id]
            const isCustom = custom !== undefined
            return (
              <div key={id} className="border-b border-v2-line-soft bg-v2-lake-soft px-3.5 py-3 last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <V2Avatar
                    image={members.find((m) => m.id === id)?.image ?? null}
                    name={name(id)}
                    className="h-7 w-7 rounded-full"
                    fallbackClassName={`text-[11px] font-bold ${tone(id)}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{name(id)}</span>
                  {!settleView && derived.remainderMembers.includes(id) && (
                    <span className="shrink-0 rounded bg-v2-lake-tint px-1 text-[10px] font-bold text-v2-lake">尾差</span>
                  )}
                  {isCustom && !settleView ? (
                    // An emptied input keeps the pinned state; the draft treats "" as auto.
                    <label className="flex w-24 items-center rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-[13px] font-bold">
                      <span aria-hidden="true">$</span>
                      <input
                        aria-label={`${name(id)}的分攤金額`}
                        inputMode="decimal"
                        value={custom}
                        placeholder={String(poolShareOf(id))}
                        onChange={(e) => {
                          const v = toMoneyInput(e.target.value)
                          if (v !== null) actions.setCustomShare(id, v)
                        }}
                        className="w-full min-w-0 bg-transparent text-right outline-none"
                      />
                    </label>
                  ) : (
                    <span aria-label={`${name(id)}的分攤金額`} className="shrink-0 text-right text-[13px] font-bold">
                      {money(poolShareOf(id))}
                    </span>
                  )}
                  {!settleView && (
                    <button
                      type="button"
                      aria-label={isCustom ? `${name(id)}取消固定金額` : `${name(id)}固定金額`}
                      aria-pressed={isCustom}
                      onClick={() => (isCustom ? actions.clearCustomShare(id) : actions.setCustomShare(id, String(poolShareOf(id))))}
                      className={`${smallButton} ${isCustom ? "bg-v2-lake text-v2-on-lake" : "border-[1.5px] border-v2-check text-v2-ink-muted"}`}
                    >
                      {isCustom ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                    </button>
                  )}
                  {!settleView && (
                    <button type="button" aria-label={`${name(id)}不參與共同分攤`} onClick={() => actions.togglePool(id)} className={`${smallButton} bg-v2-danger-soft text-v2-danger-strong`}>
                      <UserMinus className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {showLegacyEstimate && (
                  <p
                    data-testid="pool-project-estimate"
                    className="mt-1 break-words pl-[38px] text-[10px] text-v2-ink-muted"
                  >
                    ≈ {formatCurrency(poolShareOf(id) * rate!, projectCurrency!)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!showBreakdown && (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-v2-ink-muted">已選 {derived.splitInput.participantIds.length} 人</span>
            <MatchBadge matches={derived.matches} />
          </div>
          <SplitEquation draft={draft} currency={currency} displayCurrency={displayCurrency} rate={rate} />
        </div>
      )}

      {showBreakdown && (
        <SplitSummary
          members={members}
          draft={draft}
          currency={currency}
          projectCurrency={projectCurrency}
          rate={rate}
          displayCurrency={displayCurrency}
        />
      )}
    </section>
  )
}
