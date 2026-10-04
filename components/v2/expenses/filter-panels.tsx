"use client"

import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { Check, ChevronLeft, ChevronRight, CircleX } from "lucide-react"
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { formatAmount } from "@/lib/constants/currencies"
import { currencySymbol } from "@/components/v2/ui/currency-field"
import { CATEGORY_TONES } from "@/components/v2/category-style"

function PanelHeader({ title, onClear, showClear }: { title: string; onClear: () => void; showClear: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
        <p className="m-0 text-[10px] font-bold text-v2-ink-subtle">{title}</p>
        {showClear && (
          <button type="button" onClick={onClear} className="flex items-center gap-[3px] rounded-md px-1 py-0.5 text-[10px] font-bold text-v2-danger">
            <CircleX className="h-[11px] w-[11px]" strokeWidth={2.4} aria-hidden="true" />
            清除
          </button>
        )}
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
      <PanelHeader title="選擇類別（可複選）" onClear={onClear} showClear={selected.size > 0} />
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
      <PanelHeader title={title} onClear={onClear} showClear={selected.size > 0} />
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
      <PanelHeader title="選擇幣別" onClear={onClear} showClear={selected.size > 0} />
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
  const [lo, hi] = range
  const hiValue = hi === 0 ? upper : hi
  const loPct = upper > 0 ? (lo / upper) * 100 : 0
  const hiPct = upper > 0 ? (hiValue / upper) * 100 : 100
  const label = (n: number) => `${currencySymbol(currency)}${formatAmount(n, currency)}`
  return (
    <>
      <div className="px-3 pt-2.5 pb-3.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="m-0 text-[10px] font-bold text-v2-ink-subtle">設定金額區間</p>
          {(lo > 0 || hi > 0) && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-[3px] rounded-md px-1 py-0.5 text-[10px] font-bold text-v2-danger"
            >
              <CircleX className="h-[11px] w-[11px]" strokeWidth={2.4} aria-hidden="true" />
              清除
            </button>
          )}
        </div>
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-v2-ink">
          <span>{label(lo)}</span>
          <span>{label(hiValue)}</span>
        </div>
        <div className="relative flex h-3.5 items-center">
          <span className="absolute inset-x-0 h-1 rounded-full bg-v2-line-soft" />
          <span className="absolute h-1 rounded-full bg-v2-lake" style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }} />
          <input
            type="range"
            min={0}
            max={upper}
            step={step}
            value={lo}
            aria-label="最低金額"
            onChange={(e) => onChange([Math.min(Number(e.target.value), hiValue), hi])}
            className="v2-range absolute inset-x-0 h-3.5 w-full"
          />
          <input
            type="range"
            min={0}
            max={upper}
            step={step}
            value={hiValue}
            aria-label="最高金額"
            onChange={(e) => {
              const v = Number(e.target.value)
              onChange([lo, v >= upper ? 0 : Math.max(lo, v)])
            }}
            className="v2-range absolute inset-x-0 h-3.5 w-full"
          />
        </div>
      </div>
    </>
  )
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]
const pad = (n: number) => String(n).padStart(2, "0")
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sameDay = (a: Date | undefined, b: Date | undefined) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function DatePanel({ range, onChange }: { range: DateRange | undefined; onChange: (range: DateRange | undefined) => void }) {
  const [month, setMonth] = useState<Date>(() => range?.from ?? new Date())
  const year = month.getFullYear()
  const m = month.getMonth()
  const startDow = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()

  const cells: { date: Date; outside: boolean }[] = []
  for (let i = startDow; i > 0; i--) cells.push({ date: new Date(year, m, 1 - i), outside: true })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, m, d), outside: false })
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true })
  }

  function pick(date: Date) {
    if (!range?.from || range.to) {
      onChange({ from: date, to: undefined })
      return
    }
    if (date < range.from) {
      onChange({ from: date, to: range.from })
      return
    }
    onChange({ from: range.from, to: date })
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-v2-line px-2.5 py-[7px]">
        <span className="text-[11px] font-semibold text-v2-ink">付款日期</span>
        {!!(range?.from || range?.to) && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-[5px] px-[5px] py-0.5 text-[10px] text-v2-ink-muted"
          >
            清除
          </button>
        )}
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="mb-1.5 flex items-center justify-between">
          <button
            type="button"
            aria-label="上個月"
            onClick={() => setMonth(new Date(year, m - 1, 1))}
            className="flex h-[18px] w-[18px] items-center justify-center text-v2-ink-muted"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
          </button>
          <span className="text-[11px] font-semibold text-v2-ink">
            {year}年{m + 1}月
          </span>
          <button
            type="button"
            aria-label="下個月"
            onClick={() => setMonth(new Date(year, m + 1, 1))}
            className="flex h-[18px] w-[18px] items-center justify-center text-v2-ink-muted"
          >
            <ChevronRight className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[9px] text-v2-ink-subtle">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-px text-center">
          {cells.map(({ date, outside }, i) => {
            const selected = sameDay(date, range?.from) || sameDay(date, range?.to)
            const between = !!range?.from && !!range?.to && date > range.from && date < range.to
            return (
              <button
                key={i}
                type="button"
                aria-label={isoDay(date)}
                aria-pressed={selected}
                onClick={() => pick(date)}
                className={`py-1 text-[10px] ${
                  selected
                    ? "rounded-[5px] bg-v2-lake font-bold text-v2-on-lake"
                    : between
                      ? "bg-v2-sand text-v2-ink"
                      : outside
                        ? "text-v2-check"
                        : "text-v2-ink"
                }`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
