import { getCategoryLabel } from "@/lib/constants/expenses"
import type {
  ExportData,
  ExportFilterOptions,
  ExpenseExportData,
  MemberBalanceData,
  SettlementExportData,
  CategoryBreakdownData,
} from "@/lib/export/types"

export interface ExportExpenseInput {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  expenseDate: string
  payers: { memberId: string; amount: number; member: { id: string; displayName: string } }[]
  participants: { shareAmount: number; member: { id: string; displayName: string } }[]
}

export interface ExportContext {
  projectCurrency: string
  customRates: Record<string, number> | null
  exchangeRates: Record<string, number> | null
}

export interface BuildExportInput {
  projectName: string
  projectCurrency: string
  members: { id: string; displayName: string }[]
  expenses: ExportExpenseInput[]
  filters: ExportFilterOptions
  ctx: ExportContext
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Converts to the project currency the way the v1 export page did: an explicit
 * custom rate wins; with no rates at all the original amount is returned
 * unchanged (never NaN/0).
 */
export function convertToProjectCurrency(amount: number, fromCurrency: string, ctx: ExportContext): number {
  if (fromCurrency === ctx.projectCurrency) return amount
  if (ctx.customRates && ctx.customRates[fromCurrency]) {
    return round2(amount * ctx.customRates[fromCurrency])
  }
  if (!ctx.exchangeRates) return amount
  const fromRate = ctx.exchangeRates[fromCurrency] || 1
  const toRate = ctx.exchangeRates[ctx.projectCurrency] || 1
  return round2(amount * (toRate / fromRate))
}

function buildSettlements(balances: MemberBalanceData[]): SettlementExportData[] {
  const debtors = balances
    .filter((b) => b.balance < -1)
    .map((b) => ({ name: b.name, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = balances
    .filter((b) => b.balance > 1)
    .map((b) => ({ name: b.name, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: SettlementExportData[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)
    if (amount >= 1) {
      settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(amount) })
    }
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount < 1) i++
    if (creditors[j].amount < 1) j++
  }
  return settlements
}

/** Builds the `ExportData` payload from live project data (v1 export parity). */
export function buildExportData(input: BuildExportInput): ExportData {
  const { projectName, projectCurrency, members, expenses, filters, ctx } = input

  const categorySet = filters.categories && filters.categories.length ? new Set(filters.categories) : null
  const start = filters.dateRange?.start ? new Date(filters.dateRange.start).setHours(0, 0, 0, 0) : null
  const end = filters.dateRange?.end ? new Date(filters.dateRange.end).setHours(23, 59, 59, 999) : null

  const filtered = expenses.filter((expense) => {
    const time = new Date(expense.expenseDate).getTime()
    if (start !== null && time < start) return false
    if (end !== null && time > end) return false
    if (categorySet && !categorySet.has(expense.category || "other")) return false
    return true
  })

  const exportExpenses: ExpenseExportData[] = filtered.map((expense) => {
    const amount = convertToProjectCurrency(expense.amount, expense.currency, ctx)
    const ratio = expense.amount > 0 ? amount / expense.amount : 0
    return {
      id: expense.id,
      date: expense.expenseDate,
      description: expense.description || "",
      category: expense.category || "other",
      categoryLabel: getCategoryLabel(expense.category || "other"),
      amount,
      payer: expense.payers.map((p) => p.member.displayName).join("、"),
      participants: expense.participants.map((p) => p.member.displayName),
      participantShares: expense.participants.map((p) => ({
        name: p.member.displayName,
        amount: round2(p.shareAmount * ratio),
      })),
    }
  })

  const memberBalances: MemberBalanceData[] = members.map((member) => {
    let paid = 0
    let share = 0
    for (const expense of filtered) {
      const amount = convertToProjectCurrency(expense.amount, expense.currency, ctx)
      const ratio = expense.amount > 0 ? amount / expense.amount : 0
      for (const payer of expense.payers) {
        if (payer.memberId === member.id) {
          paid += convertToProjectCurrency(Number(payer.amount), expense.currency, ctx)
        }
      }
      for (const participant of expense.participants) {
        if (participant.member.id === member.id) share += participant.shareAmount * ratio
      }
    }
    paid = round2(paid)
    share = round2(share)
    return { name: member.displayName, paid, share, balance: round2(paid - share) }
  })

  const totalAmount = round2(exportExpenses.reduce((sum, e) => sum + e.amount, 0))

  const categoryMap = new Map<string, CategoryBreakdownData>()
  for (const expense of exportExpenses) {
    const entry = categoryMap.get(expense.category) ?? {
      category: expense.category,
      label: expense.categoryLabel,
      amount: 0,
      count: 0,
      percentage: 0,
    }
    entry.amount += expense.amount
    entry.count += 1
    categoryMap.set(expense.category, entry)
  }
  const categoryBreakdown = [...categoryMap.values()]
    .map((entry) => ({
      ...entry,
      amount: round2(entry.amount),
      percentage: totalAmount > 0 ? (entry.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    projectName,
    exportDate: new Date().toISOString(),
    currency: projectCurrency,
    expenses: exportExpenses,
    settlements: buildSettlements(memberBalances),
    statistics: {
      totalExpenses: exportExpenses.length,
      totalAmount,
      perPerson: members.length > 0 ? round2(totalAmount / members.length) : 0,
      memberCount: members.length,
      categoryBreakdown,
      memberBreakdown: memberBalances,
    },
  }
}
