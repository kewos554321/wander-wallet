# Unified Split Allocation (F′) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an expense's per-member shares use one tail-account-driven allocation that is identical for the original currency and the settlement currency, for every currency — including when the two are the same.

**Architecture:** The split is defined by *ideal* (unrounded) weights: each member's personal items plus their share of the pool. A single pure allocator distributes the original-currency total and the settlement-currency total over those weights using the shared `allocate()` + `MemberAllocation.remainderDiscrepancy` ledger, so both currencies pick the same remainder recipient(s) in the same priority order. The server is authoritative and performs this for every request (dropping the "foreign only" guard); the client reproduces it for display by fetching the ledger.

**Tech Stack:** Next.js route handlers (App Router), Prisma, TypeScript, Vitest + Testing Library.

**Spec:** docs/superpowers/specs/2026-10-08-multi-currency-expense-design.md (settlement-currency-first + fairness ledger); this plan extends §"尾差帳" to the original-currency shares and to same-currency expenses.

## Global Constraints

- **Do not change schema.** Reuse `ExpenseParticipant.shareAmount`, `ExpenseParticipant.shareAmountProject`, `ExpensePayer.amountProject`, `ProjectMember.remainderDiscrepancy`.
- **Settlement currency is the authority.** `*Project` values are integer minor units. The original currency is reconciliation/display.
- **Just-in-time, plain numbers only.** Shares are numbers; no new currency types.
- **v1 must keep working.** `lib/` helpers stay usable without the ledger context; absent context keeps today's behaviour.
- **Tail-account ordering copy (verbatim):** primary key = `remainderDiscrepancy` ascending; tie-break = the member's index in the weights array ascending.
- **Test runner:** `npx vitest run <path>`. Whole suite: `npm run test:run`.

## Review Focus

Inputs/conditions the tests must pin (most likely to bite first):

1. **Same-currency remainder** — `expense.currency === project.currency`: the original and settlement allocations must be *identical*, and they must still bump the ledger (today they are skipped entirely).
2. **Non-divisible equal split in a 0-decimal currency** (e.g. `1111 → 667` pool in TWD) — shares must sum exactly to the total; today the display shows `222/222/222` against a `667` total.
3. **Ledger skew** — when `remainderDiscrepancy` differs per member, both currencies must move the remainder to the same (lowest) member, not the first auto member.
4. **Exact-division case** — no remainder in either currency: nobody is bumped, ledger unchanged.
5. **Legacy rows with `*Project = null`** — read paths must keep falling back to the original amounts.

## File Structure

- `lib/expense-split.ts` — add `computeIdealShares` (unrounded weights). Existing rounding helpers stay for v1/legacy.
- `lib/split-allocation.ts` (new) — `allocateBothCurrencies`.
- `lib/expense-project-amounts.ts` — allocate both currencies; return allocated original shares too.
- `app/api/projects/[id]/expenses/route.ts` — POST: allocate for all currencies.
- `app/api/projects/[id]/expenses/[expenseId]/route.ts` — PUT: same.
- `lib/split-draft.ts` — `deriveSplit` predicts the allocated shares when given a context.
- `lib/hooks/useProjectData.ts` (+ overview member type) — expose `remainderDiscrepancy`.
- `components/v2/expense-form/use-expense-draft.ts` — supply the allocation context.
- `components/v2/quick-expense/quick-item-card.tsx`, `quick-expense-v2.tsx`, `confirm-step.tsx`, `lib/quick-expense/use-quick-save.ts` — quick-flow parity.
- Tests: `tests/lib/expense-split.test.ts`, `tests/lib/split-allocation.test.ts` (new), `tests/lib/expense-project-amounts.test.ts`, `tests/api/expenses.test.ts`, `tests/components/v2/expense-form-v2-view.test.tsx`, `tests/lib/quick-expense/use-quick-save.test.ts`.

---

### Task 1: Ideal (unrounded) split weights

**Files:**
- Modify: `lib/expense-split.ts`
- Test: `tests/lib/expense-split.test.ts`

**Interfaces:**
- Consumes: existing `SplitInput`, `sumItems`, `hasOwn`.
- Produces: `computeIdealShares(input: SplitInput): { memberId: string; weight: number }[]` — one entry per `participantIds` element, in input order.

- [ ] **Step 1: Write the failing test**

