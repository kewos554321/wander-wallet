"use client"

import type { DateRange } from "react-day-picker"
import { Check, CircleX } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import { CATEGORY_TONES } from "@/components/v2/category-style"

function PanelHeader({ title, onClear }: { title: string; onClear: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
        <p className="m-0 text-[10px] font-bold text-v2-ink-subtle">{title}</p>
        <button type="button" onClick={onClear} className="flex items-center gap-[3px] rounded-md px-1 py-0.5 text-[10px] font-bold text-v2-danger">
          <CircleX className="h-[11px] w-[11px]" strokeWidth={2.4} aria-hidden="true" />
          清除
        </button>
      </div>
      <div className="h-px bg-v2-line-soft" />
    </>
  )
}

function CheckBox({ checked, round }: { checked: boolean; round?: boolean }) {
  return (
    <span
      className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center ${
        round ? "rounded-full" : "rounded-[4px]"
      } ${checked ? "bg-v2-lake" : "border-[1.5px] border-v2-line bg-v2-surface"}`}
    >
      {checked && <Check className="h-2.5 w-2.5 text-v2-on-lake" strokeWidth={3} aria-hidden="true" />}
    </span>
  )
}

export function CategoryPanel({ selected, onToggle, onClear }: { selected: Set<string>; onToggle: (category: string) => void; onClear: () => void }) {
  return (
    <>
      <PanelHeader title="選擇類別（可複選）" onClear={onClear} />
      <div className="v2-scroll max-h-44 overflow-y-auto">
        {EXPENSE_CATEGORIES.map((key) => (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={selected.has(key)}
            aria-label={CATEGORY_LABELS[key]}
            onClick={() => onToggle(key)}
            className="flex w-full items-center gap-2 px-2.5 py-[7px] text-xs"
          >
            <CheckBox checked={selected.has(key)} />
            <span className={`h-[18px] w-[18px] shrink-0 rounded-[5px] ${CATEGORY_TONES[key]}`} aria-hidden="true" />
            <span className="text-left">{CATEGORY_LABELS[key]}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function MemberPanel({
  title,
  members,
  selected,
  onToggle,
  onClear,
  round = false,
}: {
  title: string
  members: { id: string; displayName: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
  round?: boolean
}) {
  return (
    <>
      <PanelHeader title={title} onClear={onClear} />
      <div className="v2-scroll max-h-44 overflow-y-auto">
        {members.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-v2-ink-muted">沒有資料</div>
        ) : (
          members.map((member) => (
            <button
              key={member.id}
              type="button"
              role={round ? "radio" : "checkbox"}
              aria-checked={selected.has(member.id)}
              aria-label={member.displayName}
              onClick={() => onToggle(member.id)}
              className="flex w-full items-center gap-2 px-2.5 py-[7px] text-xs"
            >
              <CheckBox checked={selected.has(member.id)} round={round} />
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-v2-lake-tint text-[8px] font-bold text-v2-lake" aria-hidden="true">
                {member.displayName.charAt(0)}
              </span>
              <span className="text-left">{member.displayName}</span>
            </button>
          ))
        )}
      </div>
    </>
  )
}

export function CurrencyPanel({
  currencies,
  selected,
  onToggle,
  onClear,
}: {
  currencies: string[]
  selected: Set<string>
  onToggle: (code: string) => void
  onClear: () => void
}) {
  return (
    <>
      <PanelHeader title="選擇幣別" onClear={onClear} />
      <div className="v2-scroll max-h-44 overflow-y-auto">
        {currencies.map((code) => (
          <button
            key={code}
            type="button"
            role="checkbox"
            aria-checked={selected.has(code)}
            aria-label={code}
            onClick={() => onToggle(code)}
            className="flex w-full items-center gap-2 px-2.5 py-[7px] text-xs"
          >
            <CheckBox checked={selected.has(code)} />
            <span className="text-left">{code}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function AmountPanel({
  range,
  max,
  currency,
  onChange,
  onClear,
}: {
  range: [number, number]
  max: number
  currency: string
  onChange: (range: [number, number]) => void
  onClear: () => void
}) {
  const upper = max || 10000
  const step = Math.max(1, Math.floor(upper / 100))
  return (
    <>
      <PanelHeader title="設定金額區間" onClear={onClear} />
      <div className="px-2.5 pb-3 pt-2">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-v2-ink">
          <span>{formatCurrency(range[0], currency)}</span>
          <span>{range[1] === 0 ? formatCurrency(upper, currency) : formatCurrency(range[1], currency)}</span>
        </div>
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={upper}
            step={step}
            value={range[0]}
            aria-label="最低金額"
            onChange={(e) => onChange([Number(e.target.value), range[1]])}
            className="h-1 w-full appearance-none rounded-full accent-v2-lake"
          />
          <input
            type="range"
            min={0}
            max={upper}
            step={step}
            value={range[1]}
            aria-label="最高金額"
            onChange={(e) => onChange([range[0], Number(e.target.value)])}
            className="h-1 w-full appearance-none rounded-full accent-v2-lake"
          />
        </div>
      </div>
    </>
  )
}

export function DatePanel({ range, onChange }: { range: DateRange | undefined; onChange: (range: DateRange | undefined) => void }) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-v2-line px-2.5 py-[7px]">
        <span className="text-[11px] font-semibold text-v2-ink">付款日期</span>
        <button type="button" onClick={() => onChange(undefined)} className="rounded-[5px] px-[5px] py-0.5 text-[10px] text-v2-ink-muted">
          清除
        </button>
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <Calendar mode="range" numberOfMonths={1} selected={range} onSelect={onChange} />
      </div>
    </>
  )
}
