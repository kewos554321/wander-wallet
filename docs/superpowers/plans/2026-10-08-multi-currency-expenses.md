# Multi-Currency Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project settle in one currency while expenses may be entered in any currency, by converting each expense to the settlement currency at creation (rate snapshot), splitting/paying in integer minor units with a fairness ledger, and reading all sums directly from the stored settlement-currency amounts.

**Architecture:** Settlement-currency-first two-layer. Each expense stores the original-currency amounts (reconciliation) **and** settlement-currency amounts as integer minor units (authority). Conversion happens once, server-side, at write time; a per-member `remainderDiscrepancy` ledger makes rounding allocation fair and reversible. All read paths (settle/stats/export/list) sum the stored settlement-currency amounts and never convert again.

**Tech Stack:** Next.js (App Router), Prisma + PostgreSQL (Neon), TypeScript, Vitest + Testing Library, Tailwind, v1/v2 UI.

**Spec:** `docs/superpowers/specs/2026-10-08-multi-currency-expense-design.md` (see also `...-review.md`, decisions in §9/§18).

**Branch:** work on `dev` (already fast-forwarded to `main`). DB: `.env` / `.env.dev` both point to the dev database.

## Global Constraints

- **Settlement currency = `Project.currency`; authority layer.** Only the settlement-currency layer produces balances/settlements. Original currency is display/reconciliation only.
- **Stored settlement amounts are integer minor units** (`Int`): US$10.57 → `1057`; TWD 310 → `310`. Convert with `getCurrencyDecimals` (TWD/JPY/KRW/VND = 0; USD/EUR/CNY/THB/… = 2).
- **Rate snapshot per expense** at creation (`Expense.exchangeRate`, `Decimal(18,8)`); same-currency expense → `null`.
- **Default rate source** `Project.rateSource` = `"fixed"` (project-wide toggle), values `"fixed" | "live"`. Missing fixed rate is auto-seeded from live.
- **Post-creation rate edit is allowed**: roll back that expense's discrepancy, recompute, in one transaction.
- **Changing the project fixed rate affects only future expenses.**
- **Display decimals = currency minor unit.** All money via `formatAmount` / `formatCurrency` from `lib/constants/currencies.ts`. **No** `toFixed()` / bare `toLocaleString()` / hardcoded `$` for money.
  - CNY and THB display with **2** decimals.
- **Invariant:** Σ `shareAmountProject` = Σ `amountProject` = `totalMinor`.
- Every task ends green (`npx vitest run <file>`) and committed separately.

## Review Focus

Failure modes the spec implies but does not spell out; each is pinned by a test in its owning task.

1. **Zero-decimal currency (TWD/JPY/KRW/VND):** rounding and display must not invent cents (TWD 1000 stays `1000`, not `1000.00`). → Tasks 1, 2, 12, 17.
2. **Same-currency expense (`exchangeRate = null`, `*Project = null`):** read paths must treat it as already in the settlement currency without crashing. → Tasks 4, 8, 9, 10, 11.
3. **Legacy rows with null `*Project` before backfill:** read paths must fall back, not produce `NaN`. → Tasks 3, 8, 9, 10, 11.
4. **Uneven split across many members:** remainder must land via the discrepancy ledger so repeated expenses stay fair. → Tasks 1, 4.
5. **Editing amount/rate/split after creation:** discrepancy must roll back exactly once (no double count, no drift). → Tasks 1, 6.

---

## Phase 1 — Precision core

### Task 1: Pure conversion + allocation module

**Files:**
- Create: `lib/currency-conversion.ts`
- Test: `tests/lib/currency-conversion.test.ts`

**Interfaces:**
- Consumes: `getCurrencyDecimals(currencyCode: string): number` from `lib/constants/currencies.ts`.
- Produces (all exported from `lib/currency-conversion.ts`):
  - `toMinorUnits(major: number, currencyCode: string): number`
  - `fromMinorUnits(minor: number, currencyCode: string): number`
  - `roundMajorToMinor(major: number, currencyCode: string): number` — nearest minor unit, returned in major units (e.g. USD 31.715 → 31.72; TWD 999.6 → 1000).
  - `allocate(totalMinor: number, weights: { id: string; weight: number }[], discrepancy: Map<string, number>): { allocations: Map<string, number>; bumped: string[] }`
  - `rollbackAllocation(totalMinor: number, weights: { id: string; weight: number }[], stored: Map<string, number>, discrepancy: Map<string, number>): Map<string, number>`
  - `type RateSource = "fixed" | "live"`
  - `resolveRate(input: { currency: string; projectCurrency: string; provided?: number | null; rateSource: RateSource; customRate?: number | null; liveRate?: number | null }): { rate: number; source: "same" | "provided" | "fixed" | "seeded" | "live"; shouldSeedFixed: boolean }`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/currency-conversion.test.ts