```ts
import { computeIdealShares } from "@/lib/expense-split"
// equal, non-divisible
expect(computeIdealShares({ amount: 100, participantIds: ["a","b","c"], personalItems: {}, customShares: {} }))
  .toEqual([{ memberId:"a", weight:100/3 }, { memberId:"b", weight:100/3 }, { memberId:"c", weight:100/3 }])
// personal + pool
expect(computeIdealShares({ amount:1000, participantIds:["a","b","c"], personalItems:{ b:[{name:"x",amount:100}] }, customShares:{} }))
  .toEqual([{ memberId:"a", weight:450 }, { memberId:"b", weight:550 }, { memberId:"c", weight:450 }])
// custom share
expect(computeIdealShares({ amount:100, participantIds:["a","b"], personalItems:{}, customShares:{ a:30 } }))
  .toEqual([{ memberId:"a", weight:30 }, { memberId:"b", weight:70 }])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/expense-split.test.ts -t computeIdealShares`
Expected: FAIL — `computeIdealShares is not a function`.

- [ ] **Step 3: Implement `computeIdealShares`**

Same body as `computeShares` but return `weight` with **no `round2`** and **no remainder absorption**: `personal(id) + (hasOwn(customShares,id) ? customShares[id] : (amount - personalTotal - customTotal) / autoIds.length)`. When `autoIds.length === 0`, the auto term is `0`.

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run tests/lib/expense-split.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(split): add computeIdealShares for tail-account allocation"`

---

### Task 2: Dual-currency allocator

**Files:**
- Create: `lib/split-allocation.ts`
- Test: `tests/lib/split-allocation.test.ts`

**Interfaces:**
- Consumes: `allocate` from `lib/currency-conversion.ts`.
- Produces:
```ts
export interface WeightedMember { id: string; weight: number }
export interface DualAllocation {
  original: Map<string, number>   // minor units of the ORIGINAL currency
  settlement: Map<string, number> // minor units of the SETTLEMENT currency
  bumped: string[]                // settlement remainder recipients (ledger update)
}
export function allocateBothCurrencies(
  originalTotalMinor: number,
  settlementTotalMinor: number,
  weights: WeightedMember[],
  discrepancy: Map<string, number>,
): DualAllocation
```

- [ ] **Step 1: Write the failing tests**

```ts
// Same ordering: with A winning before, both currencies give the unit to the lowest-ledger member.
const d = new Map([["a",5],["b",0],["c",0]])
const w = [{id:"a",weight:100/3},{id:"b",weight:100/3},{id:"c",weight:100/3}]
const r = allocateBothCurrencies(1000, 100, w, d)
expect(r.original.get("b")).toBe(334); expect(r.original.get("a")).toBe(333)
expect(r.settlement.get("b")).toBe(34); expect(r.settlement.get("a")).toBe(33)
expect(r.bumped).toEqual(["b"])

// Same-currency: original === settlement.
const same = allocateBothCurrencies(667, 667, [{id:"a",weight:222.33},{id:"b",weight:222.33},{id:"c",weight:222.34}], new Map())
expect(same.original.get("a")).toBe(same.settlement.get("a"))
expect([...same.original.values()].reduce((s,x)=>s+x,0)).toBe(667)

// Exact division: nobody bumped, ledger untouched.
const exact = allocateBothCurrencies(99, 99, [{id:"a",weight:33},{id:"b",weight:33},{id:"c",weight:33}], new Map())
expect(exact.settlement.get("a")).toBe(33); expect(exact.bumped).toEqual([])
```

- [ ] **Step 2: Run to verify it fails** — Run: `npx vitest run tests/lib/split-allocation.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — call `allocate(originalTotalMinor, weights, discrepancy)` and `allocate(settlementTotalMinor, weights, discrepancy)`; `bumped` = settlement's `bumped`. Do **not** mutate the passed map.

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(split): allocate original+settlement with one ordering"`

---

### Task 3: `computeProjectAmounts` returns allocated original shares

**Files:**
- Modify: `lib/expense-project-amounts.ts`
- Test: `tests/lib/expense-project-amounts.test.ts`

**Interfaces:**
- Consumes: `allocateBothCurrencies` (Task 2), `toMinorUnits`, `roundMajorToMinor`, `fromMinorUnits`, `rollbackAllocation`.
- Produces: `ProjectAmountResult.participants` becomes `{ memberId: string; shareAmount: number; shareAmountProject: number }[]` (`shareAmount` in **major units** of `input.currency`, via `fromMinorUnits`); adds `originalTotalMinor: number`. `payers` unchanged (`amountProject` only).

