// Pure helpers for the v2 "全部支出" (A6) expense list screen.

import { fromMinorUnits } from "@/lib/currency-conversion"

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function monthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function groupExpensesByDay<T extends { expenseDate: string }>(
  expenses: T[],
  now: Date
): { key: string; label: string; expenses: T[] }[] {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  )
  const todayKey = localDayKey(now)
  const groups: { key: string; label: string; expenses: T[] }[] = []
  for (const expense of sorted) {
    const date = new Date(expense.expenseDate)
    const key = localDayKey(date)
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      group = { key, label: key === todayKey ? `${monthDay(date)}（今天）` : monthDay(date), expenses: [] }
      groups.push(group)
    }
    group.expenses.push(expense)
  }
  return groups
}

export function formatMonthDayTime(iso: string): string {
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${monthDay(date)} ${hh}:${mm}`
}

export function summarizeExpenses(
  expenses: { amount: number; currency: string; amountProject?: number | null }[],
  convert?: (amount: number, currency: string) => number,
  projectCurrency?: string
): { total: number; count: number; average: number } {
  const total = expenses.reduce((sum, e) => {
    if (e.amountProject != null && projectCurrency) {
      return sum + fromMinorUnits(e.amountProject, projectCurrency)
    }
    return sum + (convert ? convert(Number(e.amount), e.currency) : Number(e.amount))
  }, 0)
  const count = expenses.length
  return { total, count, average: count > 0 ? total / count : 0 }
}
