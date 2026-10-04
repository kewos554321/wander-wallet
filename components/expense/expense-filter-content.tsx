"use client"

import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"

export function CategoryFilterItems({ selected, onToggle }: { selected: Set<string>; onToggle: (category: string) => void }) {
  return (
    <>
      <DropdownMenuLabel>消費類別</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {EXPENSE_CATEGORIES.map((key) => {
        const Icon = CATEGORY_ICONS[key]
        return (
          <DropdownMenuCheckboxItem key={key} checked={selected.has(key)} onCheckedChange={() => onToggle(key)}>
            <Icon className="h-4 w-4 mr-2" />
            {CATEGORY_LABELS[key]}
          </DropdownMenuCheckboxItem>
        )
      })}
    </>
  )
}

export function MemberFilterItems({
  heading,
  members,
  selected,
  onToggle,
  emptyText = "無資料",
}: {
  heading: string
  members: { id: string; displayName: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  /** Text shown when there are no members to filter by. */
  emptyText?: string
}) {
  return (
    <>
      <DropdownMenuLabel>{heading}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {members.length > 0 ? (
        members.map((m) => (
          <DropdownMenuCheckboxItem key={m.id} checked={selected.has(m.id)} onCheckedChange={() => onToggle(m.id)}>
            {m.displayName}
          </DropdownMenuCheckboxItem>
        ))
      ) : (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</div>
      )}
    </>
  )
}

export function CurrencyFilterItems({
  currencies,
  selected,
  onToggle,
}: {
  currencies: string[]
  selected: Set<string>
  onToggle: (code: string) => void
}) {
  return (
    <>
      <DropdownMenuLabel>幣別</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {currencies.map((code) => (
        <DropdownMenuCheckboxItem key={code} checked={selected.has(code)} onCheckedChange={() => onToggle(code)}>
          {code}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  )
}

export function AmountRangeFilterContent({
  range,
  max,
  currency,
  onChange,
}: {
  range: [number, number]
  max: number
  currency: string
  onChange: (range: [number, number]) => void
}) {
  const upper = max || 10000
  const step = Math.max(1, Math.floor(upper / 100))
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{formatCurrency(range[0], currency)}</span>
        <span className="text-muted-foreground">~</span>
        <span className="font-medium">{range[1] === 0 ? "不限" : formatCurrency(range[1], currency)}</span>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">最低</label>
        <input
          type="range"
          min={0}
          max={upper}
          step={step}
          value={range[0]}
          onChange={(e) => onChange([Number(e.target.value), range[1]])}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">最高 (0=不限)</label>
        <input
          type="range"
          min={0}
          max={upper}
          step={step}
          value={range[1]}
          onChange={(e) => onChange([range[0], Number(e.target.value)])}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
      {(range[0] > 0 || range[1] > 0) && (
        <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => onChange([0, 0])}>
          清除
        </Button>
      )}
    </div>
  )
}

export function DateRangeFilterContent({
  title,
  range,
  onChange,
}: {
  title: string
  range: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  return (
    <>
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        {range && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange(undefined)}>
            清除
          </Button>
        )}
      </div>
      <Calendar mode="range" selected={range} onSelect={onChange} numberOfMonths={1} />
    </>
  )
}