- [ ] **Step 1: Write the failing tests**
  - Same-currency `computeProjectAmounts({amount:667,currency:"TWD",projectCurrency:"TWD",rate:1,participants:[a,b,c weight 222.33/222.33/222.34],payers:[],discrepancy:new Map()})` → participants sum `shareAmount` = 667 AND `shareAmountProject` = 667 AND they are equal per member.
  - Foreign: `amount:1000,currency:"JPY",projectCurrency:"TWD",rate:0.1` with ledger `{a:5,b:0,c:0}` → `shareAmount` = `[333,334,333]` (major JPY) and `shareAmountProject` = `[33,34,33]`; the bumped member is the same in both.
  - `previous` rollback still returns the ledger to its pre-expense value (existing test must stay green).

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/lib/expense-project-amounts.test.ts` → FAIL.

- [ ] **Step 3: Implement** — replace the participant allocation with `allocateBothCurrencies(toMinorUnits(amount, currency), totalMinor, participantWeights, discrepancy)`; map back `shareAmount = fromMinorUnits(original.get(id), currency)`, `shareAmountProject = settlement.get(id)`. Keep payer allocation as today. Apply `previous` rollback for both participant and payer ledgers as today.

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(split): compute allocated original shares alongside settlement"`

---

### Task 4: POST route allocates for every currency

**Files:**
- Modify: `app/api/projects/[id]/expenses/route.ts` (~line 220 guard; ~line 292 participant create)
- Test: `tests/api/expenses.test.ts`

**Interfaces:**
- Consumes: `computeProjectAmounts` (Task 3).
- Produces: for same-currency requests, `shareAmountProject`/`amountProject` are written and the ledger updates; `shareAmount` stored = the allocated original (major units) from `projectAmounts`, not the raw request value.

- [ ] **Step 1: Write the failing tests**
  - Same-currency POST (TWD project, TWD expense, 3 equal participants, ledger `{a:1}`) → `expense.create` receives `shareAmountProject` on the lowest-ledger participant and a `projectMember.update` bumping it.
  - Foreign POST still stores `shareAmount` = allocated original and `shareAmountProject` = allocated settlement, same recipient.

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/api/expenses.test.ts` → FAIL.

- [ ] **Step 3: Implement** — remove `if (expenseCurrency !== projectCurrency)`; resolve `rate` (1 + `snapshotRate = null` when same currency); always call `computeProjectAmounts` using the request's `participants[].shareAmount` **as weights** (the client now sends ideal weights); in `participants.create`, write `shareAmount: projectAmounts.participants.find(...)?.shareAmount ?? Number(p.shareAmount)` alongside `shareAmountProject`. Keep the ledger-update block unconditional.

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(api): allocate original+settlement shares for all currencies (create)"`

---

### Task 5: PUT route matches POST

**Files:**
- Modify: `app/api/projects/[id]/expenses/[expenseId]/route.ts` (~lines 279-300, 320-345, 460-500)
- Test: `tests/api/expenses.test.ts`

**Interfaces:**
- Consumes: `computeProjectAmounts` (Task 3).
- Produces: edits to same-currency and foreign expenses both re-allocate original+settlement from `previous`, and write the allocated `shareAmount`.

- [ ] **Step 1: Write the failing tests**
  - Edit a same-currency expense's amount → `expenseParticipant.update` receives an integer `shareAmount` + `shareAmountProject`, ledger adjusted via rollback.
  - Edit keeps legacy rows (`shareAmountProject = null`) working (fallback path).

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** — mirror Task 4: drop the currency guard, always allocate with `previous`, store the allocated original. Guard the `previous` weights on `shareAmountProject ?? fallback` as today.

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(api): re-allocate original+settlement shares for all currencies (update)"`

---

### Task 6: Client predicts the allocation

**Files:**
- Modify: `lib/split-draft.ts` (`deriveSplit`), `lib/hooks/useProjectData.ts` (member type), `components/v2/expense-form/use-expense-draft.ts`
- Test: `tests/lib/split-draft.test.ts`, `tests/components/v2/expense-form-v2-view.test.tsx`

**Interfaces:**
- Consumes: `computeIdealShares` (Task 1), `allocateBothCurrencies` (Task 2), `getCurrencyDecimals`.
- Produces:
```ts
export interface SplitContext {
  currency: string                  // expense currency
  projectCurrency: string           // settlement currency
  rate: number                      // resolved rate (1 when same)
  discrepancy: Record<string, number>
}
export function deriveSplit(amount: number, participantOrder: string[], state: SplitState, context?: SplitContext): SplitDerived
```
When `context` is omitted, `deriveSplit` keeps today's `computeShares` behaviour (v1/tests unchanged). `SplitDerived` gains:
- `weights: { memberId: string; weight: number }[]` — the **ideal** shares (Task 1). This is what the client **sends as `participants[].shareAmount`**; the server must receive the ideal weights so it sees the remainder and bumps the ledger.
- `shares: ParticipantShare[]` — the **allocated original** major-unit values, for display only.
- `sharesProject: ParticipantShare[]` — the **allocated settlement** major-unit values, for display only.
- `ProjectMember` gains `remainderDiscrepancy: number`.

