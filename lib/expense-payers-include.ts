// Server-only Prisma include/select helpers for multi-payer expenses.
// Kept separate from lib/expense-payers.ts, which stays pure (no Prisma).

export const expensePayersInclude = {
  include: {
    member: {
      select: {
        id: true,
        displayName: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    },
  },
}
