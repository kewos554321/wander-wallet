# 專案匯率：逐幣別固定（預設即時）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把專案匯率改成「預設即時 ＋ 固定匯率逐幣別 opt-in」，移除全專案的固定/即時總開關，並在記帳當下提供「設為專案固定匯率」。

**Architecture:** 先把解析規則簡化回 `customRates[currency] ?? live` 並拆掉 `rateSource`／`effectiveCustomRates` 那條線；再把設定頁的清單改成只列「加過的幣別」；最後加上「記帳當下升級成固定」的開關列與寫入 `Project.customRates` 的能力。

**Tech Stack:** Next.js 16 (App Router, Turbopack)、React 19、Prisma 6、Vitest + Testing Library、Tailwind（v2 token）。

**Spec:** `docs/superpowers/specs/2026-10-10-per-currency-fixed-rate-design.md`

## Global Constraints

- 新支出換算：`customRates[currency] ?? 即時`；**沒有 `rateSource`**。
- 固定值以 **6 位有效數字**（`roundRateForDisplay`）顯示與儲存。
- `Project.rateSource` 欄位**保留但不使用**（不刪欄位）。
- 既有支出**不重算**（凍結快照）；自動 seed 已移除，維持不 seed。
- 記帳面板的「設為專案固定匯率」**預設關閉**；不勾＝只影響這一筆（現行行為）。
- 指令：`npx vitest run <path>`；全套 `npm run test:run`；`npm run lint`。每個任務完成即 commit。

## Review Focus

1. **未勾開關時**：不能寫入 `Project.customRates`（只能影響這一筆）。
2. **已有固定值的幣別**：勾選後寫入＝**覆蓋**，且提示要對（顯示舊值與新值）。
3. **同幣別支出**（currency === projectCurrency）：不該出現開關、也不該寫固定（沒有匯率可固定）。
4. **舊資料**：專案仍帶 `rateSource`（欄位還在）時，不得因此改變任何行為（一律當作沒有）。
5. **AI／快速記帳**：勾選後存的是**快速流程自己的存檔路徑**（不是一般表單的 save），要確認真的有寫進專案。

---

### Task 1: 簡化 `resolveRate`（移除 rateSource）

**Files:**
- Modify: `lib/currency-conversion.ts`
- Modify: `app/api/projects/[id]/expenses/route.ts`, `app/api/projects/[id]/expenses/[expenseId]/route.ts`
- Test: `tests/lib/currency-conversion.test.ts`, `tests/lib/multi-currency-correctness.test.ts`, `tests/api/expenses.test.ts`

**Interfaces:**
- Produces: `resolveRate(input: { currency; projectCurrency; provided?; customRate?; liveRate? }): { rate: number; source: "same" | "provided" | "fixed" | "live" }`。
  - `provided != null` → provided；否則 `customRate != null` → fixed；否則 `liveRate ?? 1` → live。

- [ ] **Step 1: Update failing tests** — 從 `resolveRate` 呼叫移除 `rateSource`；「live ignores the custom rate」改成「no custom rate → live」。
- [ ] **Step 2: Run to verify it fails** → `npx vitest run tests/lib/currency-conversion.test.ts tests/lib/multi-currency-correctness.test.ts`（FAIL）
- [ ] **Step 3: Implement** — 移除 `rateSource` 參數與其分支；`customRate` 分支移到 `provided` 之後。
- [ ] **Step 4: 更新兩個支出 route**：移除 `rateSource` 的 select 與傳參。
- [ ] **Step 5: Run** → 上述測試＋`tests/api/expenses.test.ts` 全綠。
- [ ] **Step 6: Commit** `git commit -m "refactor: resolveRate no longer needs rateSource"`

### Task 2: 拆掉 `effectiveCustomRates` 與 `rateSource` 貫穿

