# 移除「專案固定匯率」(customRates) — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the project-level fixed-rate feature (`customRates`) from every v2 screen and stop threading it through hooks, so rates come only from the live feed and each expense's stored snapshot.

**Architecture:** Pure deletions. `customRates` is read in four places and passed to one shared hook (`useCurrencyConversion`). Remove the hook option first, then each consumer, then the settings form that writes it, and finally the `useProjectData` field that supplies it. No API, V1, or DB changes (Phase 3). Each task leaves the build and its own tests green.

**Tech Stack:** Next.js (App Router), React, TypeScript, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-10-rate-market-custom-design.md` (§4.5–4.7, §5 Phase 2)

## Global Constraints

- UI copy in Traditional Chinese, concise; keep existing wording where a block is untouched.
- `customRates` UI is removed only from **v2** (`components/v2/**`). Do **not** touch `components/v1/**`, `app/api/**`, or `prisma/**`.
- The API `PUT /api/projects/[id]` still accepts `customRates`; the v2 settings form must simply **stop sending it** (the column is left untouched — that is intended).
- Do not change conversion maths beyond deleting the custom-rate branch: with no custom rates, `convertToProjectCurrency` / `useCurrencyConversion` fall back to live `exchangeRates`, and stored `*Project` snapshots still win where they exist.
- Every task ends with `npx vitest run <its test files>` + `npm run lint` clean, then a commit.
- Full suite before finishing: `npm run test:run` (the only expected failures are the two pre-existing external-API integration tests: `tests/integration/vision-models.integration.test.ts`, `tests/lib/receipt-parser.integration.test.ts`).

## Review Focus

Several inputs the spec does not spell out, each of which a real user will hit:

1. **A project that still has `custom_rates` in the DB** (`日本北海道` `{JPY:…}`, `東京5日` `{CNY:50}`) — after removal every v2 screen must render normally and simply ignore the value (no crash, no stale row, no blank card). Test: each task keeps a fixture project that still carries `customRates` in the API response and asserts the screen renders.
2. **Foreign expense with a stored `amountProject` snapshot** — export/overview must keep using the snapshot, never NaN/0, once the custom-rate branch is gone.
3. **Foreign expense without a snapshot** — conversion falls back to live `exchangeRates`; with no rates loaded it returns the original amount (never NaN).
4. **Editing a project after removal** — the settings PUT payload must **omit** `customRates` (not send `null`), so the DB column is not wiped unexpectedly before Phase 3.
5. **A project whose settlement currency equals the expense currency** — no conversion/preview path, which must stay untouched.

---

### Task 1: `useCurrencyConversion` — drop the `customRates` branch

**Files:**
- Modify: `lib/hooks/useCurrencyConversion.ts`
- Test: `tests/lib/hooks/useCurrencyConversion.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useCurrencyConversion(options: { projectCurrency?: string; precision?: number; autoFetch?: boolean })` — the `customRates` field is gone from `UseCurrencyConversionOptions`; `getRate` deps drop `customRates`.

- [ ] **Step 1: Delete the custom-rate test**

Remove the `"should use custom rates when available"` block (currently `tests/lib/hooks/useCurrencyConversion.test.ts:53-70`). The remaining `"should convert using exchange rates"` test is the live-rate contract.

- [ ] **Step 2: Run the test file to confirm it still passes**

Run: `npx vitest run tests/lib/hooks/useCurrencyConversion.test.ts`
Expected: PASS (the removed test was the only one asserting the branch).

- [ ] **Step 3: Remove `customRates` from the hook**

In `lib/hooks/useCurrencyConversion.ts`: delete the `customRates` line from `UseCurrencyConversionOptions`, the `customRates = null` destructure default, the `if (customRates && customRates[from] && to === projectCurrency)` block in `getRate`, and `customRates` from `getRate`'s dependency array.

- [ ] **Step 4: Run the test file + lint**

Run: `npx vitest run tests/lib/hooks/useCurrencyConversion.test.ts && npx eslint lib/hooks/useCurrencyConversion.ts`
Expected: PASS, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useCurrencyConversion.ts tests/lib/hooks/useCurrencyConversion.test.ts
git commit -m "refactor(currency): drop the customRates branch from useCurrencyConversion"
```

### Task 2: 匯出 — stop using `customRates`

**Files:**
- Modify: `components/v2/export/export-data.ts`
- Modify: `components/v2/export/export-v2.tsx`
- Test: `tests/components/v2/export-data.test.ts`, `tests/components/v2/export-v2.test.tsx`

**Interfaces:**
- Produces: `ExportContext = { projectCurrency: string; exchangeRates: Record<string, number> | null }` (no `customRates`).

- [ ] **Step 1: Update `convertToProjectCurrency` tests**

In `tests/components/v2/export-data.test.ts`: delete the `ctx` field `customRates: { JPY: 0.21 }` (line 5) and any assertion that relies on it. Keep the "no rates → original amount" and the live-rate cases, and **add** a case: `convertToProjectCurrency(10000, "JPY", { projectCurrency: "TWD", exchangeRates: null })` === `10000` (Review Focus #3).

- [ ] **Step 2: Remove `customRates` from `ExportContext` and the converter**

In `components/v2/export/export-data.ts`: delete `customRates` from `ExportContext`; delete the `if (ctx.customRates && ctx.customRates[fromCurrency])` branch in `convertToProjectCurrency`; update the function's doc comment to say live rates (or the original amount) are used. This is a type-level change, so the compiler is the gate — `npx tsc --noEmit | grep export` shows any missed reference.

- [ ] **Step 3: Stop passing it from the container**

In `components/v2/export/export-v2.tsx`: drop `customRates` from the `useProjectData` destructure and from the `{ projectCurrency, customRates, exchangeRates }` context object.

- [ ] **Step 4: Run the export tests + lint**

Run: `npx vitest run tests/components/v2/export-data.test.ts tests/components/v2/export-v2.test.tsx && npx eslint components/v2/export/export-data.ts components/v2/export/export-v2.tsx`
Expected: PASS. If `export-v2.test.tsx` mocks a project with `customRates`, leave the mock as-is for now (Task 8 removes the field).

- [ ] **Step 5: Commit**

```bash
git add components/v2/export/export-data.ts components/v2/export/export-v2.tsx tests/components/v2/export-data.test.ts
git commit -m "refactor(export): drop customRates from the v2 export context"
```

### Task 3: 匯率頁 — remove the 專案自訂匯率 block

**Files:**
- Modify: `components/v2/currency/currency-v2.tsx`
- Modify: `components/v2/currency/currency-v2-view.tsx`
- Test: `tests/components/v2/currency-v2.test.tsx`

**Interfaces:**
- Produces: `CurrencyV2View` props lose `customRates: CustomRateRow[]`; the exported `CustomRateRow` type is removed.

- [ ] **Step 1: Update the view test**

In `tests/components/v2/currency-v2.test.tsx`: delete the test block asserting the `專案自訂匯率` card (the one passing `customRates: [{ currency: "JPY", … }]` at line ~43) and any `customRates` prop on the rendered view. Add/keep an assertion that the screen renders without the card when the project's `customRates` is non-null (Review Focus #1).

- [ ] **Step 2: Confirm the test fails**

Run: `npx vitest run tests/components/v2/currency-v2.test.tsx`
Expected: FAIL — `CustomRateRow` still required by the view.

- [ ] **Step 3: Remove the block and the type**

In `components/v2/currency/currency-v2-view.tsx`: delete `CustomRateRow`, the `customRates` prop, and the `{customRates.length > 0 ? (…專案自訂匯率…) : null}` block (≈ lines 128-145). Remove now-unused imports (`customRateDiff` if unused elsewhere in the file — it is still used by the historical section, keep it).

In `components/v2/currency/currency-v2.tsx`: drop `customRates` from the `useProjectData` destructure, drop it from the `useCurrencyConversion` options, delete the `customRateRows` `useMemo`, and drop the `customRates={customRateRows}` prop.

- [ ] **Step 4: Run the test + lint**

Run: `npx vitest run tests/components/v2/currency-v2.test.tsx && npx eslint components/v2/currency/currency-v2.tsx components/v2/currency/currency-v2-view.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/v2/currency/currency-v2.tsx components/v2/currency/currency-v2-view.tsx tests/components/v2/currency-v2.test.tsx
git commit -m "refactor(currency): remove the 專案自訂匯率 block"
```

### Task 4: 專案總覽 — drop `customRates`

**Files:**
- Modify: `components/v2/project/project-overview-v2.tsx`
- Modify: `lib/hooks/useProjectOverview.ts`
- Modify: `lib/project-overview.ts`
- Test: `tests/components/v2/project-overview-v2.test.tsx`, `tests/lib/hooks/useProjectOverview.test.tsx`, `tests/lib/project-overview.test.ts`

**Interfaces:**
- Produces: `OverviewProject` loses `customRates`; `useProjectOverview` returns no `customRates`.

- [ ] **Step 1: Remove `customRates` from the type and hook**

`lib/project-overview.ts`: delete `customRates: Record<string, number> | null` from `OverviewProject`.
`lib/hooks/useProjectOverview.ts`: delete the `customRates: project?.customRates || null` line.
`components/v2/project/project-overview-v2.tsx`: delete the `customRates={project.customRates}` prop/arg (line ~72) and drop `customRates` from any destructure or `useCurrencyConversion` options.

- [ ] **Step 2: Update the three test files**

Remove `customRates: null` / `customRates: {…}` from the project fixtures in `tests/lib/project-overview.test.ts`, `tests/lib/hooks/useProjectOverview.test.tsx`, and `tests/components/v2/project-overview-v2.test.tsx`.

- [ ] **Step 3: Run the tests + lint**

Run: `npx vitest run tests/lib/project-overview.test.ts tests/lib/hooks/useProjectOverview.test.tsx tests/components/v2/project-overview-v2.test.tsx && npx eslint lib/project-overview.ts lib/hooks/useProjectOverview.ts components/v2/project/project-overview-v2.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/project-overview.ts lib/hooks/useProjectOverview.ts components/v2/project/project-overview-v2.tsx tests/lib/project-overview.test.ts tests/lib/hooks/useProjectOverview.test.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "refactor(overview): drop customRates from the project overview"
```

### Task 5: 支出清單 — drop the `customRates` argument

**Files:**
- Modify: `components/v2/expenses/expenses-v2.tsx`
- Test: `tests/components/v2/expenses-v2.test.tsx`

- [ ] **Step 1: Remove the argument**

In `components/v2/expenses/expenses-v2.tsx`: drop `customRates` from the `useProjectData` destructure and from the `useCurrencyConversion({ projectCurrency, customRates, precision })` call.

- [ ] **Step 2: Update the fixture**

In `tests/components/v2/expenses-v2.test.tsx`: remove `customRates: {}` from the mocked project values (lines ~214, ~348).

- [ ] **Step 3: Run the test + lint**

Run: `npx vitest run tests/components/v2/expenses-v2.test.tsx && npx eslint components/v2/expenses/expenses-v2.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/v2/expenses/expenses-v2.tsx tests/components/v2/expenses-v2.test.tsx
git commit -m "refactor(expenses): stop passing customRates to conversion"
```

### Task 6: AI 快速記帳 — drop the `customRates` prop

**Files:**
- Modify: `components/v2/quick-expense/quick-expense-v2.tsx`

- [ ] **Step 1: Remove the prop and its use**

In `components/v2/quick-expense/quick-expense-v2.tsx`: delete `customRates?: Record<string, number> | null` from the props interface, the `customRates = null` default in `QuickExpenseFlow`, and `customRates` from the `useCurrencyConversion({ projectCurrency, customRates, autoFetch: false })` call.

- [ ] **Step 2: Find remaining callers**

Run: `grep -rn "customRates" components/v2/quick-expense app`
Expected: no `customRates` passed into `QuickExpenseV2` remains. If a caller still passes it, remove that prop there.

- [ ] **Step 3: Run the quick-expense tests + lint**

Run: `npx vitest run tests/lib/quick-expense && npx eslint components/v2/quick-expense/quick-expense-v2.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/v2/quick-expense/quick-expense-v2.tsx
git commit -m "refactor(quick-expense): drop the customRates prop"
```

### Task 7: 專案設定 — remove the 固定匯率 section

**Files:**
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`
- Modify: `components/v2/project-settings/project-settings-v2.tsx`
- Delete: `components/v2/project-settings/fixed-rate-sheet.tsx`
- Modify: `lib/hooks/use-project-form.ts`
- Test: `tests/components/v2/project-settings-v2.test.tsx`, `tests/lib/hooks/use-project-form.test.ts`

**Interfaces:**
- Produces: `ProjectFormValues` loses `customRates: Record<string, string>`; `toUpdatePayload` no longer emits `customRates` (so the API leaves the DB column untouched — Review Focus #4).

- [ ] **Step 1: Update the form tests**

In `tests/lib/hooks/use-project-form.test.ts`: remove `customRates` from the `emptyProjectForm` expectation, delete the `自訂匯率需大於 0` validation case, and change the `toUpdatePayload` assertions to **omit** the `customRates` key entirely (assert `toUpdatePayload(f)` does not have property `customRates`, and that an empty form's payload also omits it).

- [ ] **Step 2: Confirm the tests fail**

Run: `npx vitest run tests/lib/hooks/use-project-form.test.ts`
Expected: FAIL — the payload still contains `customRates`.

- [ ] **Step 3: Remove `customRates` from the form model**

In `lib/hooks/use-project-form.ts`: delete `customRates` from `ProjectFormValues`, `emptyProjectForm`, the rate loop in `validateProjectForm`, and the `customRates` line in `toUpdatePayload` (returns `toCreatePayload(v)` only).

- [ ] **Step 4: Remove the settings UI**

In `components/v2/project-settings/project-settings-v2-view.tsx`: remove the «固定匯率（選填）» block and its `FixedRateSheet`, the `rateCurrencies`/`sheetOpen`/`sheetCurrency` state, the `rates` prop from `ProjectSettingsV2ViewProps`, the `FixedRateSheet` import, and now-unused imports (`ChevronRight`, `Plus`, `roundRateForDisplay`). Keep the 結算幣別 field and the 最小單位 line.
In `components/v2/project-settings/project-settings-v2.tsx`: remove `customRates` from `ProjectRecord`, `EMPTY_VALUES`, `mapProjectToForm`, the `rates` state + its `/api/exchange-rates` effect, and the `rates={rates}` prop.
Delete `components/v2/project-settings/fixed-rate-sheet.tsx`.

- [ ] **Step 5: Update the settings container tests**

In `tests/components/v2/project-settings-v2.test.tsx`: remove assertions about the 固定匯率 section, the `fixed-row-*` testids, and any `body.customRates` expectation. Add an assertion that saving does **not** include a `customRates` key in the PUT body (Review Focus #4). Keep a fixture project that still returns `customRates` in the API response and assert the screen renders normally (Review Focus #1).

- [ ] **Step 6: Run the tests + lint**

Run: `npx vitest run tests/lib/hooks/use-project-form.test.ts tests/components/v2/project-settings-v2.test.tsx && npx eslint lib/hooks/use-project-form.ts components/v2/project-settings/project-settings-v2.tsx components/v2/project-settings/project-settings-v2-view.tsx`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/use-project-form.ts components/v2/project-settings/project-settings-v2.tsx components/v2/project-settings/project-settings-v2-view.tsx tests/lib/hooks/use-project-form.test.ts tests/components/v2/project-settings-v2.test.tsx
git rm components/v2/project-settings/fixed-rate-sheet.tsx
git commit -m "refactor(settings): remove the project fixed-rate section"
```

### Task 8: `useProjectData` — drop `customRates` (and clean the last fixtures)

**Files:**
- Modify: `lib/hooks/useProjectData.ts`
- Test: `tests/lib/hooks/useProjectData.test.ts`, `tests/components/v2/expense-form-preview.test.tsx`, `tests/components/v2/export-v2.test.tsx`, `tests/lib/hooks/useProjectOverview.test.tsx`, `tests/components/v2/project-overview-v2.test.tsx`

**Interfaces:**
- Produces: `Project` loses `customRates`; `useProjectData` returns no `customRates`.

- [ ] **Step 1: Remove the field from the hook test**

In `tests/lib/hooks/useProjectData.test.ts`: delete the `describe("customRates")` block and drop `customRates: { USD: 30 }` from the mock project (line ~24).

- [ ] **Step 2: Confirm it fails**

Run: `npx vitest run tests/lib/hooks/useProjectData.test.ts`
Expected: FAIL — `result.current.customRates` no longer exists.

- [ ] **Step 3: Remove `customRates` from `useProjectData`**

In `lib/hooks/useProjectData.ts`: delete `customRates` from the `Project` interface, from `UseProjectDataReturn`, and the `customRates: project?.customRates || null` line in the returned object.

- [ ] **Step 4: Clean the remaining fixtures**

Remove `customRates: …` from the project fixtures in `tests/components/v2/expense-form-preview.test.tsx`, `tests/components/v2/export-v2.test.tsx`, `tests/lib/hooks/useProjectOverview.test.tsx`, and `tests/components/v2/project-overview-v2.test.tsx`.

- [ ] **Step 5: Grep for stragglers**

Run: `grep -rn "customRates" components/v2 lib tests --include=*.ts --include=*.tsx`
Expected: matches left only in `components/v1/**`, `app/api/**`, `lib/export/**` (V1/API — out of scope) and no `components/v2`/`lib/hooks` matches.

- [ ] **Step 6: Full suite + lint + types**

Run: `npm run test:run && npm run lint && npx tsc --noEmit`
Expected: test suite green except the two pre-existing external-API integration failures; lint 0 errors; no new TS errors in touched files.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useProjectData.ts tests/lib/hooks/useProjectData.test.ts tests/components/v2/expense-form-preview.test.tsx tests/components/v2/export-v2.test.tsx tests/lib/hooks/useProjectOverview.test.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "refactor(project-data): drop customRates from useProjectData"
```
