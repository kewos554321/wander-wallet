// lib/project-stats.ts
import { fromMinorUnits } from "@/lib/currency-conversion"

export interface StatsInput {
  members: { id: string; displayName: string }[]
  expenses: {
    amount: number
    currency: string
    amountProject?: number | null
    category: string | null
    expenseDate?: string
    createdAt: string
    payers: { memberId: string; amount: number; amountProject?: number | null }[]
    participants: { memberId: string; shareAmount: number; shareAmountProject?: number | null }[]
  }[]
}

export interface CategoryStat {
  category: string
  amount: number
  percent: number
}

export interface MemberStat {
  id: string
  name: string
  paid: number
  share: number
  balance: number
}

export interface DailyStat {
  date: string
  amount: number
}

const DAILY_LIMIT = 7

export function computeProjectStats(
  input: StatsInput,
  convert: (amount: number, currency: string) => number,
  projectCurrency?: string
): { categories: CategoryStat[]; members: MemberStat[]; daily: DailyStat[]; total: number } {
  const projectAmount = (projectMinor: number | null | undefined, amount: number, currency: string) =>
    projectMinor != null && projectCurrency ? fromMinorUnits(projectMinor, projectCurrency) : convert(amount, currency)

  const categoryTotals = new Map<string, number>()
  const dailyTotals = new Map<string, { amount: number; dayStart: number; label: string }>()
  const paid = new Map<string, number>()
  const share = new Map<string, number>()
  let total = 0

  for (const expense of input.expenses) {
    const amount = Number(expense.amount)
    const converted = projectAmount(expense.amountProject, amount, expense.currency)
    total += converted

    const category = expense.category || "other"
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + converted)

    const date = new Date(expense.expenseDate ?? expense.createdAt)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const key = String(dayStart)
    const daily = dailyTotals.get(key)
    dailyTotals.set(key, {
      amount: (daily?.amount ?? 0) + converted,
      dayStart,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    })

    for (const payer of expense.payers) {
      paid.set(
        payer.memberId,
        (paid.get(payer.memberId) ?? 0) + projectAmount(payer.amountProject, Number(payer.amount), expense.currency),
      )
    }
    for (const p of expense.participants) {
      const shareValue =
        p.shareAmountProject != null && projectCurrency
          ? fromMinorUnits(p.shareAmountProject, projectCurrency)
          : amount !== 0
            ? converted * (Number(p.shareAmount) / amount)
            : 0
      share.set(p.memberId, (share.get(p.memberId) ?? 0) + shareValue)
    }
  }

  const categories = Array.from(categoryTotals.entries())
    .map(([category, value]) => ({ category, amount: value, percent: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)

  const members = input.members.map((m) => {
    const p = paid.get(m.id) ?? 0
    const s = share.get(m.id) ?? 0
    return { id: m.id, name: m.displayName, paid: p, share: s, balance: p - s }
  })

  const daily = Array.from(dailyTotals.values())
    .sort((a, b) => a.dayStart - b.dayStart)
    .slice(-DAILY_LIMIT)
    .map(({ label, amount }) => ({ date: label, amount }))

  return { categories, members, daily, total }
}
