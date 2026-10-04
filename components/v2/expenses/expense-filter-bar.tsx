"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarDays, CircleX, Coins, DollarSign, Filter, Search, User, Users } from "lucide-react"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"
import { FilterPopover } from "./filter-popover"
import { AmountPanel, CategoryPanel, CurrencyPanel, DatePanel, MemberPanel } from "./filter-panels"

interface ExpenseFilterBarProps {
  filters: ExpenseFilters
  currency: string
  maxAmount: number
  payers: { id: string; displayName: string; image?: string | null }[]
  participants: { id: string; displayName: string; image?: string | null }[]
  currencies: string[]
  hasActiveFilters: boolean
  currentMemberId?: string | null
  onSearch: (query: string) => void
  onToggleCategory: (category: string) => void
  onClearCategories: () => void
  onSetPayers: (ids: Set<string>) => void
  onClearPayers: () => void
  onToggleParticipant: (id: string) => void
  onClearParticipants: () => void
  onToggleCurrency: (code: string) => void
  onClearCurrencies: () => void
  onAmountRange: (range: [number, number]) => void
  onExpenseRange: (range: DateRange | undefined) => void
  onClearFilters: () => void
}

function rangeLabel(range: DateRange | undefined, fallback: string): string {
  if (!range?.from) return fallback
  return range.to ? `${format(range.from, "M/d")}~${format(range.to, "M/d")}` : `${format(range.from, "M/d")}~`
}

const icon = "h-3.5 w-3.5 shrink-0"

export function ExpenseFilterBar(props: ExpenseFilterBarProps) {
  const { filters } = props
  const [openId, setOpenId] = useState<string | null>(null)
  const amountActive = filters.amountRange[0] > 0 || filters.amountRange[1] > 0 ? 1 : 0
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id))
  const members = (list: { id: string; displayName: string; image?: string | null }[]) =>
    list.map((m) => ({ id: m.id, displayName: m.id === props.currentMemberId ? "我" : m.displayName, image: m.image ?? null }))

  return (
    <>
      <label className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-v2-line bg-v2-surface px-3.5 py-2.5">
        <Search className="h-3.5 w-3.5 text-v2-ink-subtle" aria-hidden="true" />
        <input
          type="search"
          value={filters.searchQuery}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder="搜尋支出描述…"
          aria-label="搜尋支出描述"
          className="w-full bg-transparent text-xs outline-none placeholder:text-v2-ink-subtle"
        />
      </label>
      <div className="mx-4 mt-2.5 grid grid-cols-3 gap-2">
        <FilterPopover label="類別" icon={<Filter className={icon} />} count={filters.selectedCategories.size} open={openId === "category"} onToggle={() => toggle("category")} widthClass="w-[232px]">
          <CategoryPanel selected={filters.selectedCategories} onToggle={props.onToggleCategory} onClear={props.onClearCategories} />
        </FilterPopover>

        <FilterPopover label="付款人" icon={<User className={icon} />} count={filters.selectedPayers.size} open={openId === "payer"} onToggle={() => toggle("payer")} widthClass="w-[184px]">
          <MemberPanel
            title="選擇付款人"
            members={members(props.payers)}
            selected={filters.selectedPayers}
            onToggle={(id) => props.onSetPayers(filters.selectedPayers.has(id) ? new Set() : new Set([id]))}
            onClear={props.onClearPayers}
            round
          />
        </FilterPopover>

        <FilterPopover label="參與者" icon={<Users className={icon} />} count={filters.selectedParticipants.size} open={openId === "participant"} onToggle={() => toggle("participant")} align="right" widthClass="w-[190px]">
          <MemberPanel title="選擇參與者（可複選）" members={members(props.participants)} selected={filters.selectedParticipants} onToggle={props.onToggleParticipant} onClear={props.onClearParticipants} />
        </FilterPopover>

        {props.currencies.length > 1 && (
          <FilterPopover label="幣別" icon={<Coins className={icon} />} count={filters.selectedCurrencies.size} open={openId === "currency"} onToggle={() => toggle("currency")} widthClass="w-[150px]">
            <CurrencyPanel currencies={props.currencies} selected={filters.selectedCurrencies} onToggle={props.onToggleCurrency} onClear={props.onClearCurrencies} />
          </FilterPopover>
        )}

        <FilterPopover label="金額" icon={<DollarSign className={icon} />} count={amountActive} open={openId === "amount"} onToggle={() => toggle("amount")} widthClass="w-[230px]">
          <AmountPanel range={filters.amountRange} max={props.maxAmount} currency={props.currency} onChange={props.onAmountRange} onClear={() => props.onAmountRange([0, 0])} />
        </FilterPopover>

        <FilterPopover label={rangeLabel(filters.expenseDateRange, "付款日期")} ariaLabel="付款日期" icon={<CalendarDays className={icon} />} count={filters.expenseDateRange?.from ? 1 : 0} open={openId === "date"} onToggle={() => toggle("date")} align="right" widthClass="w-[236px]" panelRadiusClass="rounded-[10px]">
          <DatePanel range={filters.expenseDateRange} onChange={props.onExpenseRange} />
        </FilterPopover>

        {props.hasActiveFilters && (
          <button
            type="button"
            onClick={props.onClearFilters}
            className="flex items-center gap-[5px] rounded-[10px] border border-dashed border-v2-danger-edge bg-v2-danger-wash px-2.5 py-[9px] text-xs font-semibold text-v2-danger"
          >
            <CircleX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate text-left">移除篩選</span>
          </button>
        )}
      </div>
    </>
  )
}