**Files:**
- Modify: `lib/currency-conversion.ts`（移除 `effectiveCustomRates`）
- Modify: `lib/hooks/useProjectData.ts`（移除 `rateSource`/`effectiveCustomRates` 回傳與 `Project.rateSource`）
- Modify: `lib/hooks/useProjectOverview.ts`、`components/v2/expense-form/expense-form-v2.tsx`、`components/v2/expenses/expenses-v2.tsx`、`components/v2/export/export-v2.tsx`、`components/v2/currency/currency-v2.tsx`、`components/v2/project/project-overview-v2.tsx`、`components/v1/expenses/expenses-v1.tsx`、`components/v1/stats/stats-v1.tsx`、`components/v1/export/export-v1.tsx`
- Modify: `app/api/projects/[id]/settle/route.ts`（不再看 `rateSource`）
- Test: `tests/lib/hooks/useProjectData.test.ts`, `tests/components/v2/expense-form-preview.test.tsx`, `tests/api/settle.test.ts`

- [ ] **Step 1: Update failing tests** — `useProjectData` 不再有 `rateSource`/`effectiveCustomRates`；消費端用 `customRates`；settle 用原始 `customRates`。
- [ ] **Step 2: RED** → 對應測試 FAIL
- [ ] **Step 3: Implement** — 各消費端把 `effectiveCustomRates` 換回 `customRates`；settle 用 `(project.customRates || {})`；移除 helper 與 hook 欄位。
- [ ] **Step 4: GREEN** → 全套通過
- [ ] **Step 5: Commit** `git commit -m "refactor: drop the project rate source plumbing"`

### Task 3: 設定頁移除總開關；清單只列 opt-in 幣別

**Files:**
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`
- Modify: `lib/hooks/use-project-form.ts`（移除 `rateSource`）、`components/v2/project-settings/project-settings-v2.tsx`
- Test: `tests/components/v2/project-settings-v2.test.tsx`, `tests/lib/hooks/use-project-form.test.ts`

**Interfaces:**
- Produces: 清單 `rateCurrencies = Object.keys(values.customRates).filter(c => c && c !== values.currency && (values.customRates[c] ?? "").trim() !== "")`（只列有值的）。

- [ ] **Step 1: Update failing tests** — 移除「匯率來源」segmented 的測試；新增：沒設定時只看到空狀態＋`＋ 新增固定匯率`；有設定時只看到該幣別一列。
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement** — 刪掉 toggle 區塊；`rateCurrencies` 改為只列 `customRates` 有值的；空狀態文案 `未設定。新支出一律使用即時匯率。`；form 移除 `rateSource`。
- [ ] **Step 4: GREEN**
- [ ] **Step 5: Commit** `git commit -m "feat(v2): settings lists only opted-in fixed rates"`

### Task 4: 匯率面板「同時設為專案固定匯率」開關列

**Files:**
- Modify: `components/v2/expense-form/rate-sheet.tsx`
- Modify: `components/v2/expense-form/use-expense-draft.ts`（新增 `promoteFixedRate: boolean` + action）
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx`
- Test: `tests/components/v2/rate-sheet.test.tsx`, `tests/components/v2/use-expense-draft.test.tsx`

**Interfaces:**
- Produces: `RateSheetProps` 新增 `onPromote: (rate: number) => void` 與 `existingFixedRate?: number | null`。
- Produces: `useExpenseDraft` 的 `state.promoteFixedRate`, `actions.setPromoteFixedRate`；`setCurrency` 一併重設為 `false`。

- [ ] **Step 1: Write failing tests**
```ts
// rate-sheet
it("promotes the rate on 完成 only when the toggle is on", () => {
  const { props } = setup({ onPromote: vi.fn() })
  fireEvent.click(screen.getByRole("button", { name: "完成" }))
  expect(props.onPromote).not.toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText("同時設為專案固定匯率"))
  fireEvent.click(screen.getByRole("button", { name: "完成" }))
  expect(props.onPromote).toHaveBeenCalledWith(0.032)
})
it("warns before overwriting an existing fixed rate", () => {
  setup({ existingFixedRate: 0.03 })
  fireEvent.click(screen.getByLabelText("同時設為專案固定匯率"))
  expect(screen.getByText(/將覆蓋/)).toBeInTheDocument()
})
```
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement** — 面板在 footer 上方加一列 toggle（`aria-label="同時設為專案固定匯率"`，預設未勾）；`完成` onClick：若 `promote` 則 `onPromote(rate)`，然後 `onClose()`；`existingFixedRate != null && promote` → 顯示 `將覆蓋目前的固定匯率 {existingFixedRate}`。
- [ ] **Step 4: GREEN**
- [ ] **Step 5: Commit** `git commit -m "feat(v2): promote a rate to a project fixed rate from the sheet"`

