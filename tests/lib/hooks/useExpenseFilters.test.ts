import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useExpenseFilters, Expense } from "@/lib/hooks/useExpenseFilters"

// Mock expenses for testing
const mockExpenses: Expense[] = [
  {
    id: "1",
    amount: 100,
    currency: "TWD",
    description: "午餐便當",
    category: "food",
    payer: { id: "user1", displayName: "Alice" },
  },
  {
    id: "2",
    amount: 500,
    currency: "TWD",
    description: "計程車",
    category: "transport",
    payer: { id: "user2", displayName: "Bob" },
  },
  {
    id: "3",
    amount: 2000,
    currency: "TWD",
    description: "飯店住宿",
    category: "accommodation",
    payer: { id: "user1", displayName: "Alice" },
  },
  {
    id: "4",
    amount: 300,
    currency: "TWD",
    description: "晚餐火鍋",
    category: "food",
    payer: { id: "user3", displayName: "Charlie" },
  },
  {
    id: "5",
    amount: 150,
    currency: "TWD",
    description: null,
    category: null,
    payer: { id: "user2", displayName: "Bob" },
  },
]

describe("useExpenseFilters", () => {
  describe("initialization", () => {
    it("should return all expenses when no filters are applied", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      expect(result.current.filteredExpenses).toHaveLength(5)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it("should initialize with default filter values", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      expect(result.current.filters.searchQuery).toBe("")
      expect(result.current.filters.selectedCategories.size).toBe(0)
      expect(result.current.filters.selectedPayers.size).toBe(0)
      expect(result.current.filters.amountRange).toEqual([0, 0])
    })

    it("should initialize with custom initial filters", () => {
      const { result } = renderHook(() =>
        useExpenseFilters(mockExpenses, {
          initialFilters: {
            searchQuery: "test",
            selectedCategories: new Set(["food"]),
          },
        })
      )

      expect(result.current.filters.searchQuery).toBe("test")
      expect(result.current.filters.selectedCategories.has("food")).toBe(true)
    })
  })

  describe("searchQuery filter", () => {
    it("should filter by description search query", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("便當")
      })

      expect(result.current.filteredExpenses).toHaveLength(1)
      expect(result.current.filteredExpenses[0].id).toBe("1")
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should be case insensitive", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("午餐")
      })

      expect(result.current.filteredExpenses).toHaveLength(1)
    })

    it("should return empty when no match", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("不存在的關鍵字")
      })

      expect(result.current.filteredExpenses).toHaveLength(0)
    })

    it("should handle expenses with null description", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("test")
      })

      // Expense with null description should not match
      expect(
        result.current.filteredExpenses.find((e) => e.id === "5")
      ).toBeUndefined()
    })
  })

  describe("category filter", () => {
    it("should filter by single category", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.toggleCategory("food")
      })

      expect(result.current.filteredExpenses).toHaveLength(2)
      expect(result.current.filteredExpenses.every((e) => e.category === "food")).toBe(true)
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should filter by multiple categories", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.toggleCategory("food")
        result.current.toggleCategory("transport")
      })

      expect(result.current.filteredExpenses).toHaveLength(3)
    })

    it("should toggle category off when called again", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.toggleCategory("food")
      })
      expect(result.current.filters.selectedCategories.has("food")).toBe(true)

      act(() => {
        result.current.toggleCategory("food")
      })
      expect(result.current.filters.selectedCategories.has("food")).toBe(false)
      expect(result.current.filteredExpenses).toHaveLength(5)
    })

    it("should set categories directly", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setCategories(new Set(["food", "transport"]))
      })

      expect(result.current.filters.selectedCategories.size).toBe(2)
      expect(result.current.filteredExpenses).toHaveLength(3)
    })

    it("should exclude expenses with null category", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.toggleCategory("food")
      })

      // Expense 5 has null category, should not be included
      expect(
        result.current.filteredExpenses.find((e) => e.id === "5")
      ).toBeUndefined()
    })
  })

  describe("payer filter", () => {
    it("should filter by single payer", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.togglePayer("user1")
      })

      expect(result.current.filteredExpenses).toHaveLength(2)
      expect(
        result.current.filteredExpenses.every((e) => e.payer.id === "user1")
      ).toBe(true)
    })

    it("should filter by multiple payers", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.togglePayer("user1")
        result.current.togglePayer("user2")
      })

      expect(result.current.filteredExpenses).toHaveLength(4)
    })

    it("should toggle payer off when called again", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.togglePayer("user1")
      })
      expect(result.current.filters.selectedPayers.has("user1")).toBe(true)

      act(() => {
        result.current.togglePayer("user1")
      })
      expect(result.current.filters.selectedPayers.has("user1")).toBe(false)
    })

    it("should set payers directly", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setPayers(new Set(["user1", "user3"]))
      })

      expect(result.current.filters.selectedPayers.size).toBe(2)
      expect(result.current.filteredExpenses).toHaveLength(3)
    })
  })

  describe("amount range filter", () => {
    it("should filter by minimum amount", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setAmountRange([500, 0])
      })

      expect(result.current.filteredExpenses).toHaveLength(2)
      expect(
        result.current.filteredExpenses.every((e) => e.amount >= 500)
      ).toBe(true)
    })

    it("should filter by maximum amount", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setAmountRange([0, 300])
      })

      expect(result.current.filteredExpenses).toHaveLength(3)
      expect(
        result.current.filteredExpenses.every((e) => e.amount <= 300)
      ).toBe(true)
    })

    it("should filter by amount range", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setAmountRange([100, 500])
      })

      // Expenses in range: 100, 500, 300, 150 = 4 items
      expect(result.current.filteredExpenses).toHaveLength(4)
      expect(
        result.current.filteredExpenses.every(
          (e) => e.amount >= 100 && e.amount <= 500
        )
      ).toBe(true)
    })

    it("should treat 0 as no limit", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setAmountRange([0, 0])
      })

      expect(result.current.filteredExpenses).toHaveLength(5)
    })
  })

  describe("combined filters", () => {
    it("should apply multiple filters together", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.toggleCategory("food")
        result.current.togglePayer("user1")
      })

      // Only food expenses paid by user1
      expect(result.current.filteredExpenses).toHaveLength(1)
      expect(result.current.filteredExpenses[0].id).toBe("1")
    })

    it("should combine search, category, and amount filters", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("餐")
        result.current.toggleCategory("food")
        result.current.setAmountRange([0, 200])
      })

      expect(result.current.filteredExpenses).toHaveLength(1)
      expect(result.current.filteredExpenses[0].id).toBe("1")
    })
  })

  describe("clearFilters", () => {
    it("should clear all filters", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("test")
        result.current.toggleCategory("food")
        result.current.togglePayer("user1")
        result.current.setAmountRange([100, 500])
      })

      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.filters.searchQuery).toBe("")
      expect(result.current.filters.selectedCategories.size).toBe(0)
      expect(result.current.filters.selectedPayers.size).toBe(0)
      expect(result.current.filters.amountRange).toEqual([0, 0])
      expect(result.current.hasActiveFilters).toBe(false)
      expect(result.current.filteredExpenses).toHaveLength(5)
    })
  })

  describe("uniquePayers", () => {
    it("should return unique payers from expenses", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      expect(result.current.uniquePayers).toHaveLength(3)
      expect(result.current.uniquePayers.map((p) => p.id).sort()).toEqual([
        "user1",
        "user2",
        "user3",
      ])
    })

    it("should update when expenses change", () => {
      const { result, rerender } = renderHook(
        ({ expenses }) => useExpenseFilters(expenses),
        { initialProps: { expenses: mockExpenses } }
      )

      expect(result.current.uniquePayers).toHaveLength(3)

      rerender({ expenses: [mockExpenses[0]] })

      expect(result.current.uniquePayers).toHaveLength(1)
      expect(result.current.uniquePayers[0].id).toBe("user1")
    })
  })

  describe("maxAmount", () => {
    it("should return maximum amount from expenses", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      expect(result.current.maxAmount).toBe(2000)
    })

    it("should return 0 for empty expenses", () => {
      const { result } = renderHook(() => useExpenseFilters([]))

      expect(result.current.maxAmount).toBe(0)
    })

    it("should update when expenses change", () => {
      const { result, rerender } = renderHook(
        ({ expenses }) => useExpenseFilters(expenses),
        { initialProps: { expenses: mockExpenses } }
      )

      expect(result.current.maxAmount).toBe(2000)

      rerender({
        expenses: [
          ...mockExpenses,
          {
            id: "6",
            amount: 5000,
            currency: "TWD",
            description: "Big expense",
            category: "other",
            payer: { id: "user1", displayName: "Alice" },
          },
        ],
      })

      expect(result.current.maxAmount).toBe(5000)
    })
  })

  describe("hasActiveFilters", () => {
    it("should be false when no filters are active", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it("should be true when search query is set", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchQuery("test")
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should be true when categories are selected", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.toggleCategory("food")
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should be true when payers are selected", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.togglePayer("user1")
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should be true when amount range has min value", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setAmountRange([100, 0])
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should be true when amount range has max value", () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setAmountRange([0, 500])
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })
  })

  describe("empty expenses", () => {
    it("should handle empty expenses array", () => {
      const { result } = renderHook(() => useExpenseFilters([]))

      expect(result.current.filteredExpenses).toHaveLength(0)
      expect(result.current.uniquePayers).toHaveLength(0)
      expect(result.current.maxAmount).toBe(0)
    })
  })
})
