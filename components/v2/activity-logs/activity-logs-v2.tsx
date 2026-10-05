"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { useProjectData } from "@/lib/hooks"
import { getCategoryLabel } from "@/lib/constants/expenses"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { ActivityLogsV2View, type ActivityLog, type ActivityFiltersState } from "./activity-logs-v2-view"
import type { NameOption } from "./filter-panels"

const EMPTY_FILTERS: ActivityFiltersState = {
  search: "",
  actions: new Set(),
  actors: new Set(),
  payers: new Set(),
  categories: new Set(),
  currencies: new Set(),
  amountRange: [0, 0],
  expenseRange: undefined,
}

const LIMIT = 50

function withinRange(date: string | undefined, range: DateRange | undefined): boolean {
  if (!range?.from) return true
  if (!date) return false
  const time = new Date(date).getTime()
  const from = new Date(range.from).setHours(0, 0, 0, 0)
  const to = range.to ? new Date(range.to).setHours(23, 59, 59, 999) : new Date(range.from).setHours(23, 59, 59, 999)
  return time >= from && time <= to
}

export function ActivityLogsV2({ projectId }: { projectId: string }) {
  const authFetch = useAuthFetch()
  const { projectCurrency } = useProjectData(projectId)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [filters, setFilters] = useState<ActivityFiltersState>(EMPTY_FILTERS)

  const fetchLogs = useCallback(
    async (offset = 0, append = false) => {
      if (append) setLoadingMore(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/activity-logs?limit=${LIMIT}&offset=${offset}`)
        if (res.ok) {
          const data = await res.json()
          setTotal(data.total ?? 0)
          setHasMore(Boolean(data.hasMore))
          setLogs((prev) => (append ? [...prev, ...(data.logs ?? [])] : data.logs ?? []))
        }
      } catch (error) {
        console.error("獲取操作紀錄錯誤:", error)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [authFetch, projectId]
  )

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filteredLogs = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return logs.filter((log) => {
      if (filters.actions.size > 0 && !filters.actions.has(log.action)) return false
      if (filters.actors.size > 0 && !filters.actors.has(log.actor?.id ?? "")) return false
      if (filters.payers.size > 0 && !filters.payers.has(log.metadata?.payerName ?? "")) return false
      if (filters.categories.size > 0 && !filters.categories.has(log.metadata?.category ?? "other")) return false
      if (filters.currencies.size > 0 && !filters.currencies.has(log.metadata?.currency ?? projectCurrency)) return false
      const amount = log.metadata?.amount ?? 0
      const [lo, hi] = filters.amountRange
      if (lo > 0 && amount < lo) return false
      if (hi > 0 && amount > hi) return false
      if (!withinRange(log.metadata?.expenseDate, filters.expenseRange)) return false
      if (query) {
        const haystack = [log.metadata?.description, log.metadata?.payerName, log.actor?.displayName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [logs, filters, projectCurrency])

  const actorOptions = useMemo<NameOption[]>(() => {
    const map = new Map<string, string>()
    for (const log of logs) if (log.actor) map.set(log.actor.id, log.actor.displayName)
    return [...map.entries()].map(([key, label]) => ({ key, label }))
  }, [logs])

  const payerOptions = useMemo<NameOption[]>(() => {
    const set = new Set<string>()
    for (const log of logs) if (log.metadata?.payerName) set.add(log.metadata.payerName)
    return [...set].map((name) => ({ key: name, label: name }))
  }, [logs])

  const categoryOptions = useMemo<NameOption[]>(() => {
    const set = new Set<string>()
    for (const log of logs) set.add(log.metadata?.category ?? "other")
    return [...set].map((key) => ({ key, label: getCategoryLabel(key) }))
  }, [logs])

  const currencyOptions = useMemo(() => {
    const set = new Set<string>()
    for (const log of logs) set.add(log.metadata?.currency ?? projectCurrency)
    return [...set]
  }, [logs, projectCurrency])

  const amountMax = useMemo(() => Math.max(1000, ...logs.map((log) => log.metadata?.amount ?? 0)), [logs])

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.actions.size > 0 ||
    filters.actors.size > 0 ||
    filters.payers.size > 0 ||
    filters.categories.size > 0 ||
    filters.currencies.size > 0 ||
    filters.amountRange[0] > 0 ||
    filters.amountRange[1] > 0 ||
    Boolean(filters.expenseRange)

  const onToggle = useCallback((field: "actions" | "actors" | "payers" | "categories" | "currencies", key: string) => {
    setFilters((prev) => {
      const next = new Set(prev[field])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...prev, [field]: next }
    })
  }, [])

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <ActivityLogsV2View
          projectId={projectId}
          projectCurrency={projectCurrency}
          logs={logs}
          filteredLogs={filteredLogs}
          total={total}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          filters={filters}
          actorOptions={actorOptions}
          payerOptions={payerOptions}
          categoryOptions={categoryOptions}
          currencyOptions={currencyOptions}
          amountMax={amountMax}
          hasActiveFilters={hasActiveFilters}
          onSearch={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          onToggle={onToggle}
          onAmountRange={(range) => setFilters((prev) => ({ ...prev, amountRange: range }))}
          onExpenseRange={(range) => setFilters((prev) => ({ ...prev, expenseRange: range }))}
          onClear={() => setFilters(EMPTY_FILTERS)}
          onLoadMore={() => fetchLogs(logs.length, true)}
        />
      </div>
    </UiV2Scope>
  )
}
