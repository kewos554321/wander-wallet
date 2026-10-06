// Pure trip-overview calculations shared by v1 and v2 project screens.
// Extracted from the `userBalance` useMemo and the total/perPerson/budget
// computations in app/projects/[id]/page.tsx so both UIs use one implementation.

export interface OverviewMember {
  id: string
  role: string
  displayName: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface OverviewParticipant {
  id: string
  memberId: string
  shareAmount: number
}

export interface OverviewExpense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  createdAt: string
  expenseDate?: string
  payers: {
    memberId: string
    amount: number
  }[]
  participants: OverviewParticipant[]
}

export interface OverviewProject {
  id: string
  name: string
  description: string | null
  cover?: string | null
  budget: string | null
  currency: string
  exchangeRatePrecision: number
  startDate: string | null
  endDate: string | null
  customRates: Record<string, number> | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: OverviewMember[]
  expenses: OverviewExpense[]
}

export interface ProjectSummary {
  totalAmount: number
  perPerson: number
  budget: number | null
  budgetProgress: number
  budgetRemaining: number | null
  userBalance: number
  hasMixedCurrencies: boolean
  currentMemberId: string | null
}

type Convert = (amount: number, currency: string) => number

export function computeProjectSummary(
  project: OverviewProject,
  convert: Convert,
  currentUserId: string | null
): ProjectSummary {
  const totalAmount = project.expenses.reduce((sum, e) => sum + convert(Number(e.amount), e.currency), 0)
  const perPerson = project.members.length > 0 ? totalAmount / project.members.length : 0
  const budget = project.budget ? Number(project.budget) : null
  const budgetProgress = budget ? Math.min((totalAmount / budget) * 100, 100) : 0
  const budgetRemaining = budget ? budget - totalAmount : null

  const membership = currentUserId ? project.members.find((m) => m.user?.id === currentUserId) : undefined

  // Balance = what the user paid - what the user owes, in project currency.
  let userBalance = 0
  if (membership) {
    let paid = 0
    let owed = 0
    for (const expense of project.expenses) {
      const amount = Number(expense.amount)
      const converted = convert(amount, expense.currency)
      for (const payer of expense.payers) {
        if (payer.memberId === membership.id) paid += convert(Number(payer.amount), expense.currency)
      }
      const participant = expense.participants.find((p) => p.memberId === membership.id)
      if (participant && amount !== 0) {
        owed += converted * (Number(participant.shareAmount) / amount)
      }
    }
    userBalance = paid - owed
  }

  return {
    totalAmount,
    perPerson,
    budget,
    budgetProgress,
    budgetRemaining,
    userBalance: Number.isFinite(userBalance) ? userBalance : 0,
    hasMixedCurrencies: new Set(project.expenses.map((e) => e.currency)).size > 1,
    currentMemberId: membership?.id ?? null,
  }
}

export interface JoinInfo {
  name: string
  description: string | null
  joinMode: string
  unclaimedMembers: { id: string; displayName: string }[]
}

export function getRecentExpenses(expenses: OverviewExpense[], limit = 5): OverviewExpense[] {
  return [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
