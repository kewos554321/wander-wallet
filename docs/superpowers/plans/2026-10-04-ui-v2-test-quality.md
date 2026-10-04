# UI v2 Test Quality Remediation — Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Make `tests/components/v2/**` behavior-focused, deterministic, and isolated, while keeping every `components/v2/**` folder Lines ≥ 90%.

**Tech Stack:** Vitest + Testing Library; `@vitest/coverage-v8`. Work in `/Users/kewos/Documents/projects/wander-wallet` on branch `main`.

**Spec:** `docs/superpowers/specs/2026-10-04-ui-v2-test-quality-design.md`

## Global Constraints

- Only `tests/components/v2/**` and `tests/setup.ts`; minimal behavior-preserving `components/v2/**` edits only if a stable accessible hook is required (document).
- Never touch `components/v1/**`, `components/ui/**`, `app/api/**`, `prisma/**`, `lib/**`.
- Every changed test file must be strictly better: more behavior/ARIA assertions, fewer brittle class/structure assertions, restored globals, deterministic time.
- Must keep every `components/v2/**` folder Lines ≥ 90% under `npm run test:coverage`.
- No commit by implementers; the controller commits once after verification.

## Review Focus
1. Locale/time determinism (calendar, debounce).
2. Real integration not mocked away (delete dialog / notify).
3. Global/prototype state restored; no order dependence.
4. Assertions carry an independent oracle (not constants-against-themselves, not prop echoes).

---

### Task A: Shared `ResizeObserver` + fix locale-dependent calendar test

**Files:** `tests/setup.ts`, `tests/components/v2/new-project-v2.test.tsx`, `tests/components/v2/date-range-field.test.tsx`, `tests/components/v2/project-settings-v2.test.tsx`, `tests/components/expense-form.test.tsx` (only if it has the same stub).

- [ ] In `tests/setup.ts`, define a **constructable** `ResizeObserver` stub (class with `observe`/`unobserve`/`disconnect`), replacing the bare `vi.fn()`.
- [ ] Remove the per-file `ResizeObserver` copies/reassignments in the four files above.
- [ ] Rewrite `new-project-v2.test.tsx:120-139` to be deterministic: mock `@/components/ui/calendar` (as `date-range-field.test.tsx` does) and drive `onSelect` with fixed `Date`s; assert the exact rendered range `2026/11/12 – 2026/11/16` and day count (no `data-day`, no grid-index).
- [ ] Verify: `LANG=en_US.UTF-8 npx vitest run tests/components/v2/new-project-v2.test.tsx tests/components/v2/date-range-field.test.tsx tests/components/v2/project-settings-v2.test.tsx` → PASS; folder coverage still ≥90.

### Task B: De-brittle class-only tests (part 1)

**Files:** `tests/components/v2/category-picker.test.tsx`, `amount-card.test.tsx`, `expense-form-v2-view.test.tsx`, `filter-panels.test.tsx`.

- [ ] For each file, delete/replace pure `toHaveClass("bg-v2-…"/"rounded-…"/"text-…")` assertions with behavior: `aria-pressed`/`aria-checked` state, callback args, visible text, `role`-based queries.
- [ ] Keep at most a *small*, intentional set of design-token assertions if they guard a real contract — otherwise remove.
- [ ] Strengthen weak assertions: assert `onSubmit` payload in `expense-form-v2-view.test.tsx` (like `expense-form-v2.test.tsx` does).
- [ ] Verify folder `components/v2/expense-form` and `components/v2/expenses` Lines ≥ 90.

### Task C: De-brittle class-only tests + dialog hygiene (part 2)

**Files:** `tests/components/v2/settle-v2.test.tsx`, `stats-v2.test.tsx`, `settle-dialogs.test.tsx`, `join-mode-picker.test.tsx`, `v2-currency-field.test.tsx`, `v2-top-bar.test.tsx`, `project-overview-v2.test.tsx`, `projects-v2-view.test.tsx`.

- [ ] Replace class-string/structural queries (`closest("div.rounded-2xl")`, `selector:"span.font-medium"`, `.lucide-*`, `.px-3`) with `role`/`aria-*`/`data-testid`-on-container queries (add a stable `aria-label`/`data-testid` to the component only if needed — behavior-preserving).
- [ ] `settle-dialogs.test.tsx`: restore the original `navigator.clipboard` after each test; remove the `readFileSync` source-text assertion (replace with a behavior assertion or drop).
- [ ] Verify folders `settle`, `stats`, `project`, `projects` Lines ≥ 90.

### Task D: Real integration + global-leak fixes

**Files:** `tests/components/v2/expenses-v2.test.tsx`, `tests/components/v2/quick-expense/quick-expense-v2.test.tsx`, `quick-input-step.test.tsx`, `tests/components/v2/location-picker-v2.test.tsx`, `tests/components/v2/swipe-row.test.tsx`.

- [ ] `expenses-v2.test.tsx`: stop stubbing `ConfirmDeleteDialog`/`NotifyLineCheckbox`; use the real ones. Assert that confirming deletion calls `deleteExpense(id, { notifyLine })` for both notify states, and that cancel does not delete.
- [ ] Restore globals: `URL.createObjectURL` (quick-expense-v2), `fetch`/`GeolocationPositionError` (location-picker-v2), `PointerEvent` (swipe-row) via `vi.unstubAllGlobals()`/`afterEach`.
- [ ] `quick-input-step.test.tsx`: replace module-level `emit` with a `vi.hoisted` ref reset in `beforeEach`.
- [ ] `location-picker-v2.test.tsx`: use `vi.useFakeTimers()` + `advanceTimersByTime` for the 500ms debounce (no real sleep).
- [ ] Verify folder `expenses` and `quick-expense` Lines ≥ 90.

---

## Final Verification
- [ ] `npm run test:coverage` → all `components/v2/**` folders Lines ≥ 90%.
- [ ] `npm run test:run` → exit 0.
- [ ] `LANG=en_US.UTF-8` run of the calendar test → green.
- [ ] v1/shared guard for this change set is empty.
- [ ] Commit (controller), then remove the worktree + `feat/ui-v2-m6`.