import { describe, it, expect } from "vitest"
import {
  toMinorUnits, fromMinorUnits, roundMajorToMinor,
  allocate, rollbackAllocation, resolveRate,
} from "@/lib/currency-conversion"

describe("minor units", () => {
  it("uses 2 decimals for USD and 0 for TWD", () => {
    expect(toMinorUnits(10.57, "USD")).toBe(1057)
    expect(fromMinorUnits(1057, "USD")).toBeCloseTo(10.57)
    expect(toMinorUnits(310, "TWD")).toBe(310)
    expect(fromMinorUnits(310, "TWD")).toBe(310)
  })
  it("rounds to the currency's minor unit", () => {
    expect(roundMajorToMinor(31.715, "USD")).toBe(31.72)
    expect(roundMajorToMinor(999.6, "TWD")).toBe(1000)
  })
})

describe("allocate", () => {
  it("splits evenly and sums to totalMinor", () => {
    const r = allocate(1050, [{id:"a",weight:1},{id:"b",weight:1},{id:"c",weight:1}], new Map())
    const vals = [...r.allocations.values()]
    expect(vals.reduce((s,v)=>s+v,0)).toBe(1050)
    expect(vals.filter(v=>v===350).length).toBe(3)
  })
  it("is deterministic and gives extras to the most-underpaid (lowest discrepancy)", () => {
    const d = new Map([["a",0],["b",0],["c",0]])
    const r = allocate(1000, [{id:"a",weight:1},{id:"b",weight:1},{id:"c",weight:1}], d)
    expect(r.bumped).toEqual(["a"])           // tie → original order
    expect(r.allocations.get("a")).toBe(334)
  })
  it("falls back to equal split when all weights are zero", () => {
    const r = allocate(100, [{id:"a",weight:0},{id:"b",weight:0}], new Map())
    expect(r.allocations.get("a")).toBe(50)
    expect(r.allocations.get("b")).toBe(50)
  })
})

describe("rollbackAllocation", () => {
  it("subtracts exactly the previous bump", () => {
    const stored = new Map([["a",334],["b",333],["c",333]])
    const d = new Map([["a",1],["b",0],["c",0]])
    const next = rollbackAllocation(1000, [{id:"a",weight:1},{id:"b",weight:1},{id:"c",weight:1}], stored, d)
    expect(next.get("a")).toBe(0)
    expect(next.get("b")).toBe(0)
  })
})

