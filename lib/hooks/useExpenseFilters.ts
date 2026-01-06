import { useMemo, useState, useCallback } from "react"
import type { DateRange } from "react-day-picker"

/** 參與者介面 */
export interface ExpenseParticipant {
  id: string
  member: {
    id: string
    displayName: string
  }
}

/** 基本 Expense 介面，包含篩選所需的必要欄位 */
export interface Expense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  expenseDate: string
  createdAt: string
  payer: {
    id: string
    displayName: string
  }
  participants: ExpenseParticipant[]
}

export interface ExpenseFilters {
  searchQuery: string
  selectedCategories: Set<string>
  selectedPayers: Set<string>
  selectedParticipants: Set<string>
  selectedCurrencies: Set<string>
  amountRange: [number, number] // [min, max], 0 表示不限制
  createdDateRange: DateRange | undefined // 建立日期範圍
  expenseDateRange: DateRange | undefined // 支出日期範圍
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
  /** 切換參與者篩選 */
  toggleParticipant: (memberId: string) => void
  /** 設定參與者篩選 */
  setParticipants: (participants: Set<string>) => void
  /** 切換幣別篩選 */
  toggleCurrency: (currency: string) => void
  /** 設定幣別篩選 */
  setCurrencies: (currencies: Set<string>) => void
  /** 設定金額範圍 */
  setAmountRange: (range: [number, number]) => void
  /** 設定建立日期範圍 */
  setCreatedDateRange: (range: DateRange | undefined) => void
  /** 設定支出日期範圍 */
  setExpenseDateRange: (range: DateRange | undefined) => void
  /** 清除所有篩選 */
  clearFilters: () => void
  /** 唯一的付款者列表 */
  uniquePayers: Array<{ id: string; displayName: string }>
  /** 唯一的參與者列表 */
  uniqueParticipants: Array<{ id: string; displayName: string }>
  /** 唯一的幣別列表 */
  uniqueCurrencies: string[]
  /** 最大金額（用於 range slider） */
  maxAmount: number
}

const DEFAULT_FILTERS: ExpenseFilters = {
  searchQuery: "",
  selectedCategories: new Set(),
  selectedPayers: new Set(),
  selectedParticipants: new Set(),
  selectedCurrencies: new Set(),
  amountRange: [0, 0],
  createdDateRange: undefined,
  expenseDateRange: undefined,
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
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    initialFilters?.selectedParticipants || new Set()
  )
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(
    initialFilters?.selectedCurrencies || new Set()
  )
  const [amountRange, setAmountRange] = useState<[number, number]>(
    initialFilters?.amountRange || [0, 0]
  )
  const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>(
    initialFilters?.createdDateRange
  )
  const [expenseDateRange, setExpenseDateRange] = useState<DateRange | undefined>(
    initialFilters?.expenseDateRange
  )

  // 唯一付款者列表
  const uniquePayers = useMemo(() => {
    return Array.from(
      new Map(expenses.map((e) => [e.payer.id, e.payer])).values()
    )
  }, [expenses])

  // 唯一參與者列表（從所有消費的 participants 中提取）
  const uniqueParticipants = useMemo(() => {
    const participantMap = new Map<string, { id: string; displayName: string }>()
    expenses.forEach((expense) => {
      expense.participants.forEach((p) => {
        if (!participantMap.has(p.member.id)) {
          participantMap.set(p.member.id, {
            id: p.member.id,
            displayName: p.member.displayName,
          })
        }
      })
    })
    return Array.from(participantMap.values())
  }, [expenses])

  // 唯一幣別列表
  const uniqueCurrencies = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.currency)))
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

      // 參與者篩選（消費的任一參與者符合即可）
      const matchesParticipant =
        selectedParticipants.size === 0 ||
        expense.participants.some((p) => selectedParticipants.has(p.member.id))

      // 幣別篩選
      const matchesCurrency =
        selectedCurrencies.size === 0 || selectedCurrencies.has(expense.currency)

      // 金額範圍篩選
      const expenseAmount = Number(expense.amount)
      const [minVal, maxVal] = amountRange
      const matchesMinAmount = minVal === 0 || expenseAmount >= minVal
      const matchesMaxAmount = maxVal === 0 || expenseAmount <= maxVal

      // 建立日期篩選
      let matchesCreatedDate = true
      if (createdDateRange?.from || createdDateRange?.to) {
        const createdDate = new Date(expense.createdAt)
        if (createdDateRange.from && createdDate < createdDateRange.from) matchesCreatedDate = false
        if (createdDateRange.to) {
          const endOfDay = new Date(createdDateRange.to)
          endOfDay.setHours(23, 59, 59, 999)
          if (createdDate > endOfDay) matchesCreatedDate = false
        }
      }

      // 支出日期篩選
      let matchesExpenseDate = true
      if (expenseDateRange?.from || expenseDateRange?.to) {
        const expDate = new Date(expense.expenseDate)
        if (expenseDateRange.from && expDate < expenseDateRange.from) matchesExpenseDate = false
        if (expenseDateRange.to) {
          const endOfDay = new Date(expenseDateRange.to)
          endOfDay.setHours(23, 59, 59, 999)
          if (expDate > endOfDay) matchesExpenseDate = false
        }
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPayer &&
        matchesParticipant &&
        matchesCurrency &&
        matchesMinAmount &&
        matchesMaxAmount &&
        matchesCreatedDate &&
        matchesExpenseDate
      )
    })
  }, [expenses, searchQuery, selectedCategories, selectedPayers, selectedParticipants, selectedCurrencies, amountRange, createdDateRange, expenseDateRange])

  // 是否有啟用篩選
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== "" ||
      selectedCategories.size > 0 ||
      selectedPayers.size > 0 ||
      selectedParticipants.size > 0 ||
      selectedCurrencies.size > 0 ||
      amountRange[0] > 0 ||
      amountRange[1] > 0 ||
      createdDateRange?.from !== undefined ||
      expenseDateRange?.from !== undefined
    )
  }, [searchQuery, selectedCategories, selectedPayers, selectedParticipants, selectedCurrencies, amountRange, createdDateRange, expenseDateRange])

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

  // 切換參與者
  const toggleParticipant = useCallback((memberId: string) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }, [])

  // 切換幣別
  const toggleCurrency = useCallback((currency: string) => {
    setSelectedCurrencies((prev) => {
      const next = new Set(prev)
      if (next.has(currency)) {
        next.delete(currency)
      } else {
        next.add(currency)
      }
      return next
    })
  }, [])

  // 清除所有篩選
  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedCategories(new Set())
    setSelectedPayers(new Set())
    setSelectedParticipants(new Set())
    setSelectedCurrencies(new Set())
    setAmountRange([0, 0])
    setCreatedDateRange(undefined)
    setExpenseDateRange(undefined)
  }, [])

  // 組合 filters 物件
  const filters: ExpenseFilters = useMemo(
    () => ({
      searchQuery,
      selectedCategories,
      selectedPayers,
      selectedParticipants,
      selectedCurrencies,
      amountRange,
      createdDateRange,
      expenseDateRange,
    }),
    [searchQuery, selectedCategories, selectedPayers, selectedParticipants, selectedCurrencies, amountRange, createdDateRange, expenseDateRange]
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
    toggleParticipant,
    setParticipants: setSelectedParticipants,
    toggleCurrency,
    setCurrencies: setSelectedCurrencies,
    setAmountRange,
    setCreatedDateRange,
    setExpenseDateRange,
    clearFilters,
    uniquePayers,
    uniqueParticipants,
    uniqueCurrencies,
    maxAmount,
  }
}
