"use client"

import { useState, type ReactNode } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarDays, CircleX, Coins, DollarSign, Pencil, Plus, SlidersHorizontal, Tag, Trash2, User, Users } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SearchField } from "@/components/v2/ui/search-field"
import { FilterPopover } from "@/components/v2/expenses/filter-popover"
import { AmountPanel, CategoryPanel, CurrencyPanel, DatePanel } from "@/components/v2/expenses/filter-panels"
import { ActionPanel, NameListPanel, type NameOption } from "./filter-panels"
import { categoryLabel, formatChanges, getActionText, getActionTone, type ActionTone } from "./format"
import { getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import { cn } from "@/lib/utils"

export interface ActivityLog {
  id: string
  entityType: string
  entityId: string
  action: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  metadata: {
    description?: string | null
    amount?: number
    category?: string | null
    payerName?: string
    expenseDate?: string
    currency?: string
  } | null
  createdAt: string
  actor: { id: string; displayName: string; user: { image: string | null } | null } | null
}

export interface ActivityFiltersState {
  search: string
  actions: Set<string>
  actors: Set<string>
  payers: Set<string>
  categories: Set<string>
  currencies: Set<string>
  amountRange: [number, number]
  expenseRange: DateRange | undefined
}

export interface ActivityLogsV2ViewProps {
  projectId: string
  projectCurrency: string
  logs: ActivityLog[]
  filteredLogs: ActivityLog[]
  total: number
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  filters: ActivityFiltersState
  actorOptions: NameOption[]
  payerOptions: NameOption[]
  categoryOptions: NameOption[]
  currencyOptions: string[]
  amountMax: number
  hasActiveFilters: boolean
  onSearch: (value: string) => void
  onToggle: (field: "actions" | "actors" | "payers" | "categories" | "currencies", key: string) => void
  onAmountRange: (range: [number, number]) => void
  onExpenseRange: (range: DateRange | undefined) => void
  onClear: () => void
  onLoadMore: () => void
}

const TONE: Record<ActionTone, { header: string; icon: string }> = {
  create: { header: "bg-v2-lake-soft text-v2-lake", icon: "bg-v2-lake-edge text-v2-lake" },
  update: { header: "bg-v2-gold-soft text-v2-gold", icon: "bg-v2-gold-tint text-v2-gold" },
  delete: { header: "bg-v2-coral-soft text-v2-danger", icon: "bg-v2-danger-border text-v2-danger" },
}

function actionIcon(action: string): ReactNode {
  if (action === "create") return <Plus className="h-[11px] w-[11px]" strokeWidth={2.5} />
  if (action === "update") return <Pencil className="h-[11px] w-[11px]" strokeWidth={2.5} />
  if (action === "delete") return <Trash2 className="h-[11px] w-[11px]" strokeWidth={2.5} />
  return <Plus className="h-[11px] w-[11px]" strokeWidth={2.5} />
}

function relative(createdAt: string): string {
  try {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: zhTW })
  } catch {
    return ""
  }
}

function rangeLabel(range: DateRange | undefined, fallback: string): string {
  if (!range?.from) return fallback
  return range.to ? `${format(range.from, "M/d")}~${format(range.to, "M/d")}` : `${format(range.from, "M/d")}~`
}

