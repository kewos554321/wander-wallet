// Backfill ExpensePayer rows for expenses created before multi-payer support.
//
// Every expense must have at least one payer row (see
// docs/superpowers/specs/2026-10-06-multi-payer-expenses-design.md §4).
// For legacy expenses we create a single row using the existing
// `paid_by_member_id` and the full expense amount.
//
// Idempotent: only expenses with no payer rows are touched, so it is safe to
// re-run.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const expenses = await prisma.expense.findMany({
    where: { payers: { none: {} } },
    select: { id: true, paidByMemberId: true, amount: true },
  })

  console.log(`Found ${expenses.length} expense(s) without payer rows.`)

  let created = 0
  for (const expense of expenses) {
    await prisma.expensePayer.create({
      data: {
        expenseId: expense.id,
        memberId: expense.paidByMemberId,
        amount: expense.amount,
      },
    })
    created += 1
  }

  console.log(`Backfilled ${created} payer row(s).`)
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
