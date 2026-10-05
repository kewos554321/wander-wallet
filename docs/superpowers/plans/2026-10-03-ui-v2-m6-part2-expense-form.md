# UI v2 里程碑 6 — Part 2：A3b / A3d 新增支出（expense-form）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 執行者若是 opencode：照字面逐步執行，不要自行重構、不要合併 task、不要跳過測試。

**Goal:** 把 v2「新增支出」表單對齊 `design/project-v20261003/AddExpense-ngs7-sections.dc.html`（A3d，權威）；A3b `AddExpense-section-demo.dc.html` 只多要求單一付款人列。

**Architecture:** 只改 `components/v2/expense-form/**`。新增 `section-card.tsx`（共用卡片 class 常數）與 `location-picker-v2.tsx`（複製 v1 邏輯、v2 樣式）。共用 `ImagePicker`（`components/ui/image-picker.tsx`）原封不動（master D18）。`use-expense-draft.ts`、`expense-form-v2.tsx` 不動，儲存 payload 不變。

**Tech Stack:** Next.js 16 + React 19 + TypeScript 5 + Tailwind v4 + Vitest（jsdom, v8 coverage）+ Testing Library。

**Spec / 差異報告:**
- `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-design.md`（決策 D1–D26；特別是 D12 單一付款人、D17 金額格式、D18 ImagePicker、D25 付款人摘要）
- `docs/superpowers/plans/2026-10-03-ui-v2-milestone-6.md`（Global Constraints、Task 5 驗證）
- `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a3.md`（逐元素 file:line）
- 設計稿：`design/project-v20261003/AddExpense-ngs7-sections.dc.html`（A3d）、`AddExpense-section-demo.dc.html`（A3b）
- **本文件與 spec 衝突時以 spec 為準；spec 與差異報告衝突時以 spec 為準。**

---

## 前提（Part 0 已完成，本 Part 不重做）

本 Part 假設 `feat/ui-v2-m6` 分支已建立，且總計畫的 Part 0 已完成並 commit：

- `app/globals.css` 已新增 milestone 6 tokens（`lake-edge`、`danger-*`）與 `.v2-scroll`。
- `components/v2/layout/v2-top-bar.tsx` 已支援 `titleClassName`。
- 本 Part **不新增任何 token**、**不碰 `app/globals.css`**。

## Global Constraints（每個 task 都適用）

