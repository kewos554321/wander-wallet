import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"
import type { DateRange } from "react-day-picker"

// Remember the v2 expense-list filters for a project while the tab is open, so
// returning to the list (e.g. pressing back from an expense card) keeps them.
// Scoped per project and per tab; cleared when the filters are cleared.
const key = (projectId: string) => `wander-wallet:expense-filters:${projectId}`

interface StoredRange {
  from?: string
  to?: string
}

interface StoredFilters {
  searchQuery: string
  selectedCategories: string[]
  selectedPayers: string[]
  selectedParticipants: string[]
  selectedCurrencies: string[]
  amountRange: [number, number]
  createdDateRange?: StoredRange
  expenseDateRange?: StoredRange
}

function dateToIso(d: Date | undefined): string | undefined {
  if (!d) return undefined
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function isoToDate(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function rangeToStored(r: DateRange | undefined): StoredRange | undefined {
  if (!r?.from && !r?.to) return undefined
  return { from: dateToIso(r?.from), to: dateToIso(r?.to) }
}

function storedToRange(r: StoredRange | undefined): DateRange | undefined {
  if (!r) return undefined
  const from = isoToDate(r.from)
  const to = isoToDate(r.to)
  if (!from && !to) return undefined
  return { from, to }
}

function hasActive(f: ExpenseFilters): boolean {
  return (
    f.searchQuery !== "" ||
    f.selectedCategories.size > 0 ||
    f.selectedPayers.size > 0 ||
    f.selectedParticipants.size > 0 ||
    f.selectedCurrencies.size > 0 ||
    f.amountRange[0] > 0 ||
    f.amountRange[1] > 0 ||
    f.createdDateRange?.from !== undefined ||
    f.createdDateRange?.to !== undefined ||
    f.expenseDateRange?.from !== undefined ||
    f.expenseDateRange?.to !== undefined
  )
}

export function loadFilters(projectId: string): Partial<ExpenseFilters> | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key(projectId))
    if (!raw) return null
    const s = JSON.parse(raw) as StoredFilters
    return {
      searchQuery: s.searchQuery,
      selectedCategories: new Set(s.selectedCategories),
      selectedPayers: new Set(s.selectedPayers),
      selectedParticipants: new Set(s.selectedParticipants),
      selectedCurrencies: new Set(s.selectedCurrencies),
      amountRange: s.amountRange,
      createdDateRange: storedToRange(s.createdDateRange),
      expenseDateRange: storedToRange(s.expenseDateRange),
    }
  } catch {
    return null
  }
}

export function saveFilters(projectId: string, f: ExpenseFilters): void {
  if (typeof window === "undefined") return
  try {
    if (!hasActive(f)) {
      window.sessionStorage.removeItem(key(projectId))
      return
    }
    const stored: StoredFilters = {
      searchQuery: f.searchQuery,
      selectedCategories: [...f.selectedCategories],
      selectedPayers: [...f.selectedPayers],
      selectedParticipants: [...f.selectedParticipants],
      selectedCurrencies: [...f.selectedCurrencies],
      amountRange: f.amountRange,
      createdDateRange: rangeToStored(f.createdDateRange),
      expenseDateRange: rangeToStored(f.expenseDateRange),
    }
    window.sessionStorage.setItem(key(projectId), JSON.stringify(stored))
  } catch {
    // ignore storage failures (private mode, quota)
  }
}