export function ActivityLogsV2View(props: ActivityLogsV2ViewProps) {
  const {
    projectId,
    projectCurrency,
    logs,
    filteredLogs,
    loading,
    loadingMore,
    hasMore,
    filters,
    actorOptions,
    payerOptions,
    categoryOptions,
    currencyOptions,
    amountMax,
    hasActiveFilters,
    onSearch,
    onToggle,
    onAmountRange,
    onExpenseRange,
    onClear,
    onLoadMore,
  } = props
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const togglePanel = (key: string) => setOpenPanel((current) => (current === key ? null : key))
  const showCurrency = currencyOptions.length > 1

  return (
    <div className="min-h-screen">
      <V2TopBar title="歷史紀錄" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />

      {loading ? (
        <div data-testid="v2-activity-logs-skeleton" className="mx-4 mt-3.5 h-64 animate-pulse rounded-2xl bg-v2-sand" />
      ) : (
        <div className="px-4 pt-3">
          <div className="mb-2.5">
            <SearchField value={filters.search} onChange={onSearch} placeholder="搜尋描述、付款人、操作者..." ariaLabel="搜尋紀錄" />
          </div>

          <div className="mb-2.5 grid grid-cols-3 gap-2">
            <FilterPopover label="操作" icon={<SlidersHorizontal className="h-3.5 w-3.5" />} count={filters.actions.size} open={openPanel === "actions"} onToggle={() => togglePanel("actions")} widthClass="w-32">
              <ActionPanel selected={filters.actions} onToggle={(k) => onToggle("actions", k)} onClear={() => filters.actions.forEach((k) => onToggle("actions", k))} />
            </FilterPopover>
            <FilterPopover label="操作者" icon={<Users className="h-3.5 w-3.5" />} count={filters.actors.size} open={openPanel === "actors"} onToggle={() => togglePanel("actors")} widthClass="w-40">
              <NameListPanel title="誰執行操作" options={actorOptions} selected={filters.actors} onToggle={(k) => onToggle("actors", k)} onClear={() => filters.actors.forEach((k) => onToggle("actors", k))} emptyText="無操作者" />
            </FilterPopover>
            <FilterPopover label="類別" icon={<Tag className="h-3.5 w-3.5" />} count={filters.categories.size} open={openPanel === "categories"} onToggle={() => togglePanel("categories")} align="right" widthClass="w-36">
              <CategoryPanel selected={filters.categories} onToggle={(k) => onToggle("categories", k)} onClear={() => filters.categories.forEach((k) => onToggle("categories", k))} />
            </FilterPopover>
            <FilterPopover label="付款人" icon={<User className="h-3.5 w-3.5" />} count={filters.payers.size} open={openPanel === "payers"} onToggle={() => togglePanel("payers")} widthClass="w-36">
              <NameListPanel title="誰付錢" options={payerOptions} selected={filters.payers} onToggle={(k) => onToggle("payers", k)} onClear={() => filters.payers.forEach((k) => onToggle("payers", k))} emptyText="無付款人" />
            </FilterPopover>
            {showCurrency ? (
              <FilterPopover label="幣別" icon={<Coins className="h-3.5 w-3.5" />} count={filters.currencies.size} open={openPanel === "currencies"} onToggle={() => togglePanel("currencies")} widthClass="w-32">
                <CurrencyPanel currencies={currencyOptions} selected={filters.currencies} onToggle={(k) => onToggle("currencies", k)} onClear={() => filters.currencies.forEach((k) => onToggle("currencies", k))} />
              </FilterPopover>
            ) : null}
            <FilterPopover label="金額" icon={<DollarSign className="h-3.5 w-3.5" />} count={filters.amountRange[0] > 0 || filters.amountRange[1] > 0 ? 1 : 0} open={openPanel === "amount"} onToggle={() => togglePanel("amount")} widthClass="w-56">
              <AmountPanel range={filters.amountRange} max={amountMax} currency={projectCurrency} onChange={onAmountRange} onClear={() => onAmountRange([0, 0])} />
            </FilterPopover>
            <FilterPopover
              label={rangeLabel(filters.expenseRange, "付款日期")}
              ariaLabel="付款日期"
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              count={filters.expenseRange?.from ? 1 : 0}
              open={openPanel === "expense"}
              onToggle={() => togglePanel("expense")}
              align="right"
              widthClass="w-[236px]"
              panelRadiusClass="rounded-[10px]"
            >
              <DatePanel range={filters.expenseRange} onChange={onExpenseRange} />
            </FilterPopover>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-[5px] rounded-[10px] border border-dashed border-v2-danger-edge bg-v2-danger-wash px-2.5 py-[9px] text-xs font-semibold text-v2-danger"
              >
                <CircleX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate text-left">移除篩選</span>
              </button>
            ) : null}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] text-v2-ink-muted">
              顯示 {filteredLogs.length} / {logs.length} 筆
            </span>
          </div>

          {logs.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-v2-ink-muted">還沒有操作紀錄</p>
          ) : filteredLogs.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-v2-ink-muted">沒有符合條件的紀錄</p>
          ) : (
            <div className="flex flex-col gap-2.5 pb-6">
              {filteredLogs.map((log) => {
                const tone = TONE[getActionTone(log.action)]
                return (
                  <div key={log.id} data-testid={`activity-card-${log.id}`} className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
                    <div data-testid={`activity-card-header-${log.id}`} className={cn("flex items-center justify-between px-3.5 py-2.5", tone.header)}>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold">
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded-[6px]", tone.icon)}>{actionIcon(log.action)}</span>
                        {getActionText(log.action, log.entityType)}
                      </span>
                      <span className="text-[11px] text-v2-ink-muted">{relative(log.createdAt)}</span>
                    </div>
                    <div className="px-3.5 py-2.5">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-v2-lake-soft text-[10px]">
                          {log.actor ? log.actor.displayName.charAt(0) : "🧾"}
                        </span>
                        <span className="text-[12px]">{log.actor?.displayName ?? "系統"}</span>
                      </div>
                      {log.metadata ? (
                        <div className="flex items-center justify-between rounded-[10px] bg-v2-paper px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="m-0 truncate text-[13px] font-semibold">{log.metadata.description || "無描述"}</p>
                            <p className="m-0 mt-0.5 text-[11px] text-v2-ink-muted">
                              付款人：{log.metadata.payerName || "—"}
                              {log.metadata.expenseDate ? ` · ${new Date(log.metadata.expenseDate).toLocaleDateString("zh-TW")}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            {log.metadata.amount !== undefined ? (
                              <p className="m-0 text-[13px] font-bold">{formatCurrency(log.metadata.amount, log.metadata.currency || projectCurrency)}</p>
                            ) : null}
                            {log.metadata.category ? (
                              <span className="rounded-full bg-v2-lake-soft px-[7px] py-0.5 text-[10px] text-v2-lake">{getCategoryLabel(log.metadata.category)}</span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {formatChanges(log.changes, log.metadata?.currency || projectCurrency).map((change, index) => (
                        <div key={`${change.label}-${index}`} data-testid={`activity-change-${log.id}-${index}`} className="mt-2 w-fit rounded-[8px] border border-v2-line bg-v2-paper px-2 py-1 text-[11px]">
                          {change.label}：<span className="text-v2-danger line-through">{change.from}</span> → <span className="text-v2-lake">{change.to}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {hasMore && filteredLogs.length > 0 ? (
            <button type="button" onClick={onLoadMore} disabled={loadingMore} className="pb-8 text-center text-[13px] font-bold text-v2-lake disabled:opacity-50">
              {loadingMore ? "載入中..." : "載入更多"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
