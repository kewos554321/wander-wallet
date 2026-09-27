"use client"

import type { ReactNode } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarDays, ChevronDown, Coins, DollarSign, Filter, Search, User, Users } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AmountRangeFilterContent,
  CategoryFilterItems,
  CurrencyFilterItems,
  DateRangeFilterContent,
  MemberFilterItems,
} from "@/components/expense/expense-filter-content"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"

interface ExpenseFilterBarProps {
  filters: ExpenseFilters
  currency: string
  maxAmount: number
  payers: { id: string; displayName: string }[]
  participants: { id: string; displayName: string }[]
  currencies: string[]
  onSearch: (query: string) => void
  onToggleCategory: (category: string) => void
  onTogglePayer: (id: string) => void
  onToggleParticipant: (id: string) => void
  onToggleCurrency: (code: string) => void
  onAmountRange: (range: [number, number]) => void
  onCreatedRange: (range: DateRange | undefined) => void
  onExpenseRange: (range: DateRange | undefined) => void
}

function Chip({ icon, label, count }: { icon: ReactNode; label: string; count: number }) {
  const active = count > 0
  return (
    <span
      className={
        active
          ? "flex w-full items-center gap-[5px] rounded-[10px] border-[1.5px] border-[#2F8F74] bg-v2-lake-soft px-2.5 py-[9px] text-xs font-bold text-v2-lake"
          : "flex w-full items-center gap-[5px] rounded-[10px] border border-v2-line bg-v2-surface px-2.5 py-[9px] text-xs font-semibold text-v2-ink"
      }
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {active ? (
        <span className="flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full bg-v2-lake px-[3px] text-[9px] text-white">
          {count}
        </span>
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
    </span>
  )
}

function rangeLabel(range: DateRange | undefined, fallback: string): string {
  if (!range?.from) return fallback
  return range.to ? `${format(range.from, "M/d")}~${format(range.to, "M/d")}` : `${format(range.from, "M/d")}~`
}

const icon = "h-3.5 w-3.5 shrink-0"

export function ExpenseFilterBar(props: ExpenseFilterBarProps) {
  const { filters } = props
  const amountActive = filters.amountRange[0] > 0 || filters.amountRange[1] > 0 ? 1 : 0

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
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<Filter className={icon} />} label="類別" count={filters.selectedCategories.size} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-32">
            <CategoryFilterItems selected={filters.selectedCategories} onToggle={props.onToggleCategory} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<User className={icon} />} label="付款人" count={filters.selectedPayers.size} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36 max-h-60 overflow-y-auto">
            <MemberFilterItems
              heading="誰付錢"
              members={props.payers}
              selected={filters.selectedPayers}
              onToggle={props.onTogglePayer}
              emptyText="無付款人"
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<Users className={icon} />} label="參與者" count={filters.selectedParticipants.size} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 max-h-60 overflow-y-auto">
            <MemberFilterItems
              heading="有參與分攤"
              members={props.participants}
              selected={filters.selectedParticipants}
              onToggle={props.onToggleParticipant}
              emptyText="無參與者"
            />
          </DropdownMenuContent>
        </DropdownMenu>
        {props.currencies.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <Chip icon={<Coins className={icon} />} label="幣別" count={filters.selectedCurrencies.size} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-28">
              <CurrencyFilterItems currencies={props.currencies} selected={filters.selectedCurrencies} onToggle={props.onToggleCurrency} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<DollarSign className={icon} />} label="金額" count={amountActive} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44 p-2.5">
            <AmountRangeFilterContent range={filters.amountRange} max={props.maxAmount} currency={props.currency} onChange={props.onAmountRange} />
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger className="w-full">
            <Chip icon={<CalendarDays className={icon} />} label={rangeLabel(filters.createdDateRange, "建立日期")} count={filters.createdDateRange?.from ? 1 : 0} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <DateRangeFilterContent title="建立日期" range={filters.createdDateRange} onChange={props.onCreatedRange} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger className="w-full">
            <Chip icon={<CalendarDays className={icon} />} label={rangeLabel(filters.expenseDateRange, "付款日期")} count={filters.expenseDateRange?.from ? 1 : 0} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <DateRangeFilterContent title="付款日期" range={filters.expenseDateRange} onChange={props.onExpenseRange} />
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}