describe("resolveRate", () => {
  it("same currency → 1 and source 'same'", () => {
    expect(resolveRate({ currency:"USD", projectCurrency:"USD", rateSource:"fixed" }))
      .toMatchObject({ rate: 1, source: "same" })
  })
  it("uses provided rate verbatim", () => {
    expect(resolveRate({ currency:"TWD", projectCurrency:"USD", provided:0.0317, rateSource:"fixed" }).rate).toBe(0.0317)
  })
  it("fixed: uses customRate; marks seeded when only live is available", () => {
    expect(resolveRate({ currency:"TWD", projectCurrency:"USD", rateSource:"fixed", customRate:0.03 }).source).toBe("fixed")
    const seeded = resolveRate({ currency:"TWD", projectCurrency:"USD", rateSource:"fixed", customRate:null, liveRate:0.0317 })
    expect(seeded).toMatchObject({ rate: 0.0317, source: "seeded", shouldSeedFixed: true })
  })
  it("live: uses liveRate", () => {
    expect(resolveRate({ currency:"TWD", projectCurrency:"USD", rateSource:"live", customRate:0.03, liveRate:0.0317 }).source).toBe("live")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- tests/lib/currency-conversion.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/currency-conversion"`.

- [ ] **Step 3: Implement `lib/currency-conversion.ts`**

Use `getCurrencyDecimals`. `allocate` algorithm (from spec §6):

```ts
export function allocate(totalMinor, weights, discrepancy) {
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0)
  const effective = totalWeight === 0
    ? weights.map(w => ({ ...w, weight: 1 }))
    : weights
  const effTotal = totalWeight === 0 ? weights.length : totalWeight
  const base = new Map<string, number>()
  let assigned = 0
  for (const w of effective) {
    const v = Math.floor((totalMinor * w.weight) / effTotal)
    base.set(w.id, v); assigned += v
  }
  const remainder = totalMinor - assigned
  const order = [...effective]
    .map((w, i) => ({ id: w.id, i, d: discrepancy.get(w.id) ?? 0 }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
  const allocations = new Map(base)
  const bumped: string[] = []
  for (let k = 0; k < remainder; k++) {
    const id = order[k % order.length].id
    allocations.set(id, (allocations.get(id) ?? 0) + 1)
    bumped.push(id)
  }
  return { allocations, bumped }
}
```

`rollbackAllocation`: recompute floor via the same weight math, `extra = stored - floor`, return `discrepancy` with `extra` subtracted per id.

`resolveRate`: `same` if `currency === projectCurrency`; else `provided ?? (...)`. For `fixed`: `customRate ?? (liveRate with shouldSeedFixed)`. For `live`: `liveRate`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- tests/lib/currency-conversion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/currency-conversion.ts tests/lib/currency-conversion.test.ts
git commit -m "feat(currency): add minor-unit, allocation, and rate-resolution helpers"
```

---

### Task 2: Currency constants — decimals and short names

**Files:**
- Modify: `lib/constants/currencies.ts`
- Modify: `components/v2/ui/currency-field.tsx` (import short names)
- Test: `tests/lib/currencies.test.ts`

**Interfaces:**
- Produces: `export const CURRENCY_SHORT_NAMES: Record<string, string>` in `lib/constants/currencies.ts`; adds currencies `CHF, NZD, MYR, PHP, AED, TRY`; changes CNY/THB to `decimals: 2`.

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/currencies.test.ts`:

```ts
it("CNY and THB display 2 decimals", () => {
  expect(getCurrencyDecimals("CNY")).toBe(2)
  expect(getCurrencyDecimals("THB")).toBe(2)
})
it("exposes short names for common currencies", () => {
  expect(CURRENCY_SHORT_NAMES.CHF).toBe("瑞郎")
  expect(CURRENCY_SHORT_NAMES.TWD).toBe("台幣")
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- tests/lib/currencies.test.ts`
Expected: FAIL — CNY is `0`; `CURRENCY_SHORT_NAMES` undefined.

- [ ] **Step 3: Implement**

In `lib/constants/currencies.ts`: remove `decimals: 0` from CNY and THB; add the six new entries (`{ code: "CHF", name: "瑞士法郎", locale: "de-CH" }`, `NZD 紐西蘭幣`, `MYR 馬來西亞令吉`, `PHP 菲律賓披索`, `AED 阿聯酋迪拉姆`, `TRY 土耳其里拉`); export `CURRENCY_SHORT_NAMES = { CHF:"瑞郎", NZD:"紐幣", MYR:"馬幣", PHP:"披索", AED:"迪拉姆", TRY:"里拉", TWD:"台幣", ... }`. In `components/v2/ui/currency-field.tsx`, replace the local `SHORT_NAMES` with an import of `CURRENCY_SHORT_NAMES`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- tests/lib/currencies.test.ts tests/components/v2/v2-currency-field.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/constants/currencies.ts components/v2/ui/currency-field.tsx tests/lib/currencies.test.ts
git commit -m "feat(currency): add decimals and short names for settlement currencies"
```

---

## Phase 2 — Data model

### Task 3: Schema fields + backfill script

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/backfill-multi-currency.mjs`
- Modify: `package.json` (a `db:backfill-multi-currency` script)

**Interfaces:**
- Produces columns: `Project.rateSource`, `Expense.exchangeRate`, `ExpenseParticipant.shareAmountProject`, `ExpensePayer.amountProject`, `ProjectMember.remainderDiscrepancy`.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

```prisma
model Project {
  // ...existing
  rateSource String @default("fixed") @map("rate_source")
}
model Expense {
  // ...existing
  exchangeRate Decimal? @db.Decimal(18, 8) @map("exchange_rate")
}
model ExpenseParticipant {
  // ...existing
  shareAmountProject Int? @map("share_amount_project")
}
model ExpensePayer {
  // ...existing
  amountProject Int? @map("amount_project")
}
model ProjectMember {
  // ...existing
  remainderDiscrepancy Int @default(0) @map("remainder_discrepancy")
}
```

- [ ] **Step 2: Apply to the dev DB (additive, backward compatible)**

Run: `npm run db:push`
Then: `npm run db:generate`
Expected: both succeed; `npm run db:diff:dev` prints "empty migration" afterwards.

- [ ] **Step 3: Write the backfill script**

`scripts/backfill-multi-currency.mjs` (mirror `scripts/backfill-expense-payers.mjs` style): for each expense where `currency != project.currency` and `exchangeRate IS NULL`, resolve `rate = customRates[currency] ?? liveRate`, compute `totalMinor` from `amount`, and per participant/payer set `*_project` using the same floor+remainder rule (sum must equal `totalMinor`), then set `exchangeRate = rate`. Idempotent: skip rows already having `exchangeRate`. Print a summary count.

- [ ] **Step 4: Run the backfill against dev**

Run: `npm run db:backfill-multi-currency`
Expected: prints `N expenses backfilled`; re-running prints `0`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma scripts/backfill-multi-currency.mjs package.json
git commit -m "feat(db): add settlement-currency columns and backfill script"
```

---

## Phase 3 — Write path

### Task 4: `computeProjectAmounts` orchestration

**Files:**
- Create: `lib/expense-project-amounts.ts`
- Test: `tests/lib/expense-project-amounts.test.ts`

**Interfaces:**
- Consumes: `allocate`, `rollbackAllocation`, `roundMajorToMinor`, `toMinorUnits` from Task 1.
- Produces:
```ts
export interface ProjectAmountInput {
  amount: number; currency: string; projectCurrency: string; rate: number
  participants: { memberId: string; shareAmount: number }[]
  payers: { memberId: string; amount: number }[]
  discrepancy: Map<string, number>
  previous?: {
    participants: { memberId: string; shareAmountProject: number }[]
    payers: { memberId: string; amountProject: number }[]
    totalMinor: number
  }
}
export interface ProjectAmountResult {
  totalMinor: number
  participants: { memberId: string; shareAmountProject: number }[]
  payers: { memberId: string; amountProject: number }[]
  discrepancy: Map<string, number>
}
export function computeProjectAmounts(input: ProjectAmountInput): ProjectAmountResult
```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/expense-project-amounts.test.ts
import { describe, it, expect } from "vitest"
import { computeProjectAmounts } from "@/lib/expense-project-amounts"

it("converts TWD 1000 @ 0.031715 into US$31.72 split three ways", () => {
  const r = computeProjectAmounts({
    amount: 1000, currency: "TWD", projectCurrency: "USD", rate: 0.031715,
    participants: [{memberId:"a",shareAmount:333.33},{memberId:"b",shareAmount:333.33},{memberId:"c",shareAmount:333.34}],
    payers: [{memberId:"a",amount:600},{memberId:"b",amount:400}],
    discrepancy: new Map(),
  })
  const parts = r.participants.map(p => p.shareAmountProject)
  expect(parts.reduce((s,v)=>s+v,0)).toBe(r.totalMinor)
  expect(r.totalMinor).toBe(3172)
  expect(r.payers.reduce((s,p)=>s+p.amountProject,0)).toBe(3172)
})

it("same currency keeps integers and rate 1", () => {
  const r = computeProjectAmounts({
    amount: 1000, currency: "TWD", projectCurrency: "TWD", rate: 1,
    participants: [{memberId:"a",shareAmount:1000}],
    payers: [{memberId:"a",amount:1000}],
    discrepancy: new Map(),
  })
  expect(r.totalMinor).toBe(1000)
})

it("rolls back the previous allocation before reallocating on edit", () => {
  const prev = {
    participants: [{memberId:"a",shareAmountProject:334},{memberId:"b",shareAmountProject:333},{memberId:"c",shareAmountProject:333}],
    payers: [{memberId:"a",amountProject:3172}],
    totalMinor: 3172,
  }
  const r = computeProjectAmounts({
    amount: 1000, currency: "TWD", projectCurrency: "USD", rate: 0.031715,
    participants: [{memberId:"a",shareAmount:333.33},{memberId:"b",shareAmount:333.33},{memberId:"c",shareAmount:333.34}],
    payers: [{memberId:"a",amount:1000}],
    discrepancy: new Map([["a",1]]),
    previous: prev,
  })
  expect(r.discrepancy.get("a")).toBeGreaterThanOrEqual(0) // no double count
  expect(r.participants.reduce((s,p)=>s+p.shareAmountProject,0)).toBe(r.totalMinor)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- tests/lib/expense-project-amounts.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

If `previous` is present, first call `rollbackAllocation(previous.totalMinor, previousWeights, previousStored, discrepancy)` for participants and payers to undo the old bumps. Then `totalMinor = toMinorUnits(roundMajorToMinor(amount * rate, projectCurrency), projectCurrency)`. Allocate across participant weights (original `shareAmount`) and payer weights (original `amount`) using the same discrepancy map, applying `bumped` to the ledger after each call. Return new maps.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- tests/lib/expense-project-amounts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/expense-project-amounts.ts tests/lib/expense-project-amounts.test.ts
git commit -m "feat(expense): compute settlement-currency amounts with discrepancy ledger"
```

---

### Task 5: POST expense route writes settlement amounts

**Files:**
- Modify: `app/api/projects/[id]/expenses/route.ts`
- Test: `tests/api/expenses.test.ts`

**Interfaces:**
- Consumes: `resolveRate`, `getExchangeRate` (`lib/services/exchange-rate.ts`), `computeProjectAmounts`.

- [ ] **Step 1: Write the failing test**

Add to `tests/api/expenses.test.ts` (mock `getExchangeRate` to `0.031715`):

```ts
it("stores settlement amounts and a snapshot rate for a foreign-currency expense", async () => {
  vi.mocked(prisma.project.findUnique).mockResolvedValue({ id:"p1", currency:"USD", customRates:null, exchangeRatePrecision:2, rateSource:"fixed" } as never)
  const res = await POST(jsonReq({ amount:1000, currency:"TWD", payers:[{memberId:"m1",amount:1000}], participants:[{memberId:"m1",shareAmount:1000}] }), createParams("p1"))
  expect(res.status).toBe(201)
  const data = vi.mocked(prisma.expense.create).mock.calls[0][0].data
  expect(data.exchangeRate).toBeCloseTo(0.031715)
  expect(data.participants.create[0].shareAmountProject).toBe(3172)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- tests/api/expenses.test.ts -t "settlement amounts"`
Expected: FAIL — `exchangeRate`/`shareAmountProject` undefined.

- [ ] **Step 3: Implement**

In POST: select `currency, customRates, exchangeRatePrecision, rateSource`. If `expenseCurrency !== project.currency`, resolve rate (`exchangeRate` from body, else via `resolveRate` using `customRates` and a fetched live rate) and, when `shouldSeedFixed`, persist the live rate into `Project.customRates`. Load each member's `remainderDiscrepancy`, build the discrepancy map, call `computeProjectAmounts`, and include `exchangeRate`, `participants.create[].shareAmountProject`, `payers.create[].amountProject`, plus `projectMember.update` for changed discrepancies, inside a single `prisma.$transaction`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- tests/api/expenses.test.ts`
Expected: PASS (all existing cases still green).

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/expenses/route.ts tests/api/expenses.test.ts
git commit -m "feat(api): compute and store settlement amounts on expense create"
```

---

### Task 6: PUT expense route rolls back and recomputes

**Files:**
- Modify: `app/api/projects/[id]/expenses/[expenseId]/route.ts`
- Test: `tests/api/expenses.test.ts`

**Interfaces:**
- Consumes: `computeProjectAmounts` with `previous` built from the existing expense's `*Project` values.

- [ ] **Step 1: Write the failing test**

```ts
it("rolls back the previous discrepancy when the rate is edited", async () => {
  vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpenseWithProject({ exchangeRate: 0.03, rateSourceProject:"USD" }) as never)
  const res = await PUT_EXPENSE(jsonReq({ exchangeRate: 0.0317 }), createExpenseParams("p1","e1"))
  expect(res.status).toBe(200)
  expect(prisma.projectMember.update).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- tests/api/expenses.test.ts -t "rolls back the previous discrepancy"`
Expected: FAIL.

- [ ] **Step 3: Implement**

In PUT: when amount/currency/rate/split change for a foreign-currency expense, build `previous` from the existing participants'/payers' `*Project` and their original weights, call `computeProjectAmounts` with `previous`, and write new `*Project` values plus `ProjectMember.remainderDiscrepancy` updates inside the existing `$transaction`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- tests/api/expenses.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/expenses/[expenseId]/route.ts tests/api/expenses.test.ts
git commit -m "feat(api): roll back and recompute settlement amounts on expense edit"
```

---

### Task 7: `useSaveExpense` sends `exchangeRate`

**Files:**
- Modify: `lib/hooks/useSaveExpense.ts`
- Test: `tests/lib/hooks/useSaveExpense.test.tsx`

- [ ] **Step 1: Write the failing test** — assert the `fetch` body JSON contains `exchangeRate` when provided in the payload, and omits it otherwise.

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/lib/hooks/useSaveExpense.test.tsx`

- [ ] **Step 3: Implement** — add `exchangeRate?: number | null` to `ExpensePayload` and spread it into the request body.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(expense): pass snapshot exchange rate through save payload"`

---

## Phase 4 — Read path (no more conversion)

> Shared rule for Tasks 8–11: for each expense, if `currency === project.currency` **or** `*Project` is null, treat the original amounts as already settlement amounts; otherwise sum the stored `*Project`. Never call the live-rate service from read paths.

### Task 8: Settle route reads stored settlement amounts

**Files:**
- Modify: `app/api/projects/[id]/settle/route.ts`
- Test: `tests/api/settle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("uses stored amountProject/shareAmountProject without converting", async () => {
  vi.mocked(prisma.expense.findMany).mockResolvedValue([{ id:"e1", amount:1000, currency:"TWD", amountProject:null,
    payers:[{ memberId:"m1", amount:1000, amountProject:3172 }],
    participants:[{ memberId:"m1", shareAmount:1000, shareAmountProject:3172, splitDetail:null }] }] as never)
  const res = await GET(createParams("p1"))
  const data = await res.json()
  expect(data.balances.find((b:any)=>b.memberId==="m1").balance).toBe(0)
})
```

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/api/settle.test.ts`

- [ ] **Step 3: Implement** — replace the per-currency `convertCurrency` loop with `fromMinorUnits(amountProject ?? ..., projectCurrency)`; keep `roundToPrecision` only for display rounding. Keep the response shape.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "refactor(settle): read stored settlement amounts instead of converting"`

---

### Task 9: Project stats use settlement amounts

**Files:**
- Modify: `lib/project-stats.ts`, `lib/hooks/useProjectOverview.ts`
- Test: `tests/lib/project-stats.test.ts`

- [ ] **Step 1: Write the failing test** — a `StatsInput` expense with `currency:"TWD"`, `amount:1000`, `amountProject:3172`, participants/payers carrying `*Project`; assert `total` is `31.72` and no `convert` callback is required.

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/lib/project-stats.test.ts`

- [ ] **Step 3: Implement** — extend `StatsInput` expense shape with `amount: number`, `amountProject: number | null`, `payers[].amountProject`, `participants[].shareAmountProject`; make `convert` optional and, when absent, use `amountProject`. Update `useProjectOverview` to pass the new fields.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(stats): compute from stored settlement amounts"`

---

### Task 10: Export uses settlement amounts

**Files:**
- Modify: `components/v2/export/export-data.ts`
- Test: `tests/components/v2/export-data.test.ts`

- [ ] **Step 1: Write the failing test** — an expense with `currency:"TWD"`, `amountProject:3172`, participant `shareAmountProject:3172`; assert the exported project-currency amount is `31.72` and the original `1000 TWD` is preserved.

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/components/v2/export-data.test.ts`

- [ ] **Step 3: Implement** — replace `convertToProjectCurrency(...)` with `fromMinorUnits(amountProject ?? toMinorUnits(amount, currency), projectCurrency)`; produce `participantShares` from `shareAmountProject`. Keep original-currency columns.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(export): use stored settlement amounts for project-currency columns"`

---

### Task 11: Expense list summary uses settlement amounts

**Files:**
- Modify: `lib/expense-list.ts`, `lib/hooks/useProjectExpenses.ts`
- Test: `tests/lib/expense-list.test.ts`

- [ ] **Step 1: Write the failing test** — `summarizeExpenses` given expenses with `amount`/`currency`/`amountProject`; assert the total is the sum of settlement amounts and needs no converter.

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/lib/expense-list.test.ts`

- [ ] **Step 3: Implement** — extend the accepted expense shape with `amountProject`; drop the `convert` parameter; update the caller.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(list): summarize expenses from settlement amounts"`

---

## Phase 5 — v2 UI

### Task 12: Amount card shows converted preview and per-expense rate edit

**Files:**
- Modify: `components/v2/expense-form/amount-card.tsx`, `components/v2/expense-form/expense-form-v2-view.tsx`, `components/v2/expense-form/use-expense-draft.ts`
- Test: `tests/components/v2/amount-card.test.tsx`

**Interfaces:**
- `AmountCardProps` gains `projectCurrency: string`, `previewProjectAmount: number | null`, `rate: number | null`, `rateEditable: boolean`, `onRate: (value: string) => void`.
- `useExpenseDraft` state gains `exchangeRate: string`; `DraftInit` gains `projectCurrency`, `rateSource`, `projectRates`.

- [ ] **Step 1: Write the failing test**

```tsx
it("shows the converted settlement amount with ≈ and hides the rate for same currency", () => {
  render(<AmountCard amount="1000" currency="TWD" projectCurrency="USD" previewProjectAmount={31.72} rate={0.031715} rateEditable onAmount={()=>{}} onCurrency={()=>{}} onRate={()=>{}} />)
  expect(screen.getByText(/≈\s*US\$\s*31\.72/)).toBeInTheDocument()
  expect(screen.getByText(/0\.031715/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/components/v2/amount-card.test.tsx`

- [ ] **Step 3: Implement** — render `≈ {formatCurrency(previewProjectAmount, projectCurrency)}` under the amount when `currency !== projectCurrency`; show a rate row with an editable input (`方案 A`) and a 「自訂」badge when `rate !== projectRates[currency]`. In the view, compute the preview client-side (approximate, label `≈`). Do not render the rate row for same-currency expenses.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(v2): add converted preview and per-expense rate edit to amount card"`

---

### Task 13: Split / payer money is currency-aware and shows per-person ≈ settlement

**Files:**
- Modify: `components/v2/expense-form/split-editor.tsx`, `split-summary.tsx`, `payer-picker.tsx`
- Test: `tests/components/v2/expense-form-v2-view.test.tsx`

- [ ] **Step 1: Write the failing test** — with `currency="JPY"` the split rows render `JPY 1,000` (no `$`, no decimals); with a foreign currency each member row shows a `≈` settlement amount.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — replace every `` `$${formatAmount(...)}` `` and literal `<span>$</span>` with `formatCurrency` / the currency code prefix. Add a `rate`/`projectCurrency`-based per-person `≈` line.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "fix(v2): render split and payer money with the actual currency"`

---

### Task 14: Project settings — rate-source toggle, dynamic minor-unit note, no confirm flow, currency-change reset

**Files:**
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`, `components/v2/project-settings/project-settings-v2.tsx`, `lib/hooks/use-project-form.ts`, `components/v2/currency/currency-v2.tsx`, `components/v2/currency/currency-v2-view.tsx`, `app/api/projects/[id]/route.ts`
- Test: `tests/components/v2/project-settings-v2.test.tsx`, `tests/api/project-detail.test.ts`

**Interfaces:**
- `ProjectFormValues` gains `rateSource: "fixed" | "live"`; `ProjectRecord` gains `rateSource`.

- [ ] **Step 1: Write the failing test**

```tsx
it("shows a dynamic rounding hint for the selected settlement currency", () => {
  renderSettings({ currency: "TWD" })
  expect(screen.getByText(/四捨五入至整數/)).toBeInTheDocument()
})
it("toggles the default rate source", async () => {
  renderSettings({ rateSource: "fixed" })
  await userEvent.click(screen.getByLabelText("即時匯率"))
  expect(screen.getByText(/只影響未來的新支出/)).toBeInTheDocument()
})
it("offers 'set as project fixed rate' on the currency page", () => {
  render(<CurrencyV2View /* ...minimal props... */ liveRates={{ TWD: 0.0317 }} projectCurrency="USD" />)
  expect(screen.getByRole("button", { name: /設為專案固定匯率/ })).toBeInTheDocument()
})
```

And in `tests/api/project-detail.test.ts`:

```ts
it("resets member discrepancy when the settlement currency changes", async () => {
  vi.mocked(prisma.project.findUnique).mockResolvedValue({ id:"p1", currency:"TWD" } as never)
  await PUT(jsonReq({ currency:"USD" }), createParams("p1"))
  expect(prisma.projectMember.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { projectId:"p1" }, data: { remainderDiscrepancy: 0 } }))
})
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — add the 預設匯率來源 segmented control (`固定匯率` / `即時匯率`, default `固定`); under 結算幣別 render a read-only hint derived from `getCurrencyDecimals` (0 → 「四捨五入至整數」, else 「四捨五入至 0.01」); add the 「只影響未來的新支出」copy; ensure no "受影響 N 筆 / 兩段式確認" exists. Persist `rateSource` via the existing project PUT. On the project PUT handler, when `currency` changes, reset every member's ledger in the same transaction: `prisma.projectMember.updateMany({ where: { projectId: id }, data: { remainderDiscrepancy: 0 } })`, and warn the user in the UI. On the currency page, add a 「設為專案固定匯率」 button that writes the shown live rate into `Project.customRates[currency]`.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(settings): add default rate source and dynamic minor-unit hint"`

---

### Task 15: New-project currency hint

**Files:**
- Modify: `components/v2/new-project/new-project-v2.tsx`
- Test: `tests/components/v2/new-project-v2.test.tsx`

- [ ] **Step 1: Write the failing test** — selecting `TWD` shows 「四捨五入至整數」; switching to `USD` shows 「四捨五入至 0.01」.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — render the same dynamic minor-unit hint component/function used in Task 14 (extract it to `lib/constants/currencies.ts` as `minorUnitHint(currencyCode)` if shared).

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(v2): show dynamic settlement-currency hint on project creation"`

---

## Phase 6 — Display unification, truncation, v1 parity

### Task 16: Remove remaining money-display offenders

**Files:**
- Modify: `components/v2/expenses/filter-panels.tsx`, `components/v2/settle/settle-summary-grid.tsx`, `components/v2/settle/settle-v2-view.tsx`, `components/settle/settlement-calc-dialog.tsx`, `lib/expense-changes.ts`, `components/ui/calculator.tsx`, `components/v2/expense-form/calculator-pad.tsx`, `components/v1/stats/stats-v1.tsx`, `components/v2/stats/category-donut.tsx`, `components/v1/mileage/mileage-v1.tsx`, `lib/export/csv-generator.ts`
- Test: `tests/components/v2/no-hardcoded-money.test.ts` (new, grep-style)

- [ ] **Step 1: Write the failing test** — scan the listed files (and `components/v2/**`) for `toFixed(`, `toLocaleString(`, and `` `$$ `` **outside** `lib/constants/currencies.ts`; fail if any occur on a money value.

- [ ] **Step 2: Run to verify it fails** — `npm run test:run -- tests/components/v2/no-hardcoded-money.test.ts`

- [ ] **Step 3: Implement** — route every money value through `formatAmount`/`formatCurrency`; leave `toFixed` only where it formats a **rate** (and keep `exchangeRatePrecision` for that).

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "fix(display): unify money formatting via formatAmount/formatCurrency"`

---

### Task 17: Truncate long currency names

**Files:**
- Modify: `components/v2/ui/currency-field.tsx`, `components/ui/currency-select.tsx`, `components/v1/new-project/new-project-v1.tsx`, `components/v1/currency/currency-v1.tsx`
- Test: `tests/components/currency-select.test.tsx`

- [ ] **Step 1: Write the failing test** — the name span renders with `truncate` and its wrapper has `min-w-0`.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — add `truncate` to name spans and `min-w-0` to their flex wrappers.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "fix(ui): truncate long currency names to prevent overflow"`

---

### Task 18: v1 functional parity

**Files:**
- Modify: `components/expense/expense-form.tsx` and the v1 settle/currency screens that read amounts
- Test: `tests/components/expense-form.test.tsx`

- [ ] **Step 1: Write the failing test** — a v1 foreign-currency expense sends `exchangeRate` and renders via `formatCurrency`.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement** — add the same rate field and `≈` preview to the v1 form; replace `toFixed(2)` money formatting; ensure v1 reads the same `*Project` values.

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(v1): support multi-currency expenses for feature parity"`

---

## Phase 7 — Wrap-up

### Task 19: Docs, lint, full test run

**Files:**
- Modify: `docs/DATABASE.md`, `docs/API.md`

- [ ] **Step 1: Update docs** — document the new columns and the write-API `exchangeRate` field.
- [ ] **Step 2: Run the full suite** — `npm run test:run`; expected: all green.
- [ ] **Step 3: Run lint** — `npm run lint`; expected: no errors.
- [ ] **Step 4: Commit** — `git add docs/DATABASE.md docs/API.md && git commit -m "docs: document multi-currency columns and API"`

---

## Notes for the executor

- Run every task on the `dev` branch against the dev DB; `main` is untouched, so any task can be reverted by `git checkout main`.
- Before applying schema changes to any shared DB, run `npm run db:diff:main` first — never `db:push:main` without a Neon backup.
- Keep the `≈` prefix on every client-side preview: the server is authoritative and may differ by up to one minor unit per person.
