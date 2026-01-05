import { useMemo, useState, useCallback } from "react"

/** 基本 Expense 介面，包含篩選所需的必要欄位 */
export interface Expense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  payer: {
    id: string
    displayName: string
  }
}

export interface ExpenseFilters {
  searchQuery: string
  selectedCategories: Set<string>
  selectedPayers: Set<string>
  amountRange: [number, number] // [min, max], 0 表示不限制
}

interface UseExpenseFiltersOptions {
  /** 初始篩選條件 */
  initialFilters?: Partial<ExpenseFilters>
}

interface UseExpenseFiltersReturn<T extends Expense> {
  /** 目前的篩選條件 */
  filters: ExpenseFilters
  /** 篩選後的消費清單 */
  filteredExpenses: T[]
  /** 是否有啟用任何篩選 */
  hasActiveFilters: boolean
  /** 更新搜尋關鍵字 */
  setSearchQuery: (query: string) => void
  /** 切換分類篩選 */
  toggleCategory: (category: string) => void
  /** 設定分類篩選 */
  setCategories: (categories: Set<string>) => void
  /** 切換付款者篩選 */
  togglePayer: (payerId: string) => void
  /** 設定付款者篩選 */
  setPayers: (payers: Set<string>) => void
  /** 設定金額範圍 */
  setAmountRange: (range: [number, number]) => void
  /** 清除所有篩選 */
  clearFilters: () => void
  /** 唯一的付款者列表 */
  uniquePayers: Array<{ id: string; displayName: string }>
  /** 最大金額（用於 range slider） */
  maxAmount: number
}

const DEFAULT_FILTERS: ExpenseFilters = {
  searchQuery: "",
  selectedCategories: new Set(),
  selectedPayers: new Set(),
  amountRange: [0, 0],
}

/**
 * 消費篩選 Hook
 * 提供搜尋、分類、付款者、金額範圍等多維度篩選
 */
export function useExpenseFilters<T extends Expense>(
  expenses: T[],
  options: UseExpenseFiltersOptions = {}
): UseExpenseFiltersReturn<T> {
  const { initialFilters } = options

  // 篩選狀態
  const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || "")
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    initialFilters?.selectedCategories || new Set()
  )
  const [selectedPayers, setSelectedPayers] = useState<Set<string>>(
    initialFilters?.selectedPayers || new Set()
  )
  const [amountRange, setAmountRange] = useState<[number, number]>(
    initialFilters?.amountRange || [0, 0]
  )

  // 唯一付款者列表
  const uniquePayers = useMemo(() => {
    return Array.from(
      new Map(expenses.map((e) => [e.payer.id, e.payer])).values()
    )
  }, [expenses])

  // 最大金額
  const maxAmount = useMemo(() => {
    return Math.max(...expenses.map((e) => Number(e.amount)), 0)
  }, [expenses])

  // 篩選消費
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // 搜尋篩選
      const matchesSearch =
        searchQuery === "" ||
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase())

      // 分類篩選
      const matchesCategory =
        selectedCategories.size === 0 ||
        (expense.category && selectedCategories.has(expense.category))

      // 付款者篩選
      const matchesPayer =
        selectedPayers.size === 0 || selectedPayers.has(expense.payer.id)

      // 金額範圍篩選
      const expenseAmount = Number(expense.amount)
      const [minVal, maxVal] = amountRange
      const matchesMinAmount = minVal === 0 || expenseAmount >= minVal
      const matchesMaxAmount = maxVal === 0 || expenseAmount <= maxVal

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPayer &&
        matchesMinAmount &&
        matchesMaxAmount
      )
    })
  }, [expenses, searchQuery, selectedCategories, selectedPayers, amountRange])

  // 是否有啟用篩選
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== "" ||
      selectedCategories.size > 0 ||
      selectedPayers.size > 0 ||
      amountRange[0] > 0 ||
      amountRange[1] > 0
    )
  }, [searchQuery, selectedCategories, selectedPayers, amountRange])

  // 切換分類
  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // 切換付款者
  const togglePayer = useCallback((payerId: string) => {
    setSelectedPayers((prev) => {
      const next = new Set(prev)
      if (next.has(payerId)) {
        next.delete(payerId)
      } else {
        next.add(payerId)
      }
      return next
    })
  }, [])

  // 清除所有篩選
  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedCategories(new Set())
    setSelectedPayers(new Set())
    setAmountRange([0, 0])
  }, [])

  // 組合 filters 物件
  const filters: ExpenseFilters = useMemo(
    () => ({
      searchQuery,
      selectedCategories,
      selectedPayers,
      amountRange,
    }),
    [searchQuery, selectedCategories, selectedPayers, amountRange]
  )

  return {
    filters,
    filteredExpenses,
    hasActiveFilters,
    setSearchQuery,
    toggleCategory,
    setCategories: setSelectedCategories,
    togglePayer,
    setPayers: setSelectedPayers,
    setAmountRange,
    clearFilters,
    uniquePayers,
    maxAmount,
  }
}
