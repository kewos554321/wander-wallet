# Expense Form Platform Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the real add/edit expense form use the approved platform layout, shared with the demo, without changing the save payload or split math.

**Architecture:** Move the demo's platform components into `components/v2/expense-form/`, add the prod-only behaviors (LINE notify, image URL lifecycle, delete), and make `ExpenseFormV2View` a thin wrapper around `ExpenseFormPlatformView` with `variant="platform"`. Freeze the current prod view as a demo-only legacy snapshot so 改前 still renders.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v2 tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-04-expense-form-platform-port-design.md`

## Global Constraints

- Prod renders `variant="platform"` only; the ledger variant stays for the demo's 改後.
- Do not change `useExpenseDraft`, API routes, DB schema, or the save payload shape.
- Preserve `canNotifyLine`, image `pendingDeleteUrl` semantics, edit delete, rate sheet, and currency preview.
- Description is now required: whitespace-only blocks submit.
- All copy stays zh-TW; reuse existing v2 tokens and lucide icons.
- Every task ends with `npm run test:run` for its touched suites and a commit.
- Final gate: full `npm run test:run`, `npx tsc --noEmit`, `npx eslint`, `impeccable detect`, and a manual demo pass.

## Review Focus

- Editing an expense with an empty description now blocks save; the error must be visible next to the field and in the footer path.
- The LINE notify checkbox must survive the port on both create and edit.
- Replacing or removing an image must revoke the old object URL exactly once and keep `pendingDeleteUrl` behavior in the wrapper.
- Fixed shares must still reach the payload as `splitDetail.customShares` after the UI swap.
- The demo's 改前 must keep rendering the old form after its implementation becomes a frozen snapshot.

---

## File Structure

Create/move into `components/v2/expense-form/`:

- `split-panel.tsx` — payer + split lists, both variants.
- `split-detail-sheet.tsx` — platform member sheet.
- `split-detail/personal-items-editor.tsx`
- `split-detail/share-amount-editor.tsx`
- `split-detail/sheet-section-row.tsx`
- `split-guardrails.ts` — renamed from demo `guardrails.ts`.
- `personal-item-state.ts`
- `amount-sheet.tsx`, `personal-items-sheet.tsx` — ledger demo only, moved for shared imports.
- `expense-form-platform-view.tsx` — moved from demo `expense-form-after-view.tsx`, plus prod behaviors.

Modify:

- `components/v2/expense-form/expense-form-v2-view.tsx` — thin wrapper, `variant="platform"`.
- `app/demo/expense-prototype/page.tsx` — before → legacy, after/platform → platform view.

Create for demo:

- `app/demo/expense-prototype/expense-form-legacy-view.tsx` — frozen copy of the current prod view.

Tests:

- Move `tests/demo/{split-detail-sheet,personal-items-editor,share-amount-editor,personal-items-sheet}.test.tsx`, `tests/demo/{split-guardrails,personal-item-state}.test.ts` → `tests/components/v2/expense-form/`.
- Move `tests/components/v2/expense-form-v2-view.test.tsx` → `tests/demo/expense-form-legacy-view.test.tsx` (targets the frozen old view).
- New `tests/components/v2/expense-form-platform-view.test.tsx`.
- New `tests/components/v2/expense-form-v2-view.test.tsx` (thin wrapper smoke).

---

### Task 1: Move shared split components and their tests

**Files:**
- Move: `app/demo/expense-prototype/{split-panel,split-detail-sheet,amount-sheet,personal-items-sheet}.tsx`, `app/demo/expense-prototype/guardrails.ts`, `app/demo/expense-prototype/personal-item-state.ts`, `app/demo/expense-prototype/split-detail/*`
- Modify imports in: moved files, `app/demo/expense-prototype/expense-form-after-view.tsx`, `tests/demo/*`
- Tests: moved unit tests

**Interfaces:**
- Produces: `SplitPanel` from `components/v2/expense-form/split-panel`, `SplitDetailSheet`, `describeSplitIssue` from `split-guardrails`, `personal-item-state` helpers.
- Consumed later by: `ExpenseFormPlatformView` (Task 2).

- [ ] **Step 1: `git mv` the components**

```bash
cd components/v2/expense-form
git mv ../../../app/demo/expense-prototype/split-panel.tsx .
git mv ../../../app/demo/expense-prototype/split-detail-sheet.tsx .
git mv ../../../app/demo/expense-prototype/amount-sheet.tsx .
git mv ../../../app/demo/expense-prototype/personal-items-sheet.tsx .
git mv ../../../app/demo/expense-prototype/personal-item-state.ts .
git mv ../../../app/demo/expense-prototype/guardrails.ts ./split-guardrails.ts
mkdir -p split-detail
git mv ../../../app/demo/expense-prototype/split-detail/* split-detail/
```