### Task 5: 儲存時寫入 `Project.customRates`

**Files:**
- Modify: `lib/hooks/useSaveExpense.ts`（`ExpensePayload` 新增 `promoteRate?: boolean`）
- Modify: `components/v2/expense-form/expense-form-v2.tsx`（payload 帶 `promoteRate`）
- Modify: `app/api/projects/[id]/expenses/route.ts`, `app/api/projects/[id]/expenses/[expenseId]/route.ts`
- Test: `tests/api/expenses.test.ts`

**Interfaces:**
- Consumes: `state.promoteFixedRate`（Task 4）。
- Produces: server 在 `$transaction` 內，若 `promoteRate === true` 且外幣 → `tx.project.update({ data: { customRates: { ...customRates, [currency]: resolvedRate } } })`。

- [ ] **Step 1: Write failing tests**
```ts
it("writes the expense rate into the project fixed rates when promoting", async () => {
  // body { ..., exchangeRate: 31.5, promoteRate: true, currency: "USD" }
  // expect prisma.project.update data.customRates.USD ≈ 31.5
})
it("does not touch project rates without promoteRate", async () => {
  expect(prisma.project.update).not.toHaveBeenCalled()
})
```
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement** — payload/route 傳遞 `promoteRate`；在交易內寫入（同 Task 1 已移除的 seed 位置，但條件改成 `promoteRate`）。
- [ ] **Step 4: GREEN** → `tests/api/expenses.test.ts`
- [ ] **Step 5: Commit** `git commit -m "feat(api): write a promoted rate into the project fixed rates"`

### Task 6: AI／快速記帳：卡片上的同一個開關

**Files:**
- Modify: `components/v2/quick-expense/quick-item-card.tsx`（金額卡下方 toggle）
- Modify: `lib/quick-expense/draft.ts` 或 quick 的存檔路徑（帶 `promoteRate`）
- Test: `tests/components/v2/quick-expense/quick-item-card.test.tsx`（＋ quick 存檔的測試）

**Interfaces:**
- Consumes: Task 5 的 `promoteRate` payload。
- Produces: `QuickItem` 新增 `promoteFixedRate?: boolean`；卡片 toggle 設定它；quick 存檔時把它送進 payload。

- [ ] **Step 1: Write failing tests**
```ts
it("shows the promote toggle under a custom rate", () => { /* setup foreign item + custom rate */ })
it("sends promoteRate when the card toggle is on", () => { /* assert onChange({ promoteFixedRate: true }) */ })
```
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement** — 金額卡的 `rateChip` 那列下方加 toggle（與面板同文案）；quick 的存檔把 `promoteFixedRate` 帶進 payload（走 Task 5 的 API）。
- [ ] **Step 4: GREEN**（含 `npm run test:run` 全套 + `npm run lint`）
- [ ] **Step 5: Commit** `git commit -m "feat(v2): promote a fixed rate from the AI/quick amount card"`

---

## Self-Review

**Spec coverage:** 模型／去 tab（T1–T3）、面板開關列（T4）、寫入 `customRates`（T5）、AI 卡片（T6）。「最小單位／移除精度／新增預填」已在前一批完成，未列入。

**Type consistency:** `resolveRate` 無 `rateSource`；`useProjectData` 無 `rateSource`/`effectiveCustomRates`；`promoteRate?: boolean`（payload）／`promoteFixedRate`（draft/QuickItem state）；`existingFixedRate`。

**Review Focus 對應：** ①T5 Step1 第二個測試；②T4 Step1 第二個測試；③T4/T5 需在 `currency === projectCurrency` 時隱藏開關；④T2（`rateSource` 不再被讀）；⑤T6 Step1 第二個測試。