1. 基準 commit：`36633e1`。工作分支：`feat/ui-v2-m6`。
2. **只能改**：`components/v2/**`、`tests/**`、`docs/**`。**本 Part 不新增 token、不動 `app/globals.css`**。
3. **絕對不能改**：`components/v1/**`、`components/ui/**`（含 `components/ui/image-picker.tsx`）、`components/expense/**`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/hooks/useExpenseFilters.ts`、`lib/expense-split.ts`、`lib/project-overview.ts`、`lib/trip.ts`、`tests/components/v1/**`。
4. `components/v2/**` 內禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts` 會掃）。只能用 token class；`border-[1.5px]`、`rounded-[14px]` 這類非顏色任意值是允許的。
5. 不新增 API、不改 Prisma。多位付款人只做單一付款人 UI 呈現（D12）。
6. 每個 task：先寫測試 → 看到失敗 → 實作 → 看到通過 → `npm run lint` → commit。commit 訊息英文、一行、`feat:` / `fix:` / `test:` / `refactor:` / `chore:` 開頭。
7. 不要 `git push`、不要 `git commit --amend`、不要 `--no-verify`。
8. 測試失敗而不知原因：停止並回報錯誤全文，不要刪測試、不要 `.skip`、不要放寬斷言。
9. v1 保護驗證（任何時候都可跑，輸出必須為空）：
   ```bash
   git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
   ```

## STOP conditions（若遇到就停止並回報，不要自行改）

- 任何步驟若看起來必須改 `components/location-picker.tsx`、`components/ui/image-picker.tsx` 或其他受保護檔案 → **STOP and report to user**。
- 差異報告 §1.5 提到的 image-card 設計外框需要改共用 `ImagePicker`；依 D18 **不改**，只把樣式差異記在報告。

## Review Focus（總計畫條目對本 Part 的相關性）

總計畫 Review Focus 的 5 條特殊輸入（舊封面 red、A6b 缺資料、A13 50 字、篩選面板、A2 空資料）**都不是 A3 專屬**；本 Part 只需遵守：

- **Global Constraint 6（嚴格 TDD）+ 7（commit）+ 9（v1 驗證）**。
- **coverage §6**：`components/v2/expense-form` Lines% 不得低於 baseline（`coverage-baseline.txt` 為 **89.53%**）；本 Part 新增檔案 Lines% ≥ 90% 且需補測試（`section-card.tsx`、`location-picker-v2.tsx`）。
- 本 Part 額外要測的邊界：location picker 的 geocode 失敗／定位失敗／清除；付款人單一列；未選 pill 的 `opacity-50`；`$` 前綴。
- **已知共用影響（記錄，不阻擋）**：`memberPillClass` 的第 4 個消費者是 `components/v2/quick-expense/quick-item-card.tsx:16`，加上 `opacity-50` 會一起變；`CategoryPicker` 也被 `quick-item-card.tsx` 使用，包成卡片會一起變。兩者皆為同一設計語言，接受並記錄。

## 檔案清單

| 動作 | 檔案 |
|---|---|
| Create | `components/v2/expense-form/section-card.tsx` |
| Create | `components/v2/expense-form/location-picker-v2.tsx` |
| Create | `tests/components/v2/section-card.test.tsx` |
| Create | `tests/components/v2/location-picker-v2.test.tsx` |
| Modify | `components/v2/expense-form/amount-card.tsx` |
| Modify | `components/v2/expense-form/category-picker.tsx` |
| Modify | `components/v2/expense-form/payer-picker.tsx` |
| Modify | `components/v2/expense-form/split-editor.tsx` |
| Modify | `components/v2/expense-form/split-summary.tsx` |
| Modify | `components/v2/expense-form/expense-form-v2-view.tsx` |
| Modify | `tests/components/v2/expense-form-v2-view.test.tsx` |
| Modify | `tests/components/v2/expense-form-v2.test.tsx` |

**不得修改**：`components/location-picker.tsx`、`components/ui/image-picker.tsx`、`components/expense/**`、`tests/components/location-picker.test.tsx`、`tests/components/image-picker.test.tsx`、`tests/components/expense-form*.test.tsx`（v1 測試必須保持原樣且綠）。

---

## Task 2.1：`section-card` 常數 + 各區塊卡片外框 / 標題 / icon / 背景

**對應差異報告：** §1.1（section card wrapper + titles）、§1.5 描述/日期輸入背景、image/date icon 尺寸。涵蓋 A3d 的「描述、類別、支出日期、消費地點、收據圖片」卡片外框，以及金額卡標題。

**Files:**
- Create: `tests/components/v2/section-card.test.tsx`
- Create: `components/v2/expense-form/section-card.tsx`
- Modify: `components/v2/expense-form/amount-card.tsx`
- Modify: `components/v2/expense-form/category-picker.tsx`
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx`

- [ ] **Step 1：寫失敗的測試（完整檔案）**

建立 `tests/components/v2/section-card.test.tsx`：

```tsx
import { describe, it, expect } from "vitest"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"

describe("expense form section card classes", () => {
  it("provides the shared card wrapper", () => {
    expect(SECTION_CARD).toContain("rounded-2xl")
    expect(SECTION_CARD).toContain("border-v2-line")
    expect(SECTION_CARD).toContain("bg-v2-surface")
    expect(SECTION_CARD).toContain("mx-4")
    expect(SECTION_CARD).toContain("mb-4")
    expect(SECTION_CARD).toContain("p-4")
  })

  it("provides the shared lake section title", () => {
    expect(SECTION_TITLE).toBe("text-[13px] font-bold text-v2-lake")
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/section-card.test.ts`
Expected: FAIL（`Failed to resolve import "@/components/v2/expense-form/section-card"`）。

- [ ] **Step 3：建立 `components/v2/expense-form/section-card.tsx`（完整檔案）**

```tsx
// Shared card wrapper and title for the v2 expense form sections.
export const SECTION_CARD = "mx-4 mb-4 rounded-2xl border border-v2-line bg-v2-surface p-4"
export const SECTION_TITLE = "text-[13px] font-bold text-v2-lake"
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/section-card.test.ts`
Expected: PASS（2 tests）。

- [ ] **Step 5：改 `components/v2/expense-form/amount-card.tsx`**

(a) 在 `import type { CurrencyCode } from "@/lib/constants/currencies"` 之後新增：

```tsx
import { SECTION_TITLE } from "./section-card"
```

(b) 把金額卡標題改成 13px/700 lake：

Old:
```tsx
        <label htmlFor="v2-amount" className="text-sm font-medium leading-5 tracking-[.1px]">
```
New:
```tsx
        <label htmlFor="v2-amount" className={SECTION_TITLE}>
```

- [ ] **Step 6：改 `components/v2/expense-form/category-picker.tsx`**

整個檔案替換為：

```tsx
import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { CATEGORY_TONES } from "@/components/v2/category-style"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"

export function CategoryPicker({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className={SECTION_CARD}>
      <p className={`mb-1.5 ${SECTION_TITLE}`}>類別</p>
      <div className="grid grid-cols-4 gap-1.5">
        {EXPENSE_CATEGORIES.map((key) => {
          const Icon = CATEGORY_ICONS[key]
          const active = value === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : key)}
              className={`flex items-center justify-center gap-[5px] rounded-[14px] px-1 py-2 text-xs ${
                active
                  ? "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft font-bold text-v2-lake"
                  : `border-[1.5px] border-v2-line font-semibold ${CATEGORY_TONES[key]}`
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {CATEGORY_LABELS[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

> 註：`CategoryPicker` 也被 `components/v2/quick-expense/quick-item-card.tsx` 使用，包成卡片會一起生效；同一設計語言，接受並記入最終報告。

- [ ] **Step 7：改 `components/v2/expense-form/expense-form-v2-view.tsx`**

(a) import 區（`import { formatCurrency } ...` 那行之後）新增：

```tsx
import { SECTION_CARD, SECTION_TITLE } from "./section-card"
```

(b) 刪除這些兩行（整段移除）：

```tsx
const sectionTitle = "mb-2 text-sm font-medium leading-5 tracking-[.1px]"

```

（即移除 `const sectionTitle = ...` 那一行與其後的空行；函式簽名 `export function ExpenseFormV2View(...)` 保留。）

(c) 描述區塊：

Old:
```tsx
      <div className="mx-4 mb-4 mt-3.5">
        <label htmlFor="v2-desc" className={`block ${sectionTitle} mb-1.5`}>
          描述
        </label>
        <input
          id="v2-desc"
          value={state.description}
          onChange={(e) => actions.setDescription(e.target.value)}
          className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[13px] outline-none"
        />
      </div>
```
New:
```tsx
      <div className={`${SECTION_CARD} mt-3.5`}>
        <label htmlFor="v2-desc" className={`block ${SECTION_TITLE} mb-1.5`}>
          描述
        </label>
        <input
          id="v2-desc"
          value={state.description}
          onChange={(e) => actions.setDescription(e.target.value)}
          className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] outline-none"
        />
      </div>
```

(d) 支出日期區塊：

Old:
```tsx
      <div className="mx-4 mb-4">
        <p className={sectionTitle}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-4 w-4 text-v2-ink-muted" aria-hidden="true" />
```
New:
```tsx
      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-[15px] w-[15px] text-v2-ink-muted" aria-hidden="true" />
```

(e) 消費地點區塊（此時仍用 v1 `LocationPicker`，Task 2.4 才換）：

Old:
```tsx
      <div className="mx-4 mb-4">
        <p className={sectionTitle}>消費地點</p>
        <LocationPicker value={state.location} onChange={actions.setLocation} />
      </div>
```
New:
```tsx
      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>消費地點</p>
        <LocationPicker value={state.location} onChange={actions.setLocation} />
      </div>
```

(f) 收據/圖片區塊：

Old:
```tsx
      <div className="mx-4 mb-4">
        <p className={sectionTitle}>收據/消費圖片</p>
        <ImagePicker value={state.image} onChange={actions.setImage} disabled={props.submitting} />
      </div>
```
New:
```tsx
      <div className={SECTION_CARD}>
        <p className={`mb-2 ${SECTION_TITLE}`}>收據/消費圖片</p>
        <ImagePicker value={state.image} onChange={actions.setImage} disabled={props.submitting} />
      </div>
```

- [ ] **Step 8：執行受影響測試，確認通過**

Run: `npx vitest run tests/components/v2/section-card.test.ts tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS（view 測試查詢用 role/label，不受卡片外框影響）。

- [ ] **Step 9：Lint 並 commit**

```bash
npm run lint
git add components/v2/expense-form/section-card.tsx components/v2/expense-form/amount-card.tsx components/v2/expense-form/category-picker.tsx components/v2/expense-form/expense-form-v2-view.tsx tests/components/v2/section-card.test.tsx
git commit -m "feat: Add expense form section cards and lake titles"
```

---

## Task 2.2：分攤成員卡 — SECTION_CARD、toggle 標籤、`$` 前綴、pinned 框、pin 樣式、剩餘應攤分金額、opacity

**對應差異報告：** §1.3（分攤成員卡）、§1.2 pills 的 `memberPillClass(false)` opacity。

**Files:**
- Modify: `components/v2/expense-form/payer-picker.tsx`（只改 `memberPillClass` 一行）
- Modify: `components/v2/expense-form/split-editor.tsx`（整檔替換）
- Modify: `tests/components/v2/expense-form-v2-view.test.tsx`（更新 §3 列出的斷言 + 新增測試）

- [ ] **Step 1：更新既有測試斷言（先讓它們失敗）**

在 `tests/components/v2/expense-form-v2-view.test.tsx` 做以下替換：

(a) L66（`shows the split summary and matched state` 內）：

Old:
```tsx
    expect(within(split).getByText("個人項目 0（0 項）＋ 共同分攤 100（2 人）＝ 100 / TWD 100")).toBeInTheDocument()
```
New:
```tsx
    expect(within(split).getByText("個人項目 $0（0 項）＋ 共同分攤 $100（2 人）= $100 / $100")).toBeInTheDocument()
```

(b) L111（`sets a custom share for a pool member` 內）：

Old:
```tsx
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^50$/)
```
New:
```tsx
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^\$50$/)
```

(c) L184–186（`shows only the shared-pool portion, separate from personal items` 內）：

Old:
```tsx
    expect(screen.getByText(/應分攤金額/)).toHaveTextContent("900")
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^450$/)
    expect(screen.getByLabelText("志明的分攤金額")).toHaveTextContent(/^450$/)
```
New:
```tsx
    expect(screen.getByText(/剩餘應攤分金額/)).toHaveTextContent("$900")
    expect(screen.getByLabelText("小雨的分攤金額")).toHaveTextContent(/^\$450$/)
    expect(screen.getByLabelText("志明的分攤金額")).toHaveTextContent(/^\$450$/)
```

(d) 在 `describe("ExpenseFormV2View", () => { ... })` 內、任一個既有 `it` 之後，新增這 5 個測試：

```tsx
  it("uses the shared lake section title on the split card", () => {
    renderForm()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(split.className).toContain("rounded-2xl")
    expect(within(split).getByText("分攤成員").className).toContain("text-v2-lake")
  })

  it("keeps the personal-mode label lake when the toggle is off", () => {
    renderForm()
    const label = screen.getByText("先扣個人項目")
    expect(label.className).toContain("text-[13px]")
    expect(label.className).toContain("text-v2-lake")
  })

  it("dims unselected pool pills and their avatars", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByRole("button", { name: "小雨" }).className).not.toContain("opacity-50")
    act(() => hook.result.current.actions.togglePool("a"))
    rerender()
    const unselected = within(split).getByRole("button", { name: "小雨" })
    expect(unselected.className).toContain("opacity-50")
    expect(unselected.querySelector("span[aria-hidden='true']")?.className).toContain("opacity-40")
  })

  it("styles the unpinned pin button with the check border", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("button", { name: "小雨固定金額" }).className).toContain("border-v2-check")
  })

  it("wraps the pinned amount in a bordered box with a dollar prefix", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "小雨固定金額" }))
    rerender()
    const input = screen.getByLabelText("小雨的分攤金額")
    expect(input.closest("label")?.className).toContain("border-v2-lake-border")
    expect(input.closest("label")).toHaveTextContent("$")
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: FAIL（summary 文案、`$`、`剩餘應攤分金額`、opacity、pin class、pinned label 都尚未實作）。

- [ ] **Step 3：改 `components/v2/expense-form/payer-picker.tsx` 的 `memberPillClass`**

Old:
```tsx
    selected ? "border border-v2-lake bg-v2-lake text-v2-on-lake" : "border border-v2-lake-border bg-v2-lake-soft text-v2-ink"
```
New:
```tsx
    selected ? "border border-v2-lake bg-v2-lake text-v2-on-lake" : "border border-v2-lake-border bg-v2-lake-soft text-v2-ink opacity-50"
```

> 註：`memberPillClass` 的第 4 個消費者是 `components/v2/quick-expense/quick-item-card.tsx:16`，會一起變；同一設計 pill，接受並記入最終報告。

- [ ] **Step 4：整個替換 `components/v2/expense-form/split-editor.tsx`**

```tsx
"use client"

import { CheckCircle2, CornerRightDown, Pin, PinOff, Plus, UserMinus, X } from "lucide-react"
import { formatAmount } from "@/lib/constants/currencies"
import { toMoneyInput } from "@/lib/money-input"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"
import { memberPillClass, memberTone } from "./payer-picker"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"
import { SplitSummary } from "./split-summary"

type Draft = ReturnType<typeof useExpenseDraft>

// Must match the server-enforced splitDetail limit (lib/expense-split.ts).
const MAX_PERSONAL_ITEM_NAME = 30

const smallButton = "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
const itemInput = "min-w-0 rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-xs outline-none"

export function SplitEditor({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { state, actions, derived } = draft
  // Currency code only on totals; per-member amounts show the number alone.
  const num = (n: number) => formatAmount(Math.round(n * 100) / 100, currency)
  const tone = (id: string) => memberTone(members.findIndex((m) => m.id === id))
  const name = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  // Shared-pool portion only: personal items are shown in their own section.
  const personalOf = (id: string) => derived.splitInput.personalItems[id]?.reduce((s, i) => s + i.amount, 0) ?? 0
  const poolShareOf = (id: string) =>
    Math.round(((derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0) - personalOf(id)) * 100) / 100
  const sharedTotal = Math.round((derived.splitInput.amount - derived.personalTotal) * 100) / 100
  const allInPool = members.every((m) => state.pool.includes(m.id))
  const allPersonal = members.every((m) => state.personalMembers.includes(m.id))
  const poolCount = state.pool.length

  return (
    <section aria-label="分攤成員" className={SECTION_CARD}>
      <div className="mb-2.5 flex items-center justify-between">
        <p className={`m-0 ${SECTION_TITLE}`}>分攤成員</p>
        <label className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-v2-lake">先扣個人項目</span>
          <button
            type="button"
            role="switch"
            aria-checked={state.personalMode}
            aria-label="先扣個人項目"
            onClick={() => actions.setPersonalMode(!state.personalMode)}
            className={`relative inline-block h-[19px] w-8 shrink-0 rounded-full ${state.personalMode ? "bg-v2-link" : "bg-v2-check"}`}
          >
            <span className={`absolute top-0.5 h-[15px] w-[15px] rounded-full bg-v2-knob transition-[left] ${state.personalMode ? "left-[15px]" : "left-0.5"}`} />
          </button>
        </label>
      </div>

      {state.personalMode && (
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-xs font-semibold text-v2-ink-muted">個人項目</p>
            <button
              type="button"
              aria-label={allPersonal ? "取消全選個人項目" : "全選個人項目"}
              onClick={() => actions.setPersonalAll(!allPersonal)}
              className="shrink-0 text-xs font-bold text-v2-lake"
            >
              {allPersonal ? "取消全選" : "全選"}
            </button>
          </div>
          <div className="mb-2.5 flex flex-wrap gap-2">
            {members.map((m) => {
              const on = state.personalMembers.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`${m.displayName}的個人項目`}
                  aria-pressed={on}
                  onClick={() => actions.togglePersonalMember(m.id)}
                  className={memberPillClass(on)}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                    {m.displayName.charAt(0)}
                  </span>
                  <span className="text-xs font-semibold">{m.displayName}</span>
                </button>
              )
            })}
          </div>
          {state.personalMembers.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-v2-line bg-v2-paper py-3.5 text-center text-xs text-v2-ink-subtle">
              目前沒有人有個人項目，點上面的名字挑一位。
            </p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
              {state.personalMembers.map((id) => {
                const items = state.personalItems[id] ?? []
                const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
                return (
                  <div key={id} className="border-b border-v2-line-soft bg-v2-lake-soft px-3.5 py-2 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${tone(id)}`} aria-hidden="true">
                        {name(id).charAt(0)}
                      </span>
                      <span className="flex flex-1 items-center justify-between gap-2 text-[13px]">
                        <span className="font-semibold">{name(id)}</span>
                        <span className="font-bold">${num(sum)}</span>
                      </span>
                      <button type="button" aria-label={`為${name(id)}新增品項`} onClick={() => actions.addItem(id)} className="flex h-[22px] shrink-0 items-center justify-center gap-px rounded-md bg-v2-lake-tint px-1 text-v2-lake">
                        <CornerRightDown className="h-3 w-3" aria-hidden="true" />
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button type="button" aria-label={`移除${name(id)}的個人項目`} onClick={() => actions.togglePersonalMember(id)} className={`${smallButton} bg-v2-danger-soft text-v2-danger-strong`}>
                        <UserMinus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="ml-[34px] mt-1 border-l border-v2-check pl-2.5">
                      {items.map((item, idx) => (
                        <div key={item.id} className="mt-1.5 flex items-center gap-1.5">
                          <input
                            aria-label={`${name(id)}的品項名稱 ${idx + 1}`}
                            placeholder="品項名稱"
                            maxLength={MAX_PERSONAL_ITEM_NAME}
                            value={item.name}
                            onChange={(e) => actions.updateItem(id, item.id, "name", e.target.value)}
                            className={`${itemInput} flex-[2]`}
                          />
                          <input
                            aria-label={`${name(id)}的品項金額 ${idx + 1}`}
                            placeholder="金額"
                            inputMode="decimal"
                            value={item.amount}
                            onChange={(e) => {
                              const v = toMoneyInput(e.target.value)
                              if (v !== null) actions.updateItem(id, item.id, "amount", v)
                            }}
                            className={`${itemInput} flex-1`}
                          />
                          <button type="button" aria-label="刪除項目" onClick={() => actions.removeItem(id, item.id)} className="flex h-5 w-5 shrink-0 items-center justify-center text-v2-danger-strong">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mb-2.5 mt-3 flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">
          共同分攤 <span className="font-bold text-v2-ink">（剩餘應攤分金額 ${num(Math.max(0, derived.autoRemaining))}）</span>
        </p>
        <button type="button" onClick={() => actions.setPoolAll(!allInPool)} className="shrink-0 text-xs font-bold text-v2-lake">
          {allInPool ? "取消全選" : "全選"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = state.pool.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => actions.togglePool(m.id)}
              className={memberPillClass(on)}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)} ${on ? "" : "opacity-40"}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </button>
          )
        })}
      </div>
      {state.pool.length === 0 && (
        <p className="mt-2.5 rounded-[14px] border border-dashed border-v2-line bg-v2-paper py-3.5 text-center text-xs text-v2-ink-subtle">
          目前沒有人參與共同分攤，點上面的名字挑選分攤的人。
        </p>
      )}
      {state.pool.length > 0 && (
        <div className="mt-2.5 overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {state.pool.map((id) => {
            const custom = state.customShares[id]
            const isCustom = custom !== undefined
            return (
              <div key={id} className="flex items-center gap-2.5 border-b border-v2-line-soft bg-v2-lake-soft px-3.5 py-3 last:border-b-0">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${tone(id)}`} aria-hidden="true">
                  {name(id).charAt(0)}
                </span>
                <span className="flex-1 text-[13px] font-semibold">{name(id)}</span>
                {isCustom ? (
                  // An emptied input keeps the pinned state; the draft treats "" as auto.
                  <label className="flex w-24 items-center rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-[13px] font-bold">
                    <span aria-hidden="true">$</span>
                    <input
                      aria-label={`${name(id)}的分攤金額`}
                      inputMode="decimal"
                      value={custom}
                      placeholder={String(poolShareOf(id))}
                      onChange={(e) => {
                        const v = toMoneyInput(e.target.value)
                        if (v !== null) actions.setCustomShare(id, v)
                      }}
                      className="w-full min-w-0 bg-transparent text-right outline-none"
                    />
                  </label>
                ) : (
                  <span aria-label={`${name(id)}的分攤金額`} className="text-right text-[13px] font-bold">
                    ${num(poolShareOf(id))}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={isCustom ? `${name(id)}取消固定金額` : `${name(id)}固定金額`}
                  aria-pressed={isCustom}
                  onClick={() => (isCustom ? actions.clearCustomShare(id) : actions.setCustomShare(id, String(poolShareOf(id))))}
                  className={`${smallButton} ${isCustom ? "bg-v2-lake text-v2-on-lake" : "border-[1.5px] border-v2-check text-v2-ink-muted"}`}
                >
                  {isCustom ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                </button>
                <button type="button" aria-label={`${name(id)}不參與共同分攤`} onClick={() => actions.togglePool(id)} className={`${smallButton} bg-v2-danger-soft text-v2-danger-strong`}>
                  <UserMinus className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-v2-ink-muted">已選 {derived.splitInput.participantIds.length} 人</span>
          {derived.matches ? (
            <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              金額相符
            </span>
          ) : (
            <span className="text-xs font-bold text-v2-danger">金額不符</span>
          )}
        </div>
        <p className="mt-[3px] break-words text-xs leading-normal text-v2-ink-muted">
          個人項目 ${num(derived.personalTotal)}（{derived.itemCount} 項）＋ 共同分攤 ${num(sharedTotal)}（{poolCount} 人）= ${num(derived.shares.reduce((s, x) => s + x.shareAmount, 0))} / ${num(derived.splitInput.amount)}
        </p>
      </div>

      <SplitSummary members={members} draft={draft} currency={currency} />
    </section>
  )
}
```

> 提醒：`fmt` 與 `formatCurrency` 已被移除（不再使用），不要留 unused import，否則 `npm run lint` 會失敗。

- [ ] **Step 5：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: 全部 PASS（含新增 5 測試；`shows the split breakdown only when personal items are in use` 此時仍用舊的 split-summary markup，Task 2.2 沒有改它，所以仍為綠，Task 2.3 Step 1 才會替換它）。

- [ ] **Step 6：Lint 並 commit**

```bash
npm run lint
git add components/v2/expense-form/payer-picker.tsx components/v2/expense-form/split-editor.tsx tests/components/v2/expense-form-v2-view.test.tsx
git commit -m "feat: Restyle split editor with cards, dollar amounts and pin states"
```

---

## Task 2.3：`split-summary.tsx` — 永遠顯示、grid role、頭像、`$`、footer token

**對應差異報告：** §1.4（分攤明細 table，always shown）。

**Files:**
- Modify: `components/v2/expense-form/split-summary.tsx`（整檔替換）
- Modify: `tests/components/v2/expense-form-v2-view.test.tsx`（替換 `shows the split breakdown only when personal items are in use`）

- [ ] **Step 1：替換既有測試（先讓它失敗）**

把 `tests/components/v2/expense-form-v2-view.test.tsx` 整個 `it("shows the split breakdown only when personal items are in use", () => { ... })` 區塊（目前約 L190–L212）替換成下面兩個測試：

```tsx
  it("always shows the split breakdown with dollar amounts", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1000"))
    rerender()
    const table = screen.getByRole("region", { name: "分攤明細" })
    expect(within(table).getByText("（TWD）")).toBeInTheDocument()
    expect(within(table).getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "成員",
      "個人項目",
      "共同分攤",
      "小計",
    ])
    const row = (name: string) => within(table).getByRole("row", { name: new RegExp(`^${name}`) })
    expect(row("小雨")).toHaveTextContent("$500")
    expect(row("志明")).toHaveTextContent("$500")
    expect(row("合計")).toHaveTextContent("$1,000")
  })

  it("breaks down personal and shared amounts per member with dollar amounts", () => {
    const { hook, rerender } = renderForm()
    act(() => {
      hook.result.current.actions.setAmount("1000")
      hook.result.current.actions.setPersonalMode(true)
      hook.result.current.actions.togglePersonalMember("a")
    })
    const itemId = hook.result.current.state.personalItems.a[0].id
    act(() => {
      hook.result.current.actions.updateItem("a", itemId, "name", "咖啡")
      hook.result.current.actions.updateItem("a", itemId, "amount", "100")
      hook.result.current.actions.togglePool("a")
    })
    rerender()
    const table = screen.getByRole("region", { name: "分攤明細" })
    const cells = (name: string) =>
      within(within(table).getByRole("row", { name: new RegExp(`^${name}`) }))
        .getAllByRole("cell")
        .map((c) => c.textContent)
    expect(cells("小雨")).toEqual(["$100", "$0", "$100"])
    expect(cells("志明")).toEqual(["$0", "$900", "$900"])
    const totalRow = within(table).getByRole("row", { name: /^合計/ })
    expect(within(totalRow).getAllByRole("cell").map((c) => c.textContent)).toEqual(["$100", "$900", "$1,000"])
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: FAIL（`分攤明細` 在沒有 personal items 時目前 `return null`；數字目前沒有 `$`；沒有 columnheader/avatar）。

- [ ] **Step 3：整個替換 `components/v2/expense-form/split-summary.tsx`**

```tsx
"use client"

import { formatAmount } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"
import { memberTone } from "./payer-picker"

type Draft = ReturnType<typeof useExpenseDraft>

// Always-visible per-member breakdown (design A3d). Non-participants render as
// 0/0 rows, matching the design.
export function SplitSummary({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { derived } = draft
  if (derived.shares.length === 0) return null

  const money = (n: number) => `$${formatAmount(Math.round(n * 100) / 100, currency)}`
  const shareOf = (id: string) => derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0
  const personalOf = (id: string) => derived.splitInput.personalItems[id]?.reduce((sum, i) => sum + i.amount, 0) ?? 0
  const rows = members.map((m, index) => {
    const personal = personalOf(m.id)
    const total = shareOf(m.id)
    return {
      id: m.id,
      name: m.displayName,
      tone: memberTone(index),
      personal,
      pool: Math.round((total - personal) * 100) / 100,
      total,
    }
  })
  const sum = (key: "personal" | "pool" | "total") => rows.reduce((s, r) => s + r[key], 0)
  const cols = "grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center gap-1 px-3.5"
  const cell = "text-right text-[13px] tabular-nums"

  return (
    <section aria-label="分攤明細" className="mt-3">
      <p className="mb-2 text-xs font-semibold text-v2-ink-muted">
        分攤明細<span className="text-v2-lake">（{currency}）</span>
      </p>
      <div role="table">
        <div role="row" className={`${cols} pb-1.5 text-[11px] text-v2-ink-subtle`}>
          <span role="columnheader" className="text-left">成員</span>
          <span role="columnheader" className="text-right">個人項目</span>
          <span role="columnheader" className="text-right">共同分攤</span>
          <span role="columnheader" className="text-right">小計</span>
        </div>
        <div role="rowgroup" className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {rows.map((r) => (
            <div key={r.id} role="row" className={`${cols} border-t border-v2-line-soft bg-v2-lake-soft py-2.5 first:border-t-0`}>
              <span role="rowheader" className="flex min-w-0 items-center gap-2 text-left text-[13px] font-semibold">
                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${r.tone}`} aria-hidden="true">
                  {r.name.charAt(0)}
                </span>
                <span className="truncate">{r.name}</span>
              </span>
              <span role="cell" className={`${cell} ${r.personal ? "" : "text-v2-ink-subtle"}`}>{money(r.personal)}</span>
              <span role="cell" className={`${cell} ${r.pool ? "" : "text-v2-ink-subtle"}`}>{money(r.pool)}</span>
              <span role="cell" className={`${cell} font-bold`}>{money(r.total)}</span>
            </div>
          ))}
          <div role="row" className={`${cols} border-t border-v2-lake-border bg-v2-lake-tint py-2.5 font-bold`}>
            <span role="rowheader" className="text-left text-[13px]">合計</span>
            <span role="cell" className={cell}>{money(sum("personal"))}</span>
            <span role="cell" className={cell}>{money(sum("pool"))}</span>
            <span role="cell" className={`${cell} text-v2-lake`}>{money(sum("total"))}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS（含 Task 2.2 新增測試）。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/expense-form/split-summary.tsx tests/components/v2/expense-form-v2-view.test.tsx
git commit -m "feat: Always show split breakdown with dollar amounts"
```

---

## Task 2.4：`location-picker-v2.tsx` + view 改用 + 更新兩個 mock

**對應差異報告：** §1.5（消費地點）、§3（既有測試 mock 更新）、§5.2（不可改 v1 picker）。

**Files:**
- Create: `components/v2/expense-form/location-picker-v2.tsx`
- Create: `tests/components/v2/location-picker-v2.test.tsx`
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx`（import + 使用）
- Modify: `tests/components/v2/expense-form-v2-view.test.tsx`（L5 mock）
- Modify: `tests/components/v2/expense-form-v2.test.tsx`（L35–39 mock）

- [ ] **Step 1：寫新測試（完整檔案），先讓它失敗**

建立 `tests/components/v2/location-picker-v2.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LocationPickerV2 } from "@/components/v2/expense-form/location-picker-v2"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const originalGeolocation = navigator.geolocation

function setGeolocation(value: unknown) {
  Object.defineProperty(navigator, "geolocation", { value, writable: true, configurable: true })
}

const VALUE = { location: "Test Location", latitude: 25.0, longitude: 121.5 }

describe("LocationPickerV2", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    setGeolocation(originalGeolocation)
  })

  // Ported from tests/components/location-picker.test.tsx (shared behaviour).
  it("shows an add-location control when there is no value", () => {
    render(<LocationPickerV2 onChange={vi.fn()} />)
    expect(screen.getByText("新增地點")).toBeInTheDocument()
  })

  it("shows the current value and a relocate control when a value exists", () => {
    render(<LocationPickerV2 value={VALUE} onChange={vi.fn()} />)
    expect(screen.getByText("Test Location")).toBeInTheDocument()
    expect(screen.getByText("重新定位")).toBeInTheDocument()
  })

  it("opens the panel showing the current-location, search and cancel controls", () => {
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    expect(screen.getByText("使用目前位置")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("搜尋地點...")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("closes the panel when cancel is clicked", () => {
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("取消"))
    expect(screen.queryByText("使用目前位置")).not.toBeInTheDocument()
  })

  it("clears the location through onChange when the clear button is clicked", () => {
    const onChange = vi.fn()
    render(<LocationPickerV2 value={VALUE} onChange={onChange} />)
    fireEvent.click(screen.getByText("重新定位"))
    fireEvent.click(screen.getByLabelText("清除位置"))
    expect(onChange).toHaveBeenCalledWith({ location: null, latitude: null, longitude: null })
  })

  it("searches the geocode API after typing (debounced)", async () => {
    const longName = "台".repeat(90)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ displayName: longName, lat: 25.033, lon: 121.5654 }]),
    })
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.change(screen.getByPlaceholderText("搜尋地點..."), { target: { value: "台北" } })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/geocode?q=%E5%8F%B0%E5%8C%97"), { timeout: 1000 })
    expect(await screen.findByText(`${"台".repeat(80)}...`)).toBeInTheDocument()
  })

  it("shows an error when geolocation is not supported", () => {
    setGeolocation(undefined)
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    expect(screen.getByText("您的瀏覽器不支援定位功能")).toBeInTheDocument()
  })

  it("applies a custom className to the root element", () => {
    const { container } = render(<LocationPickerV2 onChange={vi.fn()} className="custom-class" />)
    expect(container.firstChild).toHaveClass("custom-class")
  })

  // Net-new for v2 (not in the v1 suite).
  it("applies the picked result and closes the panel", async () => {
    const onChange = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ displayName: "台北市", lat: 25.033, lon: 121.5654 }]),
    })
    render(<LocationPickerV2 onChange={onChange} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.change(screen.getByPlaceholderText("搜尋地點..."), { target: { value: "台北" } })
    fireEvent.click(await screen.findByText("台北市"))
    expect(onChange).toHaveBeenCalledWith({ location: "台北市", latitude: 25.033, longitude: 121.5654 })
    await waitFor(() => expect(screen.queryByText("使用目前位置")).not.toBeInTheDocument())
  })

  it("uses the reverse-geocoded name when the current location succeeds", async () => {
    const onChange = vi.fn()
    setGeolocation({
      getCurrentPosition: (resolve: PositionCallback) =>
        resolve({ coords: { latitude: 25.03, longitude: 121.56 } } as unknown as GeolocationPosition),
    })
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ displayName: "台北市", lat: 25.03, lon: 121.56 }) })
    render(<LocationPickerV2 onChange={onChange} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ location: "台北市", latitude: 25.03, longitude: 121.56 }))
  })

  it("falls back to formatted coordinates when reverse geocoding fails", async () => {
    const onChange = vi.fn()
    setGeolocation({
      getCurrentPosition: (resolve: PositionCallback) =>
        resolve({ coords: { latitude: 25.03, longitude: 121.56 } } as unknown as GeolocationPosition),
    })
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    render(<LocationPickerV2 onChange={onChange} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ location: "25.030000, 121.560000", latitude: 25.03, longitude: 121.56 })
    )
  })

  it("keeps the value chip visible while the panel is open", () => {
    render(<LocationPickerV2 value={VALUE} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("重新定位"))
    expect(screen.getByText("使用目前位置")).toBeInTheDocument()
    expect(screen.getByText("Test Location")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/location-picker-v2.test.tsx`
Expected: FAIL（`Failed to resolve import "@/components/v2/expense-form/location-picker-v2"`）。

- [ ] **Step 3：建立 `components/v2/expense-form/location-picker-v2.tsx`（完整檔案）**

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react"

interface LocationResult {
  displayName: string
  lat: number
  lon: number
  address?: Record<string, string>
  type?: string
  class?: string
}

interface LocationPickerV2Props {
  value?: {
    location: string | null
    latitude: number | null
    longitude: number | null
  }
  onChange: (value: {
    location: string | null
    latitude: number | null
    longitude: number | null
  }) => void
  className?: string
}

// v2 copy of components/location-picker.tsx logic with v2 markup only.
export function LocationPickerV2({ value, onChange, className }: LocationPickerV2Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search the geocode API.
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data)
      } else {
        setError(data.error || "搜尋失敗")
        setSearchResults([])
      }
    } catch {
      setError("網路錯誤，請稍後再試")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, searchLocation])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("您的瀏覽器不支援定位功能")
      return
    }

    setIsGettingLocation(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude } = position.coords

      const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()

      if (response.ok) {
        onChange({ location: data.displayName, latitude: data.lat, longitude: data.lon })
        setIsOpen(false)
      } else {
        // Keep coordinates even when reverse geocoding fails.
        onChange({
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          latitude,
          longitude,
        })
        setIsOpen(false)
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("請允許存取位置權限")
            break
          case err.POSITION_UNAVAILABLE:
            setError("無法取得位置資訊")
            break
          case err.TIMEOUT:
            setError("取得位置逾時，請重試")
            break
        }
      } else {
        setError("取得位置時發生錯誤")
      }
    } finally {
      setIsGettingLocation(false)
    }
  }

  const selectResult = (result: LocationResult) => {
    onChange({ location: result.displayName, latitude: result.lat, longitude: result.lon })
    setSearchQuery("")
    setSearchResults([])
    setIsOpen(false)
  }

  const clearLocation = () => {
    onChange({ location: null, latitude: null, longitude: null })
  }

  const cancel = () => {
    setIsOpen(false)
    setSearchQuery("")
    setSearchResults([])
    setError(null)
  }

  const formatDisplayName = (name: string, maxLength: number = 50) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + "..."
  }

  return (
    <div className={className}>
      {value?.location ? (
        <div className={`flex items-center gap-2 rounded-xl px-3.5 py-3 ${isOpen ? "mb-2 bg-v2-sand" : "bg-v2-paper"}`}>
          <MapPin className="h-[15px] w-[15px] shrink-0 text-v2-coral" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words text-[13px]">{value.location}</span>
          {isOpen ? (
            <button
              type="button"
              aria-label="清除位置"
              onClick={clearLocation}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-v2-ink-subtle"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={() => setIsOpen(true)} className="shrink-0 text-xs font-bold text-v2-link">
              重新定位
            </button>
          )}
        </div>
      ) : (
        !isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl bg-v2-paper px-3.5 py-3 text-left text-[13px] text-v2-ink-muted"
          >
            <MapPin className="h-[15px] w-[15px] shrink-0 text-v2-coral" aria-hidden="true" />
            新增地點
          </button>
        )
      )}

      {isOpen && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-v2-line bg-v2-paper p-3">
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex w-full items-center gap-2 rounded-[10px] bg-v2-sand px-3 py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            {isGettingLocation ? (
              <Loader2 className="h-[15px] w-[15px] animate-spin text-v2-link" aria-hidden="true" />
            ) : (
              <Navigation className="h-[15px] w-[15px] text-v2-link" aria-hidden="true" />
            )}
            使用目前位置
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-v2-ink-subtle" aria-hidden="true" />
            <input
              type="text"
              placeholder="搜尋地點..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[10px] border border-v2-line bg-v2-surface py-2.5 pl-[34px] pr-3 text-[13px] outline-none"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-v2-ink-subtle" aria-hidden="true" />
            )}
          </div>

          {error && <p className="text-xs text-v2-danger">{error}</p>}

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectResult(result)}
                  className={`flex items-start gap-2 rounded-lg p-2 text-left text-xs ${index === 0 ? "bg-v2-lake-soft" : ""}`}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v2-ink-muted" aria-hidden="true" />
                  <span className="break-words">{formatDisplayName(result.displayName, 80)}</span>
                </button>
              ))}
            </div>
          )}

          <button type="button" onClick={cancel} className="w-full py-1.5 text-center text-xs font-semibold text-v2-ink-muted">
            取消
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/location-picker-v2.test.tsx`
Expected: PASS（12 tests）。

- [ ] **Step 5：把 view 改用 `LocationPickerV2`**

在 `components/v2/expense-form/expense-form-v2-view.tsx`：

(a) import 替換：

Old:
```tsx
import { LocationPicker } from "@/components/location-picker"
```
New:
```tsx
import { LocationPickerV2 } from "./location-picker-v2"
```

(b) 使用處替換（消費地點 card 內）：

Old:
```tsx
        <LocationPicker value={state.location} onChange={actions.setLocation} />
```
New:
```tsx
        <LocationPickerV2 value={state.location} onChange={actions.setLocation} />
```

- [ ] **Step 6：更新兩個既有測試的 vi.mock() 路徑**

(a) `tests/components/v2/expense-form-v2-view.test.tsx`：

Old:
```tsx
vi.mock("@/components/location-picker", () => ({ LocationPicker: () => <div data-testid="location-picker" /> }))
```
New:
```tsx
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => <div data-testid="location-picker" /> }))
```

(b) `tests/components/v2/expense-form-v2.test.tsx`：

Old:
```tsx
// Renders the current location so tests can observe the shared geolocation
// helper's result being applied to the draft (the real picker is a full UI
// widget we don't need here).
vi.mock("@/components/location-picker", () => ({
  LocationPicker: ({ value }: { value: { location: string | null } }) => (
    <span data-testid="location">{value?.location ?? ""}</span>
  ),
}))
```
New:
```tsx
// Renders the current location so tests can observe the shared geolocation
// helper's result being applied to the draft (the real picker is a full UI
// widget we don't need here).
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({
  LocationPickerV2: ({ value }: { value: { location: string | null } }) => (
    <span data-testid="location">{value?.location ?? ""}</span>
  ),
}))
```

- [ ] **Step 7：執行受影響測試，確認通過**

Run: `npx vitest run tests/components/v2/location-picker-v2.test.tsx tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/expense-form-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。**若忘了更新 mock，jsdom 會真的呼叫 fetch/geolocation 造成 flaky，務必先更新再跑。**

- [ ] **Step 8：Lint 並 commit**

```bash
npm run lint
git add components/v2/expense-form/location-picker-v2.tsx components/v2/expense-form/expense-form-v2-view.tsx tests/components/v2/location-picker-v2.test.tsx tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/expense-form-v2.test.tsx
git commit -m "feat: Add v2 location picker and use it in the expense form"
```

---

## Task 2.5：付款人卡 — 付款人 / 付款明細 / 單一付款人列 / 摘要區塊

**對應差異報告：** §1.2（payer card）、master D12（單一付款人）、D25（付款人摘要）。A3b 的單一付款人列也在此完成。

**Files:**
- Modify: `components/v2/expense-form/payer-picker.tsx`（整檔替換）
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx`（傳入 `amount` / `currency`）
- Modify: `tests/components/v2/expense-form-v2-view.test.tsx`（新增付款人測試）

- [ ] **Step 1：新增測試（先讓它失敗）**

在 `tests/components/v2/expense-form-v2-view.test.tsx` 的 describe 內新增：

```tsx
  it("renders a single read-only payer row and a payer summary with no select-all", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    const payer = screen.getByRole("group", { name: "付款人" })
    expect(within(payer).getByText("付款明細")).toBeInTheDocument()
    expect(within(payer).queryByText("全選")).not.toBeInTheDocument()
    expect(within(payer).getAllByText("小雨")).toHaveLength(2)
    expect(within(payer).getByText("$1,280")).toBeInTheDocument()
    expect(within(payer).getByText("已選 1 人")).toBeInTheDocument()
    expect(within(payer).getByText("金額相符")).toBeInTheDocument()
    expect(within(payer).getByText("$1,280 = $1,280 / $1,280")).toBeInTheDocument()
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: FAIL（找不到 `getByRole("group", { name: "付款人" })`：目前 legend 是 `付款成員`，且沒有付款明細/摘要）。

- [ ] **Step 3：整個替換 `components/v2/expense-form/payer-picker.tsx`**

```tsx
import { CheckCircle2 } from "lucide-react"
import { formatAmount } from "@/lib/constants/currencies"
import type { DraftMember } from "./use-expense-draft"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"

const AVATAR_TONES = ["bg-v2-lake-tint text-v2-lake", "bg-v2-coral-soft text-v2-coral-strong", "bg-v2-plum-soft text-v2-plum", "bg-v2-rose-soft text-v2-rose"]

// Shared member pill look for the payer, personal-item and shared-pool pickers.
export function memberPillClass(selected: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
    selected ? "border border-v2-lake bg-v2-lake text-v2-on-lake" : "border border-v2-lake-border bg-v2-lake-soft text-v2-ink opacity-50"
  }`
}

export function memberTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length]
}

export function PayerPicker({
  members,
  value,
  onChange,
  amount,
  currency,
}: {
  members: DraftMember[]
  value: string
  onChange: (id: string) => void
  amount: number
  currency: string
}) {
  const paid = members.filter((m) => m.id === value)
  const money = (n: number) => `$${formatAmount(Math.round(n * 100) / 100, currency)}`
  const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""

  return (
    <fieldset className={SECTION_CARD}>
      <legend className={`${SECTION_TITLE} mb-2.5`}>付款人</legend>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">付款明細</p>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-2">
        {members.map((m, i) => {
          const checked = value === m.id
          return (
            <label key={m.id} className={`cursor-pointer ${memberPillClass(checked)}`}>
              <input
                type="radio"
                name="v2-payer"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(m.id)}
                aria-label={m.displayName}
              />
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${memberTone(i)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </label>
          )
        })}
      </div>

      {value && (
        <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          <div className="flex items-center gap-2.5 bg-v2-lake-soft px-3.5 py-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${memberTone(
                members.findIndex((m) => m.id === value)
              )}`}
              aria-hidden="true"
            >
              {nameOf(value).charAt(0)}
            </span>
            <span className="flex flex-1 items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">{nameOf(value)}</span>
              <span className="rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-[13px] font-bold">
                {money(amount)}
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-v2-ink-muted">已選 {paid.length} 人</span>
          <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            金額相符
          </span>
        </div>
        <p className="mt-[3px] break-words text-xs leading-normal text-v2-ink-muted">
          {money(amount)} = {money(amount)} / {money(amount)}
        </p>
      </div>
    </fieldset>
  )
}
```

> 說明：多位付款人（多選 pills、`全選`、每人釘選/移除）無資料支撐（D12），永遠單選，因此 `全選` 不再渲染、付款明細列固定唯讀、每人釘選/移除不渲染。付款人摘要（D25）與分攤成員卡自己的摘要並存。

- [ ] **Step 4：view 傳入 `amount` 與 `currency`**

在 `components/v2/expense-form/expense-form-v2-view.tsx`：

Old:
```tsx
      <PayerPicker members={props.members} value={state.paidBy} onChange={actions.setPaidBy} />
```
New:
```tsx
      <PayerPicker
        members={props.members}
        value={state.paidBy}
        onChange={actions.setPaidBy}
        amount={derived.splitInput.amount}
        currency={state.currency}
      />
```

- [ ] **Step 5：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/expense-form-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 6：Lint 並 commit**

```bash
npm run lint
git add components/v2/expense-form/payer-picker.tsx components/v2/expense-form/expense-form-v2-view.tsx tests/components/v2/expense-form-v2-view.test.tsx
git commit -m "feat: Add single-payer detail row and payer summary card"
```

---

## Task 2.6：通知 LINE checkbox 樣式（保留 `<input type="checkbox">`）

**對應差異報告：** §1.5（Notify LINE row，optional polish；master 要求保留 input）。

**Files:**
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx`
- Modify: `tests/components/v2/expense-form-v2-view.test.tsx`

- [ ] **Step 1：新增測試（先讓它失敗）**

在 `tests/components/v2/expense-form-v2-view.test.tsx` 的 describe 內新增：

```tsx
  it("keeps a working, accessible notify checkbox", () => {
    const { hook, rerender } = renderForm()
    const checkbox = screen.getByRole("checkbox", { name: /通知 LINE 群組/ })
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    rerender()
    expect(hook.result.current.state.notifyLine).toBe(false)
  })
```

- [ ] **Step 2：執行測試，確認通過或失敗**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: 這個測試**可能已通過**（現有 input 仍可存取）。任務仍要繼續，因為 Step 3 改變外觀；Step 3 後必須仍 PASS。

- [ ] **Step 3：改 `components/v2/expense-form/expense-form-v2-view.tsx`**

(a) lucide import 加入 `Check`：

Old:
```tsx
import { CalendarIcon, Trash2 } from "lucide-react"
```
New:
```tsx
import { CalendarIcon, Check, Trash2 } from "lucide-react"
```

(b) 通知區塊替換：

Old:
```tsx
      {props.canNotifyLine && (
        <label className="mx-4 mb-4 flex items-center gap-2.5 rounded-[14px] border border-v2-line bg-v2-surface px-3.5 py-3">
          <input
            type="checkbox"
            checked={state.notifyLine}
            onChange={(e) => actions.setNotifyLine(e.target.checked)}
            className="h-5 w-5 accent-v2-lake"
          />
          <span>
            <span className="block text-xs font-bold">通知 LINE 群組</span>
            <span className="mt-px block text-xs text-v2-ink-muted">儲存後自動發送通知到群組</span>
          </span>
        </label>
      )}
```
New:
```tsx
      {props.canNotifyLine && (
        <label className="mx-4 mb-4 flex items-center gap-[10px] rounded-[14px] border border-v2-line bg-v2-surface px-[14px] py-3">
          <input
            type="checkbox"
            checked={state.notifyLine}
            onChange={(e) => actions.setNotifyLine(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-v2-check bg-v2-surface text-transparent peer-checked:border-v2-lake peer-checked:bg-v2-lake peer-checked:text-v2-on-lake"
          >
            <Check className="h-3 w-3" />
          </span>
          <span>
            <span className="block text-xs font-bold">通知 LINE 群組</span>
            <span className="mt-px block text-xs text-v2-ink-muted">儲存後自動發送通知到群組</span>
          </span>
        </label>
      )}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: 全部 PASS（checkbox 仍存在且可切換）。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/expense-form/expense-form-v2-view.tsx tests/components/v2/expense-form-v2-view.test.tsx
git commit -m "feat: Style the notify LINE checkbox while keeping the input"
```

---

## Task 2.7：Part 2 驗證

**Files:** 無程式碼變更（只驗證；必要時回到前面 task 補測試）。

- [ ] **Step 1：跑本 Part 觸及的測試**

Run:
```bash
npx vitest run tests/components/v2/section-card.test.ts tests/components/v2/location-picker-v2.test.tsx tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/expense-form-v2.test.tsx tests/components/v2/use-expense-draft.test.tsx tests/components/v2/no-hardcoded-colors.test.ts
```
Expected: 全部 PASS。

- [ ] **Step 2：完整測試（含 v1）**

Run: `npm run test:run`
Expected: 全部 PASS，包含 `tests/components/location-picker.test.tsx`、`tests/components/image-picker.test.tsx`、`tests/components/expense-form*.test.tsx` 等 v1 測試。若有失敗：停止並回報錯誤全文。

- [ ] **Step 3：v1 保護驗證（輸出必須為空）**

Run:
```bash
git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
```
Expected: 沒有任何輸出。若有輸出 → 停止並回報。

- [ ] **Step 4：Lint**

Run: `npm run lint`
Expected: 成功、無 warning/error。

- [ ] **Step 5：覆蓋率比對**

Run: `npx vitest run --coverage > /tmp/cov-a3.txt 2>&1 && sed 's/\x1b\[[0-9;]*m//g' /tmp/cov-a3.txt | grep -E "components/v2/expense-form|section-card|location-picker-v2"`

Expected：
- `components/v2/expense-form` 的 `% Lines` **≥ 89.53%**（baseline）。
- 新檔 `section-card.tsx`、`location-picker-v2.tsx` 的 `% Lines` **≥ 90%**。

不符合時（用輸出 `Uncovered Line #s` 找行號）：
- `section-card.tsx`：目前只有兩個常數，應為 100%（測試已 import）；若未覆蓋，確認 `section-card.test.tsx` 有 import 兩個常數。
- `location-picker-v2.tsx`：常見未覆蓋行為 `searchLocation` 的 `!query.trim()` 早退、搜尋失敗 `else`、以及 geolocation 的 `PERMISSION_DENIED` / `POSITION_UNAVAILABLE` / `TIMEOUT`。**若低於 90%**，在 `tests/components/v2/location-picker-v2.test.tsx` 補以下測試後重跑本 Step：

```tsx
  it("shows an error when the geocode search fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "搜尋失敗" }) })
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.change(screen.getByPlaceholderText("搜尋地點..."), { target: { value: "台北" } })
    expect(await screen.findByText("搜尋失敗")).toBeInTheDocument()
  })

  it("shows a permission error when geolocation is denied", async () => {
    class DeniedError extends Error {
      code = 1
      static readonly PERMISSION_DENIED = 1
      static readonly POSITION_UNAVAILABLE = 2
      static readonly TIMEOUT = 3
    }
    setGeolocation({
      getCurrentPosition: (_resolve: PositionCallback, reject: PositionErrorCallback) => reject(new DeniedError() as unknown as GeolocationPositionError),
    })
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    expect(await screen.findByText("請允許存取位置權限")).toBeInTheDocument()
  })
```

（`err instanceof GeolocationPositionError` 在 jsdom 可能因全域不存在而丟錯；若補的測試無法穩定通過，改用 `vi.stubGlobal("GeolocationPositionError", DeniedError)` 後重試，或改為在報告記錄該分支未覆蓋；**不要為了覆蓋率放寬既有斷言**。）

- [ ] **Step 6：確認只動了允許的檔案**

Run: `git diff --name-only 36633e1 -- components/v2/expense-form tests/components/v2`
Expected: 每一行都在 `components/v2/expense-form/` 或 `tests/components/v2/` 內（外加其它 Part 對其它資料夾的變更不在此列）。

- [ ] **Step 7：完成本 Part**（不需額外 commit；各 task 已 commit）