- [ ] **Step 2: Update imports**

- In moved files: `./guardrails` → `./split-guardrails`; `./split-detail/...` stays; `./personal-item-state` stays.
- In `app/demo/expense-prototype/expense-form-after-view.tsx`: `./split-panel` → `@/components/v2/expense-form/split-panel`; `./guardrails` → `@/components/v2/expense-form/split-guardrails`.
- Move and update tests:
  - `tests/demo/split-detail-sheet.test.tsx` → `tests/components/v2/expense-form/split-detail-sheet.test.tsx`
  - same for `personal-items-editor`, `share-amount-editor`, `personal-items-sheet`, `split-guardrails`, `personal-item-state`.
  - Replace `@/app/demo/expense-prototype/...` with `@/components/v2/expense-form/...`.

- [ ] **Step 3: Verify**

Run: `npm run test:run -- tests/components/v2/expense-form` and `npx tsc --noEmit --pretty false`
Expected: all moved tests pass; no new type errors.

- [ ] **Step 4: Commit**

```bash
git add components/v2/expense-form app/demo/expense-prototype tests
git commit -m "refactor(expense): move platform split components into v2"
```

---

### Task 2: Add `ExpenseFormPlatformView` with prod behaviors

**Files:**
- Move: `app/demo/expense-prototype/expense-form-after-view.tsx` → `components/v2/expense-form/expense-form-platform-view.tsx`
- Create: `tests/components/v2/expense-form-platform-view.test.tsx`

**Interfaces:**
- Consumes: `SplitPanel` (Task 1), `describeSplitIssue`/amount helpers (Task 1), `useImageSource`, `AmountCard`, `CategoryPicker`, `LocationPickerV2` (`variant="row"`), `RateSheet`, `V2TopBar`.
- Produces: `ExpenseFormPlatformView(props: ExpenseFormPlatformViewProps)`, where the props are the current `ExpenseFormAfterViewProps` renamed, plus `variant?: "ledger" | "platform"`.

- [ ] **Step 1: Move, rename and repoint the demo**

Move the file with `git mv`. Rename the export/type to `ExpenseFormPlatformView` / `ExpenseFormPlatformViewProps`; keep the `variant` prop and default it to `"platform"`. Update `app/demo/expense-prototype/page.tsx` to import the moved component for `after`/`platform` in the same step, so the demo stays green.

- [ ] **Step 2: Add prod-only behaviors**

- Render the `通知 LINE 群組` checkbox when `props.canNotifyLine` (copy the JSX from the legacy view; create copy: `儲存後自動發送通知到群組`, edit copy: `變更後自動發送通知到群組`).
- Use `Trash2` for the edit delete action (aria-label `刪除此筆`).
- Image handlers must call `URL.revokeObjectURL(state.image.preview)` before replacing/removing, matching the legacy view.
- Keep the measured footer spacer and the footer error split (`amountIssue ?? submitError` only).

- [ ] **Step 3: Write the failing view tests**

Create `tests/components/v2/expense-form-platform-view.test.tsx` using `useExpenseDraft` like the legacy tests. Cover:

```tsx
it("renders the platform payer and split lists")            // 誰付這筆 / 誰一起分 + member rows
it("requires a description before submit")                   // empty description → 請填寫描述 + disabled
it("sends description, shares and splitDetail on submit")    // submit payload snapshot
it("rejects an over-limit amount")                           // amountIssue + disabled
it("opens a member sheet and pins a fixed share")            // 查看我… → 分攤金額 input → 完成
it("keeps personal items blank until touched")               // 個人項目 row, blank placeholder ignored
it("shows the LINE notify toggle only when enabled")         // canNotifyLine true/false + create/edit copy
it("revokes the previous preview URL when replacing an image") // spy on URL.revokeObjectURL
it("shows the edit delete action")                           // onRequestDelete called
it("shows the server error and submitting state")             // submitError / 儲存中...
```

- [ ] **Step 4: Run to verify the new tests fail for the missing behaviors, then implement and rerun**

Run: `npm run test:run -- tests/components/v2/expense-form-platform-view.test.tsx`
Expected: fail before behaviors exist; all pass after.

- [ ] **Step 5: Commit**

```bash
git add components/v2/expense-form/expense-form-platform-view.tsx tests/components/v2/expense-form-platform-view.test.tsx
git commit -m "feat(expense): add platform view with prod behaviors"
```

---

### Task 3: Freeze the legacy view and wire prod + demo

