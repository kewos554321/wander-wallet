// Backfill settlement-currency columns for expenses created before
// multi-currency support (docs/superpowers/specs/2026-10-08-multi-currency-expense-design.md §4.1).
//
// For every foreign-currency expense (currency != project currency) that has no
// exchangeRate yet, snapshot the current rate and write the settlement-currency
// amounts as integer minor units. Same-currency expenses stay null (regarded as
// already in the settlement currency on read).
//
// Idempotent: only rows with exchangeRate IS NULL are touched, so re-running is safe.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.53, CAD: 1.36, TWD: 31.5,
  JPY: 149.5, KRW: 1320, CNY: 7.24, HKD: 7.82, SGD: 1.34, THB: 35.8,
  VND: 24500, MYR: 4.47, PHP: 56.5, IDR: 15800, INR: 83.5, NZD: 1.64, CHF: 0.88,
}

const ZERO_DECIMAL = new Set(["TWD", "JPY", "KRW", "VND"])
const decimals = (code) => (ZERO_DECIMAL.has(code) ? 0 : 2)
const toMinor = (major, code) => Math.round(major * 10 ** decimals(code))

async function getUsdRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD")
    const data = await res.json()
    if (data.result !== "success") throw new Error(data["error-type"])
    return data.rates
  } catch (error) {
    console.warn(`Live rates unavailable (${error.message}); using fallback rates.`)
    return FALLBACK_RATES
  }
}

// floor + remainder; extras go to the lowest ledger value (ties by original order),
// and the ledger is advanced so a later edit rolls back correctly.
function allocate(totalMinor, weights, ledger) {
  const total = weights.reduce((s, w) => s + w.weight, 0)
  const eff = total === 0 ? weights.map((w) => ({ ...w, weight: 1 })) : weights
  const effTotal = total === 0 ? weights.length : total
  const alloc = new Map()
  let assigned = 0
  for (const w of eff) {
    const v = Math.floor((totalMinor * w.weight) / effTotal)
    alloc.set(w.id, v)
    assigned += v
  }
  const order = eff
    .map((w, i) => ({ id: w.id, i, d: ledger.get(w.id) ?? 0 }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
  let remainder = totalMinor - assigned
  let k = 0
  while (remainder > 0 && order.length > 0) {
    const id = order[k % order.length].id
    alloc.set(id, alloc.get(id) + 1)
    ledger.set(id, (ledger.get(id) ?? 0) + 1)
    remainder -= 1
    k += 1
  }
  return alloc
}

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, currency: true, customRates: true },
  })
  const usdRates = await getUsdRates()

  let count = 0
  for (const project of projects) {
    const projectCurrency = project.currency || "TWD"
    const customRates = project.customRates || {}
    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      select: { id: true, remainderDiscrepancy: true },
    })
    const ledger = new Map(members.map((m) => [m.id, m.remainderDiscrepancy ?? 0]))
    const ledgerInitial = new Map(ledger)

    const expenses = await prisma.expense.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
        exchangeRate: null,
        currency: { not: projectCurrency },
      },
      include: { payers: true, participants: true },
    })

    for (const expense of expenses) {
      const from = expense.currency
      const rate =
        customRates[from] ??
        (usdRates[projectCurrency] && usdRates[from]
          ? usdRates[projectCurrency] / usdRates[from]
          : null)
      if (!rate) {
        console.warn(`skip ${expense.id}: no rate ${from} -> ${projectCurrency}`)
        continue
      }

      const totalMinor = toMinor(Number(expense.amount) * rate, projectCurrency)
      const partAlloc = allocate(
        totalMinor,
        expense.participants.map((p) => ({ id: p.id, weight: Number(p.shareAmount) })),
        ledger,
      )
      const payAlloc = allocate(
        totalMinor,
        expense.payers.map((p) => ({ id: p.id, weight: Number(p.amount) })),
        ledger,
      )

      await prisma.$transaction([
        ...expense.participants.map((p) =>
          prisma.expenseParticipant.update({
            where: { id: p.id },
            data: { shareAmountProject: partAlloc.get(p.id) },
          }),
        ),
        ...expense.payers.map((p) =>
          prisma.expensePayer.update({
            where: { id: p.id },
            data: { amountProject: payAlloc.get(p.id) },
          }),
        ),
        prisma.expense.update({ where: { id: expense.id }, data: { exchangeRate: rate } }),
      ])
      count += 1
    }

    // Persist the seeded ledger so a later edit rolls back to 0, not negative.
    for (const m of members) {
      const value = ledger.get(m.id) ?? 0
      if ((ledgerInitial.get(m.id) ?? 0) !== value) {
        await prisma.projectMember.update({
          where: { id: m.id },
          data: { remainderDiscrepancy: value },
        })
      }
    }
  }

  console.log(`Backfilled ${count} expense(s).`)
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
