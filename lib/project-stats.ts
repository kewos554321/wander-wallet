// lib/project-stats.ts
export interface StatsInput {
  members: { id: string; displayName: string }[]
  expenses: {
    amount: number
    currency: string
    category: string | null
    expenseDate?: string
    createdAt: string
    payer: { id: string }
    participants: { memberId: string; shareAmount: number }[]
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
  convert: (amount: number, currency: string) => number
): { categories: CategoryStat[]; members: MemberStat[]; daily: DailyStat[]; total: number } {
  const categoryTotals = new Map<string, number>()
  const dailyTotals = new Map<string, { amount: number; dayStart: number; label: string }>()
  const paid = new Map<string, number>()
  const share = new Map<string, number>()
  let total = 0

  for (const expense of input.expenses) {
    const amount = Number(expense.amount)
    const converted = convert(amount, expense.currency)
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

    paid.set(expense.payer.id, (paid.get(expense.payer.id) ?? 0) + converted)
    if (amount !== 0) {
      for (const p of expense.participants) {
        share.set(p.memberId, (share.get(p.memberId) ?? 0) + converted * (Number(p.shareAmount) / amount))
      }
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