- [ ] **Step 1: Write the failing tests**
  - `deriveSplit(667, ["a","b","c"], state, { currency:"TWD", projectCurrency:"TWD", rate:1, discrepancy:{a:1,b:0,c:0} })` → `shares` are integers summing to 667 (`[222,223,222]`) and `weights` are the ideal `[222.33,222.33,222.34]`. Without a context → `shares` stays the legacy `[222.34,222.33,222.33]` (locks current behaviour).
  - Foreign context gives `sharesProject` in settlement major units and the same remainder member as `shares`.
  - `useExpenseDraft.handleSubmit` sends `participants` built from `derived.weights` (ideal), not `derived.shares`.
  - `expense-form-v2-view.test.tsx`: a `1111` TWD equal split over 3 shows `371/370/370` summing to `1111` (lock the new integer display).

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** `deriveSplit`'s context branch using `computeIdealShares` + `allocateBothCurrencies` (weights = ideal; totals = `toMinorUnits(amount, currency)` and `toMinorUnits(roundMajorToMinor(amount*rate, projectCurrency), projectCurrency)`); map back with `fromMinorUnits` for `shares`/`sharesProject`. In `useExpenseDraft`, build the context from `state.currency`, `init.projectCurrency`, the resolved `rate`, and `init.members`' `remainderDiscrepancy`, pass it to `deriveSplit`, and send `derived.weights` in `handleSubmit` (keep `derived.shares` for `buildExpenseChanges` and notifications).

- [ ] **Step 4: Run to verify it passes** — `npx vitest run tests/lib/split-draft.test.ts tests/components/v2/expense-form-v2-view.test.tsx` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(v2): predict the tail-account split in the expense form"`

---

### Task 7: Quick-expense flow parity

**Files:**
- Modify: `lib/quick-expense/draft.ts` (`QuickItem` gains `shareAmountProject: Record<string, number> | null`), `lib/quick-expense/use-quick-save.ts`, `components/v2/quick-expense/quick-item-card.tsx`, `quick-expense-v2.tsx`, `confirm-step.tsx`
- Test: `tests/lib/quick-expense/use-quick-save.test.ts`, `tests/components/v2/quick-expense/quick-item-card.test.tsx`

**Interfaces:**
- Consumes: `deriveSplit` context (Task 6), the project members' `remainderDiscrepancy` (already in the overview payload).
- Produces: quick items send the same allocated shares/payload as the expense form; the result card shows the allocated split.

- [ ] **Step 1: Write the failing tests**
  - `use-quick-save` posts `participants[].shareAmount` = allocated original integers for a 0-decimal currency.
  - `QuickItemCard` for a 1111-TWD same-currency item shows pool amounts summing to 667.

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** — thread `{ currency, projectCurrency, rate, discrepancy }` into the quick flow (customRates already passed from the overview; add the member ledger map) and use the Task 6 prediction. `use-quick-save` posts `participants` built from the ideal `weights` (same rule as the expense form).

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(v2): quick-expense uses the tail-account split"`

---

### Task 8 (optional / separate): Backfill + settle attribution

**Files:**
- Modify: `scripts/backfill-multi-currency.mjs` (or a new script), `app/api/projects/[id]/settle/route.ts`
- Test: script dry-run; `tests/api/settle.test.ts`

- [ ] **Step 1:** Backfill `*Project` for existing same-currency expenses from the new allocation and rebuild each member's `remainderDiscrepancy` in `expenseDate` order (idempotent).
- [ ] **Step 2:** Settle route: mark the member whose stored `shareAmountProject` exceeded `floor(ideal)` as the remainder recipient per expense (no new column).
- [ ] **Step 3:** Tests + commit.

---

## Self-Review

- **Spec coverage:** original-currency remainder (Task 3/4/6), settlement remainder (Task 2/3/4), same-currency (Task 3/4/5), same recipient (Task 2 test), quick flow (Task 7). Backfill/attribution deliberately split into Task 8.
- **Type consistency:** `WeightedMember` / `DualAllocation` (Task 2) used by Task 3; `SplitContext` (Task 6) used by Task 7; `shareAmount` = allocated original everywhere after Task 3.
- **Known risks (call out in review):** (a) v1's stored `shareAmount` may shift by one minor unit; (b) the client prediction is exact only when the client's resolved rate equals the server's — true for fixed/custom, approximate for live; (c) concurrency between fetching the ledger and saving; (d) payers are intentionally **out of scope** in this plan — the payer side keeps its current settlement-only allocation (a follow-up if the same rule is wanted there).
