import { describe, it, expect, beforeEach } from "vitest"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"
import { loadFilters, saveFilters } from "@/components/v2/expenses/filter-storage"

const base: ExpenseFilters = {
  searchQuery: "",
  selectedCategories: new Set(),
  selectedPayers: new Set(),
  selectedParticipants: new Set(),
  selectedCurrencies: new Set(),
  amountRange: [0, 0],
  createdDateRange: undefined,
  expenseDateRange: undefined,
}

beforeEach(() => sessionStorage.clear())

describe("expense filter storage", () => {
  it("returns null when nothing is stored", () => {
    expect(loadFilters("p1")).toBeNull()
  })

  it("round-trips filters", () => {
    saveFilters("p1", {
      ...base,
      searchQuery: "拉麵",
      selectedCategories: new Set(["food"]),
      selectedPayers: new Set(["m1"]),
      selectedParticipants: new Set(["m2"]),
      selectedCurrencies: new Set(["JPY"]),
      amountRange: [100, 500],
      expenseDateRange: { from: new Date(2026, 10, 1), to: new Date(2026, 10, 5) },
    })

    const loaded = loadFilters("p1")!
    expect(loaded.searchQuery).toBe("拉麵")
    expect(loaded.selectedCategories).toEqual(new Set(["food"]))
    expect(loaded.selectedPayers).toEqual(new Set(["m1"]))
    expect(loaded.selectedParticipants).toEqual(new Set(["m2"]))
    expect(loaded.selectedCurrencies).toEqual(new Set(["JPY"]))
    expect(loaded.amountRange).toEqual([100, 500])
    expect(loaded.expenseDateRange?.from).toEqual(new Date(2026, 10, 1))
    expect(loaded.expenseDateRange?.to).toEqual(new Date(2026, 10, 5))
  })

  it("removes the entry when the filters are empty", () => {
    saveFilters("p1", { ...base, searchQuery: "x" })
    expect(loadFilters("p1")).not.toBeNull()
    saveFilters("p1", base)
    expect(loadFilters("p1")).toBeNull()
  })

  it("keeps filters scoped per project", () => {
    saveFilters("p1", { ...base, searchQuery: "a" })
    expect(loadFilters("p2")).toBeNull()
  })

  it("ignores corrupt data", () => {
    sessionStorage.setItem("wander-wallet:expense-filters:p1", "{not json")
    expect(loadFilters("p1")).toBeNull()
  })
})
