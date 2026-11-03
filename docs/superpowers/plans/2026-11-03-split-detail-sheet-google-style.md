# 分帳明細 Sheet 精煉（Google UX patterns + 品牌 skin）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `SplitDetailSheet` 的 **UX** 精煉成 Google/Material 的行為模式（list row、progressive disclosure、accordion、inline validation、focus、48dp），但**完整保留品牌 theme**（字體、色票、圓角、按鈕形狀、icons）。

**Architecture:** 先把「個人項目狀態」抽成純函式，再把 personal editor、share editor、section row 抽成三個 demo-only 元件；`SplitDetailSheet` 只負責 sheet shell、accordion state、cleanup、focus trap / return 與 footer。所有金額與 split 數學不動。

**Tech Stack:** Next.js 16、React 19、TypeScript、Tailwind v4、lucide-react、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-11-03-split-detail-sheet-google-style-design.md`

## Global Constraints

- Demo-only：只動 `app/demo/expense-prototype/**` 與 `tests/demo/**`；不改 API、DB、正式產品元件。
- **Brand skin 不可改**：品牌 serif/sans、lake/sand 色票、圓角、按鈕形狀、lucide icons 全部保留；不引入 Roboto/Noto Sans、Material color roles、28dp sheet、Material Symbols、ripple、Material filled field。
- 只借 UX：層級、spacing、hit area、狀態回饋、focus、validation、motion、aria。
- 不改 split 數學、金額格式、匯率或 `deriveSplit` 的輸出。
- UI copy 用繁體中文；程式碼註解用英文（`CLAUDE.md`）。
- 只用現有 `v2-*` tokens 與 lucide icons；不新增套件。
- 驗證契約：空白列 = placeholder、不擋 save；touched 未完成 = 擋 save；關閉時清空白列。
- 所有互動至少 44×44，主要 row / button 48dp；390 / 320 不得 horizontal overflow。
- 每個 task 完成後執行相關測試、`npx tsc --noEmit`、`npm run lint`，再 commit。
- 測試需 mock `next/font/google`（若渲染含 v2 字型的元件）。

## Review Focus

1. **空白列 vs touched 未完成**：空白列不能顯示錯誤或 disable 完成；只要 name/amount 有輸入就必須完整。Task 5 的 sheet / guardrail 測試要釘住。
2. **關閉路徑**：X、backdrop、Escape、完成都要清空白列並把 focus 還給 trigger；touched 未完成列要保留。Task 4 / 5。
3. **固定共同分攤 + 個人項目並存**：pin、auto helper、小計、列表 supporting text 必須一致。Task 3 / 5。
4. **刪到完全沒有品項**：summary 回到 `—`、小計回到共同分攤、不能留下空白列。Task 5。
5. **A11y / 320 寬度**：accordion `aria-expanded` / `aria-controls`、panel region、focus trap、48dp、320 不溢出。Task 4 / 6。

---

### Task 1: Personal item state helpers

**Files:**
- Create: `app/demo/expense-prototype/personal-item-state.ts`
- Test: `tests/demo/personal-item-state.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PersonalItemLike { name: string; amount: string }
  export function isTouchedItem(item: PersonalItemLike): boolean
  export function isCompleteItem(item: PersonalItemLike): boolean
  export function isIncompleteItem(item: PersonalItemLike): boolean
  export function countIncompleteItems(items: readonly PersonalItemLike[]): number
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/demo/personal-item-state.test.ts
import { describe, expect, it } from "vitest"
import { countIncompleteItems, isCompleteItem, isIncompleteItem, isTouchedItem } from "@/app/demo/expense-prototype/personal-item-state"

describe("personal item state", () => {
  it("treats an entirely blank row as untouched", () => {
    const item = { name: "", amount: "" }
    expect(isTouchedItem(item)).toBe(false)
    expect(isIncompleteItem(item)).toBe(false)
  })

  it("requires a non-empty name and an amount greater than zero", () => {
    expect(isCompleteItem({ name: "咖啡", amount: "120" })).toBe(true)
    expect(isCompleteItem({ name: "咖啡", amount: "0" })).toBe(false)
    expect(isCompleteItem({ name: " ", amount: "120" })).toBe(false)
  })

  it("flags name-only and amount-only rows as incomplete", () => {
    expect(isIncompleteItem({ name: "咖啡", amount: "" })).toBe(true)
    expect(isIncompleteItem({ name: "", amount: "120" })).toBe(true)
  })

  it("counts only touched incomplete rows", () => {
    expect(countIncompleteItems([
      { name: "", amount: "" },
      { name: "咖啡", amount: "" },
      { name: "午餐", amount: "240" },
    ])).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/demo/personal-item-state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `personal-item-state.ts`**

Implement the four functions. `isTouchedItem` is true when `name.trim() !== "" || amount.trim() !== ""`. `isCompleteItem` requires both and `Number(amount) > 0`. `isIncompleteItem` is touched && !complete. `countIncompleteItems` filters `isIncompleteItem`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/demo/personal-item-state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/demo/expense-prototype/personal-item-state.ts tests/demo/personal-item-state.test.ts
git commit -m "refactor(demo): extract personal item state helpers"
```

---

### Task 2: PersonalItemsEditor (brand inputs + UX behavior)

**Files:**
- Create: `app/demo/expense-prototype/split-detail/personal-items-editor.tsx`
- Test: `tests/demo/personal-items-editor.test.tsx`

**Interfaces:**
- Consumes: `isIncompleteItem` from Task 1; `sanitizeAmountInput`, `amountLimitNote` from `./guardrails`; `SplitDraftItem` from `@/lib/split-draft`.
- Produces:
  ```ts
  export function PersonalItemsEditor(props: {
    items: SplitDraftItem[]
    currency: string
    onAdd: () => void
    onName: (id: string, value: string) => void
    onAmount: (id: string, value: string) => void
    onRemove: (id: string) => void
    onLimitNote: (text: string | null) => void
  }): React.ReactElement
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// tests/demo/personal-items-editor.test.tsx
describe("PersonalItemsEditor", () => {
  it("shows the empty state and a single add action", () => {
    render(<PersonalItemsEditor items={[]} currency="JPY" onAdd={onAdd} ... />)
    expect(screen.getByText("尚未新增品項")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /新增品項/ }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it("does not mark a blank placeholder as an error", () => {
    render(<PersonalItemsEditor items={[blankItem]} ... />)
    expect(screen.queryByText(/請填寫/)).not.toBeInTheDocument()
    expect(screen.getByLabelText("品項名稱 1")).not.toHaveAttribute("aria-invalid", "true")
  })

  it("marks a name-only row as missing the amount", () => {
    render(<PersonalItemsEditor items={[{ id: "i1", name: "咖啡", amount: "" }]} ... />)
    expect(screen.getByText("請填寫金額")).toBeInTheDocument()
    expect(screen.getByLabelText("品項金額 1")).toHaveAttribute("aria-invalid", "true")
  })

  it("clears the error when the row becomes complete", () => {
    render(<PersonalItemsEditor items={[{ id: "i1", name: "咖啡", amount: "120" }]} ... />)
    expect(screen.queryByText(/請填寫/)).not.toBeInTheDocument()
  })
})
```

Also assert `onName`, `onAmount`, `onRemove` callbacks and that `onAmount` receives the sanitized value (`"12.3"` → `"12"` for JPY) and `onLimitNote` receives the limit text.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/demo/personal-items-editor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the editor**

Use the UX structure from the spec but the app's brand input class (`rounded-xl border border-v2-line bg-v2-surface`, existing focus ring), not Material filled fields. Add the empty-state row, single text-button add, per-field supporting text, 48dp delete icon, and `aria-invalid` / `aria-describedby`. Keep `maxLength={30}` on name. The editor sanitizes amount input and calls `onLimitNote`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/demo/personal-items-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/demo/expense-prototype/split-detail/personal-items-editor.tsx tests/demo/personal-items-editor.test.tsx
git commit -m "feat(demo): add Material-style personal items editor"
```

---

### Task 3: ShareAmountEditor (brand amount field + UX helper)

**Files:**
- Create: `app/demo/expense-prototype/split-detail/share-amount-editor.tsx`
- Test: `tests/demo/share-amount-editor.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function ShareAmountEditor(props: {
    currency: string
    value: string
    auto: number
    pinned: boolean
    onChange: (value: string) => void
    onReset: () => void
    autoFocus?: boolean
  }): React.ReactElement
  ```

- [ ] **Step 1: Write the failing test**

```tsx
describe("ShareAmountEditor", () => {
  it("shows the auto-split helper when not pinned", () => {
    render(<ShareAmountEditor currency="JPY" value="320" auto={320} pinned={false} onChange={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByText("自動平分會是 $320")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /還原自動平分/ })).not.toBeInTheDocument()
  })

  it("shows the pinned copy and reset action when pinned", () => {
    render(<ShareAmountEditor currency="JPY" value="500" auto={320} pinned onChange={vi.fn()} onReset={onReset} />)
    expect(screen.getByText(/目前是固定金額/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /還原自動平分/ }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it("sanitizes the input before onChange", () => {
    render(<ShareAmountEditor currency="JPY" value="320" auto={320} pinned={false} onChange={onChange} onReset={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/共同分攤金額/), { target: { value: "12.3" } })
    expect(onChange).toHaveBeenLastCalledWith("12")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/demo/share-amount-editor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the editor**

Keep the brand amount field (`$` prefix, brand font weight, tabular, right aligned), focus + select when `autoFocus`, pin icon when pinned, helper text, text-button reset. Do not convert it to a Material filled field. Limit note uses `amountLimitNote` and local state; expose it in the rendered supporting text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/demo/share-amount-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/demo/expense-prototype/split-detail/share-amount-editor.tsx tests/demo/share-amount-editor.test.tsx
git commit -m "feat(demo): add Material-style share amount editor"
```

---

### Task 4: SheetSectionRow + SplitDetailSheet shell (UX row, brand styling)

**Files:**
- Create: `app/demo/expense-prototype/split-detail/sheet-section-row.tsx`
- Modify: `app/demo/expense-prototype/split-detail-sheet.tsx`
- Test: `tests/demo/split-detail-sheet.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function SheetSectionRow(props: {
    id: string
    label: string
    value: React.ReactNode
    supporting?: string
    expanded: boolean
    onToggle: () => void
    children: React.ReactNode
  }): React.ReactElement
  ```
- `SplitDetailSheet` keeps its existing public props (`open`, `onClose`, `members`, `draft`, `memberId`) and imports the two editors from Tasks 2–3.

- [ ] **Step 1: Write the failing test**

```tsx
describe("SplitDetailSheet shell", () => {
  it("renders the collapsed summary", () => {
    render(<Harness />)
    expect(screen.getByRole("button", { name: /個人項目/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.getByText("$320")).toBeInTheDocument()
    expect(screen.queryByLabelText("品項名稱 1")).not.toBeInTheDocument()
  })

  it("expands one section at a time and exposes the panel region", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: /個人項目/ }))
    expect(screen.getByRole("button", { name: /個人項目/ })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("region", { name: "個人項目" })).toBeInTheDocument()
    expect(screen.getByText("尚未新增品項")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /共同分攤/ }))
    expect(screen.queryByRole("region", { name: "個人項目" })).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "共同分攤" })).toBeInTheDocument()
  })

  it("closes with Escape and returns focus to the trigger", () => {
    render(<Harness />)
    const trigger = screen.getByRole("button", { name: /^查看我/ })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })
})
```

Harness: use `useExpenseDraft` with `DEMO_MEMBERS`, JPY, 1280, four participants; render a trigger button plus the sheet when open. Add `data-testid="items"` output to inspect cleanup later.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/demo/split-detail-sheet.test.tsx`
Expected: FAIL — module/behavior missing.

- [ ] **Step 3: Implement `SheetSectionRow` and rebuild the sheet shell**

Brand-styled list row with Material **behavior**: 56dp min, brand headline / supporting text / trailing value / lucide `ChevronDown` (rotate 180 when open), `aria-expanded`, `aria-controls`, panel `role="region"` + `aria-labelledby`. Do not change the brand typography, colors, radii or button shapes. Use the extracted editors. Add focus trap, Escape, focus return to the element that was active when the sheet opened. Keep the existing summary/footer behavior wired to `hasInvalidItems` for now.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/demo/split-detail-sheet.test.tsx`
Expected: PASS (shell tests).

- [ ] **Step 5: Commit**

```bash
git add app/demo/expense-prototype/split-detail/sheet-section-row.tsx app/demo/expense-prototype/split-detail-sheet.tsx tests/demo/split-detail-sheet.test.tsx
git commit -m "refactor(demo): rebuild split detail sheet with Material section rows"
```

---

### Task 5: Validation, cleanup, and standalone-sheet consistency

**Files:**
- Modify: `app/demo/expense-prototype/split-detail-sheet.tsx`
- Modify: `app/demo/expense-prototype/guardrails.ts`
- Modify: `app/demo/expense-prototype/personal-items-sheet.tsx`
- Test: `tests/demo/split-detail-sheet.test.tsx`
- Test: `tests/demo/split-guardrails.test.ts`

**Interfaces:**
- Consumes: `isIncompleteItem`, `countIncompleteItems` from Task 1.
- `describeSplitIssue` keeps its signature; only the incomplete-item branch changes to touched-only.
- `PersonalItemsSheet` keeps its public props; body renders `PersonalItemsEditor`.

- [ ] **Step 1: Add failing tests**

```tsx
it("keeps 完成 enabled for a blank placeholder and removes it on close", () => {
  // open personal, click 新增品項, assert no 請填寫, assert 完成 enabled
  // click 完成, assert the items output is "{}"
})

it("disables 完成 for a touched incomplete row and keeps it after close", () => {
  // add item, type name only, expect 請填寫金額 + 完成 disabled
  // click X, assert the item remains (parent will block)
})
```

```ts
// tests/demo/split-guardrails.test.ts
it("ignores blank placeholder items", () => { ... expect(describeSplitIssue(blankDraft, members)).toBeNull() })
it("reports the first touched incomplete item", () => { ... expect(...).toContain("尚未填寫完整") })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- tests/demo/split-detail-sheet.test.tsx tests/demo/split-guardrails.test.ts`
Expected: new cases FAIL.

- [ ] **Step 3: Implement**

Use `isIncompleteItem` / `countIncompleteItems` in the sheet and `describeSplitIssue`. On every close path (X, backdrop, Escape, 完成) remove untouched rows; keep touched incomplete. Footer shows `個人項目尚未填完` and disables 完成 only for touched incomplete. Reuse `PersonalItemsEditor` inside `PersonalItemsSheet` and keep its close cleanup. Do not change the amount math.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- tests/demo/split-detail-sheet.test.tsx tests/demo/split-guardrails.test.ts tests/demo/personal-item-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/demo/expense-prototype/split-detail-sheet.tsx app/demo/expense-prototype/guardrails.ts app/demo/expense-prototype/personal-items-sheet.tsx tests/demo/split-detail-sheet.test.tsx tests/demo/split-guardrails.test.ts
git commit -m "fix(demo): unify split detail validation and cleanup"
```

---

### Task 6: Visual QA and detector

**Files:**
- No production files; fix only what QA reveals. Do not turn the component into a Material visual clone.

- [ ] **Step 1: Run the full relevant suite**

Run:
```bash
npm run test:run -- tests/demo/personal-item-state.test.ts tests/demo/personal-items-editor.test.tsx tests/demo/share-amount-editor.test.tsx tests/demo/split-detail-sheet.test.tsx tests/demo/split-guardrails.test.ts
npx tsc --noEmit
npm run lint
```
Expected: all pass; tsc has no demo errors; lint clean.

- [ ] **Step 2: Run the Impeccable detector**

Run:
```bash
.opencode/skills/impeccable/scripts/impeccable detect --json app/demo/expense-prototype/split-detail-sheet.tsx app/demo/expense-prototype/split-detail/personal-items-editor.tsx app/demo/expense-prototype/split-detail/share-amount-editor.tsx app/demo/expense-prototype/split-detail/sheet-section-row.tsx
```
Expected: `[]`.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/demo/expense-prototype?mode=platform`. At 390 and 320:
- No horizontal overflow.
- Section rows ≥56dp; close/add/reset ≥48dp.
- Expand personal → empty state / blank row / touched error / complete.
- Expand share → auto helper / pinned helper / reset.
- Tab stays inside the sheet; Escape closes; focus returns to the row.
- `prefers-reduced-motion` removes expand animation.
- Brand check: serif title, lake/sand colors, existing button shapes and lucide icons are still there; no Material filled-field / Symbol / ripple visual.

- [ ] **Step 4: Commit any QA fixes**

```bash
git add app/demo/expense-prototype tests/demo
git commit -m "chore(demo): polish split detail sheet"
```

---

## Self-Review

- Spec coverage: shell / rows / personal editor / share editor / validation / a11y / list supporting text all mapped to Tasks 1–6.
- Every task ends with a test cycle and a commit.
- Names match across tasks: `isIncompleteItem`, `PersonalItemsEditor`, `ShareAmountEditor`, `SheetSectionRow`, `SplitDetailSheet`.
- Review Focus items are pinned by Task 4 / 5 / 6 tests.
- No production code, API, DB, or split-math changes are in scope.