**Files:**
- Create: `app/demo/expense-prototype/expense-form-legacy-view.tsx`
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx`
- Modify: `app/demo/expense-prototype/page.tsx`
- Move/Modify test: `tests/components/v2/expense-form-v2-view.test.tsx` → `tests/demo/expense-form-legacy-view.test.tsx`
- Create: `tests/components/v2/expense-form-v2-view.test.tsx` (wrapper smoke)

**Interfaces:**
- `ExpenseFormV2View` keeps its current props and returns `<ExpenseFormPlatformView {...props} variant="platform" />`.
- `ExpenseFormLegacyView` is the frozen old implementation.

- [ ] **Step 1: Copy the current view to demo before editing it**

```bash
cp components/v2/expense-form/expense-form-v2-view.tsx app/demo/expense-prototype/expense-form-legacy-view.tsx
```

Rename `ExpenseFormV2View` → `ExpenseFormLegacyView`, `ExpenseFormV2ViewProps` → `ExpenseFormLegacyViewProps`, and rewrite relative imports to `@/components/v2/expense-form/...` (location picker, image picker, section card, amount card, calculator, category, payer picker, split editor, rate sheet, use-expense-draft).

- [ ] **Step 2: Move the old view tests to the legacy component**

```bash
git mv tests/components/v2/expense-form-v2-view.test.tsx tests/demo/expense-form-legacy-view.test.tsx
```

Update the import and component name to the legacy view. All 67 existing assertions should keep passing unchanged.

- [ ] **Step 3: Make `ExpenseFormV2View` a thin wrapper**

```tsx
import { ExpenseFormPlatformView, type ExpenseFormPlatformViewProps } from "./expense-form-platform-view"

export type ExpenseFormV2ViewProps = Omit<ExpenseFormPlatformViewProps, "variant">
export function ExpenseFormV2View(props: ExpenseFormV2ViewProps) {
  return <ExpenseFormPlatformView {...props} variant="platform" />
}
```

- [ ] **Step 4: Update the demo page**

- `before` → `ExpenseFormLegacyView`
- `after/platform` → `ExpenseFormPlatformView` with `variant={mode === "platform" ? "platform" : "ledger"}` (already repointed in Task 2).
- Confirm `app/demo/expense-prototype/expense-form-after-view.tsx` is gone (it was moved in Task 2).

- [ ] **Step 5: Write the wrapper smoke test**

`tests/components/v2/expense-form-v2-view.test.tsx`:

```tsx
it("renders the platform list layout")        // 誰付這筆 + 誰一起分
it("keeps the create submit label")            // 新增支出 · …
it("forwards canNotifyLine")                   // checkbox present
```

- [ ] **Step 6: Verify and commit**

Run: `npm run test:run -- tests/demo/expense-form-legacy-view.test.tsx tests/components/v2/expense-form-v2-view.test.tsx tests/demo/expense-prototype*`
Expected: legacy suite green, wrapper smoke green.

```bash
git add app/demo components/v2 tests
git commit -m "feat(expense): use the platform view for the real form"
```

---

### Task 4: Full behavior coverage and cleanup

**Files:**
- Test: `tests/components/v2/expense-form-platform-view.test.tsx`
- Cleanup: unused demo imports/files

- [ ] **Step 1: Add the payload/regression tests**

Ensure the platform view suite asserts:

- `splitDetail.customShares` is present for a fixed member.
- `personalItems` survives when the sheet closes.
- LINE `notifyLine` is in the submitted state (the view only renders; the wrapper owns the payload, so assert the checkbox state/actions).
- `URL.revokeObjectURL` is called once on replace and once on remove.
- Empty-description submit is blocked and the message is visible.

- [ ] **Step 2: Run the full suite**

Run: `npm run test:run`
Expected: all suites pass; legacy 67 still green.

- [ ] **Step 3: Run static checks**

Run: `npx tsc --noEmit --pretty false`, `npx eslint <changed files>`, `.opencode/skills/impeccable/scripts/impeccable detect --json <changed files>`
Expected: clean.

- [ ] **Step 4: Manual pass**

- Demo: `?mode=platform&v=<new>`; create, open a member sheet, add a personal item, set a fixed share, attach a receipt, switch currency, save is disabled until description is filled.
- Real prod: open create + edit; verify LINE checkbox, delete, image replace/remove, save.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(expense): cover the platform form and prod behaviors"
```

---

### Task 5: Whole-branch review and final verification

- [ ] **Step 1: Fresh reviewer**

Dispatch a fresh reviewer (most capable available model) with the spec and the branch diff. Ask for: behavior regressions, lost prod features, test gaps, and any demo-only code leaking into prod.

- [ ] **Step 2: Fix findings and rerun**

Address findings, rerun full suite + tsc + eslint + detector.

- [ ] **Step 3: Final commit**

Commit any review fixes with a focused message.
