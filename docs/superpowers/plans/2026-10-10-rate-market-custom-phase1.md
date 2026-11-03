# 匯率面板「市場／自訂」＋移除專案固定匯率（Phase 1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「新增／編輯支出」的匯率來源收斂成 `市場` 與 `自訂` 兩種，並讓建立支出與結算都不再使用「專案固定匯率」。

**Architecture:** 純函式先改（`lib/currency-conversion.ts`、`components/v2/currency/format.ts`、新的 `lib/recent-rates.ts`），再改 UI（`rate-sheet.tsx` 兩個 tab、`amount-card` 標籤、表單容器/視圖），最後改 API（expenses create/edit、settle）。`Project.customRates` 欄位本階段只停止使用、不刪除；UI（專案設定／匯率頁）留到 Phase 2 移除。

**Tech Stack:** Next.js (App Router) + TypeScript、Vitest + @testing-library/react（jsdom）、Prisma。

**Spec:** `docs/superpowers/specs/2026-10-10-rate-market-custom-design.md`

## Global Constraints

- 顯示幣別一律用**幣別代碼**（`TWD`／`JPY`），不可改成 `NT$`／`¥`。
- 每個 task 都要 TDD（先寫失敗測試）、各自一個 commit；結束時 `npm run test:run` 與 `npm run lint` 必須全綠。
- **不改結算的整數分配／尾差演算法**；只改「匯率從哪來」。既有支出、`amountProject`／`shareAmountProject` 快照**不變**。
- 移除 `ExpenseRateKind` 的 `"project"`；既有 `rateKind === "project"` 的支出**顯示映射為 `自訂`**（數字不變）。
- 本階段保留 `Project.customRates` 欄位（僅停止讀寫），UI 移除留給 Phase 2。
- 「最近用過的匯率」清單範圍＝**同一專案、同幣別組合**，最多 5 筆。

## Review Focus

- **舊資料**：`rateKind === "project"` 的支出開編輯面板時，chip 應顯示 `自訂`、kind 不應讓 UI／型別崩。（Task 3、5、6）
- **市場改日期抓不到**：`/api/exchange-rates?date=…` 失敗時顯示錯誤、**不可**覆蓋或清掉既有匯率。（Task 5）
- **自訂無效值**：空／0／負／非數字不可套用、使用鈕要 disabled。（Task 5）
- **幣別切換回結算幣別**：foreign → same 時 `rateKind`／`rateDate`／chip 都要清空。（Task 3、6）
- **結算不變**：已有 `amountProject` 快照的支出，結算金額**不得**因移除 `customRates` 而改變；只有缺快照的舊資料才走即時。（Task 11）

---

## File Structure

- `lib/currency-conversion.ts` — 匯率模型純函式（改）。
- `lib/recent-rates.ts` — **新增**：把專案支出整理成「最近用過的匯率」清單（純函式）。
- `components/v2/currency/format.ts` — `rateChip`／`RateChipTone`（改）。
- `components/v2/expense-form/amount-card.tsx` — chip 色系（改）。
- `components/v2/expense-form/use-expense-draft.ts` — 匯率 draft 狀態（改）。
- `components/v2/expense-form/rate-sheet.tsx` — 面板改 `市場／自訂`（改）。
- `components/v2/expense-form/expense-form-v2-view.tsx` — 面板/卡片組裝（改）。
- `components/v2/expense-form/expense-form-v2.tsx` — 容器與存檔 payload（改）。
- `components/v2/quick-expense/*.tsx`、`lib/quick-expense/*.ts` — 移除 promote（改）。
- `lib/hooks/useSaveExpense.ts` — payload 型別（改）。
- `lib/hooks/useProjectData.ts` — 放寬 `expenses` 型別（改）。
- `app/api/projects/[id]/expenses/route.ts`、`.../[expenseId]/route.ts` — 建立/編輯（改）。
- `app/api/projects/[id]/settle/route.ts`、`components/v2/settle/settle-v2-view.tsx` — 結算（改）。

---

### Task 1: 匯率模型移除「專案固定」分支

**Files:**
- Modify: `lib/currency-conversion.ts:102-131,133-170,173-213`
- Test: `tests/lib/currency-conversion.test.ts`, `tests/lib/multi-currency-correctness.test.ts`

**Interfaces:**
- Produces:
  - `interface ResolvedRate { rate: number; source: "same" | "provided" | "live" }`
  - `resolveRate(input: { currency: string; projectCurrency: string; provided?: number | null; liveRate?: number | null }): ResolvedRate`
  - `interface PreviewRateInfo { rate: number | null; source: "same" | "live" | "none" }`
  - `resolvePreviewRate(currency: string, projectCurrency: string, exchangeRates: Record<string, number> | null | undefined): PreviewRateInfo`
  - `previewRate(currency: string, projectCurrency: string, exchangeRates: Record<string, number> | null | undefined): number | null`
  - `type ExpenseRateKind = "market" | "custom"`
  - `resolveExpenseRateMeta(input: { isForeign: boolean; providedRate: number | null; clientKind?: string | null; clientDate?: string | null; now: Date }): ExpenseRateMeta`

- [ ] **Step 1: 改測試為新行為（失敗）**

在 `tests/lib/currency-conversion.test.ts`：刪 `resolveRate` 的 `custom`／`"fixed"` 案例；`resolvePreviewRate` 移除「prefers fixed」案例、改呼叫**三參數**版本；`resolveExpenseRateMeta` 移除「project when `hasProjectFixedRate`」案例，新增：

```ts
it("treats a provided rate with a known kind as that kind", () => {
  expect(resolveExpenseRateMeta({ ...base, isForeign: true, providedRate: 30, clientKind: "custom" }).kind).toBe("custom")
})
it("defaults the project-absent case to market", () => {
  expect(resolveExpenseRateMeta({ ...base, isForeign: true })).toEqual({ kind: "market", date: now })
})
```

在 `tests/lib/multi-currency-correctness.test.ts`：移除 `resolveRate` 矩陣與 `previewRate` 的 project-fixed 案例。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/lib/currency-conversion.test.ts tests/lib/multi-currency-correctness.test.ts`
Expected: FAIL（型別/簽章不符或案例不成立）

- [ ] **Step 3: 改實作**

`lib/currency-conversion.ts`：
- `ResolvedRate.source` 去掉 `"fixed"`；`resolveRate` 刪 `customRate` 參數與 `if (customRate != null)` 分支 → `provided ?? liveRate ?? 1`。
- `PreviewRateInfo.source` 去掉 `"fixed"`；`resolvePreviewRate` 刪 `customRates` 參數與 `custom` 分支；`previewRate` 同步刪參數。
- `ExpenseRateKind` 去掉 `"project"`；`RATE_KINDS = ["market","custom"]`；`resolveExpenseRateMeta` 刪 `hasProjectFixedRate` 參數，`else` 分支固定 `kind = "market"`。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/lib/currency-conversion.test.ts tests/lib/multi-currency-correctness.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/currency-conversion.ts tests/lib/currency-conversion.test.ts tests/lib/multi-currency-correctness.test.ts
git commit -m "refactor(rates): drop project-fixed branch from the rate model"
```

---

### Task 2: 匯率 chip 移除「專案」色系

**Files:**
- Modify: `components/v2/currency/format.ts:6,23-38`; `components/v2/expense-form/amount-card.tsx:10-14`
- Test: `tests/components/v2/currency-format.test.ts`, `tests/components/v2/amount-card.test.tsx`

**Interfaces:**
- Produces:
  - `type RateChipTone = "market" | "custom"`
  - `rateChip(input: { kind: "market" | "custom" | null | undefined; date: Date | string | null | undefined; now: Date }): RateChip | null`
    - market 且同日 → `{ chip: "市場", tone: "market", context: "今天" }`
    - market 其他日 → `{ chip: "市場", tone: "market", context: format(date,"M/d") }`
    - custom → `{ chip: "自訂", tone: "custom", context: "手動輸入" }`
    - 其它 → `null`

- [ ] **Step 1: 改測試（失敗）**

`tests/components/v2/currency-format.test.ts`：刪 `project` 案例；新增斷言 market 同日 → `{chip:"市場",context:"今天"}`、外幣某日 → `context==="10/6"`。
`tests/components/v2/amount-card.test.tsx`：刪 `PROJECT_CHIP` 及相關渲染；保留 market／custom。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/currency-format.test.ts tests/components/v2/amount-card.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改實作**

`format.ts`：`RateChipTone` 去掉 `"project"`；`rateChip` 刪 `"project"` 分支與 `relativeTime` 參數。
`amount-card.tsx`：`CHIP_DOT` 去掉 `project`。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/currency-format.test.ts tests/components/v2/amount-card.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/v2/currency/format.ts components/v2/expense-form/amount-card.tsx tests/components/v2/currency-format.test.ts tests/components/v2/amount-card.test.tsx
git commit -m "refactor(rates): rate chip drops the project tone"
```

---

### Task 3: 支出 draft 移除 promote 與 `project` kind

**Files:**
- Modify: `components/v2/expense-form/use-expense-draft.ts:38-39,71-74,123-144,161-182,194-199,274-276,314-330`
- Test: `tests/components/v2/use-expense-draft.test.tsx:278-352`

**Interfaces:**
- Produces: `DraftExpense.rateKind: "market" | "custom" | null`；移除 `promoteFixedRate` 狀態與 `setPromoteFixedRate` action；`derived.rateKindDisplay = state.rateKind ?? (isForeign ? "market" : null)`。

- [ ] **Step 1: 改測試（失敗）**

`tests/components/v2/use-expense-draft.test.tsx`：
- 刪「marks the default rate as project when the project has a fixed rate」與「tracks the promote-fixed-rate intent …」。
- 新增：`"defaults a foreign rate's kind to market"`（`derived.rateKindDisplay === "market"`）；`"loads a legacy project rate as custom"`（給 `expense.rateKind="project"` 的種子 → `state.rateKind === "custom"` 或 `rateKindDisplay === "custom"`，依實作擇一並固定）；`"clears kind and date when the currency changes to settlement currency"`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/use-expense-draft.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改實作**

`use-expense-draft.ts`：
- 刪 `promoteFixedRate` 欄位、初值、restore、`setPromoteFixedRate` action。
- 還原編輯時：`rateKind === "project" ? "custom" : rateKind`（legacy 映射）。
- `rateKindDisplay` 去掉 `project` 分支 → `state.rateKind ?? (isForeign ? "market" : null)`。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/use-expense-draft.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/v2/expense-form/use-expense-draft.ts tests/components/v2/use-expense-draft.test.tsx
git commit -m "refactor(rates): expense draft drops promote + project kind"
```

---

### Task 4: 「最近用過的匯率」純函式 + 放寬專案支出型別

**Files:**
- Create: `lib/recent-rates.ts`
- Modify: `lib/hooks/useProjectData.ts:34-41`
- Test: `tests/lib/recent-rates.test.ts`（新）

**Interfaces:**
- Produces:
  - `interface RecentRate { rate: number; kind: "market" | "custom"; date: string | null; description: string | null }`
  - `recentRatesFor(input: { expenses: { currency: string; exchangeRate: number | null; rateKind: string | null; rateDate: string | null; description: string | null; expenseDate: string }[]; fromCurrency: string; limit?: number }): RecentRate[]`
    - 取 `currency === fromCurrency` 且有 `exchangeRate > 0` 者；依 `expenseDate` 新→舊；同 `rate` 去重；`rateKind === "project"` 視為 `"custom"`；最多 `limit ?? 5`。

- [ ] **Step 1: 寫失敗測試**

```ts
// tests/lib/recent-rates.test.ts
import { recentRatesFor } from "@/lib/recent-rates"
const e = (o: object) => ({ currency: "JPY", exchangeRate: 0.215, rateKind: "market", rateDate: "2026-10-08", description: "晚餐", expenseDate: "2026-10-08", ...o })
it("lists foreign rates newest-first, deduped, capped", () => {
  const rows = recentRatesFor({ expenses: [e({}), e({ exchangeRate: 0.22, rateKind: "custom", description: "藥妝", expenseDate: "2026-10-06" }), e({ exchangeRate: 0.215, description: "dup", expenseDate: "2026-10-01" }), e({ currency: "TWD", exchangeRate: null })], fromCurrency: "JPY" })
  expect(rows.map(r => r.rate)).toEqual([0.215, 0.22])
})
it("maps a legacy project kind to custom", () => {
  expect(recentRatesFor({ expenses: [e({ rateKind: "project" })], fromCurrency: "JPY" })[0].kind).toBe("custom")
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/lib/recent-rates.test.ts`
Expected: FAIL（module not found）

- [ ] **Step 3: 實作 `lib/recent-rates.ts`**（依 Interfaces 的規則）。

- [ ] **Step 4: 放寬 `useProjectData` 型別**

`lib/hooks/useProjectData.ts`：把 `Project.expenses` 由 `{ expenseDate: string }[]` 擴為含 `currency: string; exchangeRate: number | null; rateKind: string | null; rateDate: string | null; description: string | null`（`app/api/projects/[id]/route.ts` GET 已在 runtime 回傳這些純量）。

- [ ] **Step 5: 跑測試確認通過**

Run: `npx vitest run tests/lib/recent-rates.test.ts tests/lib/hooks/useProjectData.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/recent-rates.ts lib/hooks/useProjectData.ts tests/lib/recent-rates.test.ts
git commit -m "feat(rates): recent-rates helper for the reuse list"
```

---

### Task 5: 匯率面板改為「市場／自訂」兩個 tab

**Files:**
- Modify: `components/v2/expense-form/rate-sheet.tsx`（整檔）
- Test: `tests/components/v2/rate-sheet.test.tsx`（改寫）

**Interfaces:**
- Produces:
  ```ts
  export interface RateSheetProps {
    open: boolean; onClose: () => void
    fromCurrency: string; toCurrency: string; amount: number
    rate: number | null; customRate: boolean
    liveRate: number | null; liveTimestamp?: number | null
    expenseDate: Date
    appliedKind?: "market" | "custom" | null
    recentRates: RecentRate[]
    onUseRate: (rate: number, kind: "market" | "custom", date?: string) => void
    onReset: () => void
  }
  ```
- Consumes: `RecentRate`（Task 4）、`rateFromRates`／`formatRelativeTime`（`components/v2/currency/format.ts`）。
- 移除：`projectFixedRate`、`promoteFixedRate`、`onPromoteChange`、`TABS`（即時/歷史/自訂）、`AppliedKind` 的 `default/live/history`。

- [ ] **Step 1: 改寫測試（失敗）**

`tests/components/v2/rate-sheet.test.tsx`（沿用既有 `setup` mock `useAuthFetch`）：
- `"shows two tabs 市場 and 自訂"`：`getByRole("tab", {name:"市場"})`、`{name:"自訂"}` 存在；`queryByText("專案固定匯率")` 為 null。
- `"market tab defaults to today and uses the live rate"`：預設日期＝今天、顯示 `liveRate`、按「使用」→ `onUseRate(liveRate, "market")`。
- `"changing the date fetches that day's rate"`：`fireEvent.change(dateInput,{value:"2026-10-06"})` → `expect(authFetch).toHaveBeenCalledWith(expect.stringContaining("date=2026-10-06"))`，顯示抓到的值，按「使用」→ `onUseRate(history, "market", "2026-10-06")`。
- `"shows an error and keeps the rate when the lookup fails"`：mock 失敗 → 顯示錯誤字、`onUseRate` 未被呼叫。
- `"custom tab prefills the most recent rate and can reuse one"`：傳 `recentRates` 兩筆 → 輸入框預填第 1 筆；點第 2 筆 → 輸入框變第 2 筆、顯示「沿用」；按「使用」→ `onUseRate(值, "custom")`。
- `"custom tab disables use for an invalid value"`：輸入 `""`→disabled；`0`／`-1`／`abc`→disabled。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/rate-sheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改寫 `rate-sheet.tsx`**

- 標題保留；下面兩顆 tab：`市場`／`自訂`（`role="tab"`）。
- **市場 pane**：`<input type="date" max={today} value={date} onChange={…}>`；`date === today` → 顯示 `liveRate`＋「今天」；否則 `onChange` 內 `authFetch(\`/api/exchange-rates?date=${date}\`)` → `rateFromRates(from,to,data.rates)`；成功存 `historyRate`，失敗顯示錯誤（**不清 `rate`**）。「使用」→ `onUseRate(值, "market", date)`（today 不傳 date）。
- **自訂 pane**：輸入框預填 `recentRates[0]?.rate ?? rate`；清單列 `recentRates`（值／來源小標／日期／描述），點一筆填入並標「沿用」；「使用」→ `onUseRate(值, "custom")`；無效值 disabled。
- 底部：`還原預設`（`onReset`）；移除「同時設為專案固定匯率」整段。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/rate-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/v2/expense-form/rate-sheet.tsx tests/components/v2/rate-sheet.test.tsx
git commit -m "feat(rates): market/custom rate sheet"
```

---

### Task 6: 表單視圖組裝（chip／面板）

**Files:**
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx:23-43,52,62-79,130-160`
- Test: `tests/components/v2/expense-form-v2-view.test.tsx`

**Interfaces:**
- Consumes: `RateSheetProps`（Task 5）、`rateChip`（Task 2）。
- Produces: `ExpenseFormV2ViewProps` 移除 `rateContext.fixedRate`（改 `rateContext?: (currency) => { liveRate: number | null; liveTimestamp: number | null }`），新增 `recentRates?: (currency: string) => RecentRate[]`；`previewRateInfo` 的 `source` 收斂為 `"same" | "live" | "none"`。

- [ ] **Step 1: 改測試（失敗）**

`tests/components/v2/expense-form-v2-view.test.tsx`：把 `previewRateInfo` 的 `"fixed"` 拿掉；新增：`"shows the market chip for a live rate"`、`"shows the custom chip after a manual override"`（`state.rateKind === "custom"`）、`"opens the sheet with recent rates"`（點匯率列 → 面板出現、清單有傳入的項目）。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改實作**

- chip：`rateChip({ kind: rateKind, date: rateDate ?? (rateKind === "market" ? new Date() : null), now: new Date() })`（移除 `relativeTime`）。
- `rateCtx` 只保留 `liveRate`／`liveTimestamp`。
- `RateSheet`：傳 `liveRate`／`liveTimestamp`／`appliedKind={rateKind}`／`recentRates={props.recentRates?.(state.currency) ?? []}`；移除 `projectFixedRate`／`promoteFixedRate`／`onPromoteChange`；`onReset` 移除 `setPromoteFixedRate`。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/v2/expense-form/expense-form-v2-view.tsx tests/components/v2/expense-form-v2-view.test.tsx
git commit -m "feat(rates): wire the market/custom sheet into the expense view"
```

---

### Task 7: 表單容器（不再用 customRates、組最近清單、存檔）

**Files:**
- Modify: `components/v2/expense-form/expense-form-v2.tsx:49,161,176-205,271-294,347-348`
- Test: `tests/components/v2/expense-form-preview.test.tsx`

**Interfaces:**
- Consumes: `recentRatesFor`（Task 4）、`resolvePreviewRate` 新簽章（Task 1）。
- Produces: 容器停用 `customRates`；`previewRateInfo = (c) => resolvePreviewRate(c, projectCurrency, exchangeRates)`；`recentRates = (c) => recentRatesFor({ expenses: project.expenses ?? [], fromCurrency: c })`；存檔 payload 不再送 `promoteRate`。

- [ ] **Step 1: 改測試（失敗）**

`tests/components/v2/expense-form-preview.test.tsx`：專案 mock 加一筆 JPY 支出（含 `exchangeRate`）；新增：`"previews with the live rate, not a project fixed rate"`（`previewRateInfo` 走 live）、`"passes recent JPY rates to the sheet"`（開面板 → 清單出現該筆）、`"does not send promoteRate on save"`（`expect(body).not.toHaveProperty("promoteRate")`）。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/expense-form-preview.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改實作**（依 Interfaces；`LoadedForm` 不再接收/使用 `customRates`）。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/expense-form-preview.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/v2/expense-form/expense-form-v2.tsx tests/components/v2/expense-form-preview.test.tsx
git commit -m "feat(rates): expense container uses live + recent list, drops promote"
```

---

### Task 8: AI 快速記帳移除 promote 與專案固定匯率

**Files:**
- Modify: `components/v2/quick-expense/quick-expense-v2.tsx:31,43,50-51`; `components/v2/quick-expense/quick-item-card.tsx:52-71,142-194`; `lib/quick-expense/draft.ts:19,65`; `lib/quick-expense/parse.ts:59`; `lib/quick-expense/use-quick-save.ts:64`
- Test: `tests/components/v2/quick-expense/quick-item-card.test.tsx`, `tests/lib/quick-expense/use-quick-save.test.ts`

**Interfaces:**
- Consumes: Task 1／2 的新簽章；`resolvePreviewRate(c, projectCurrency, exchangeRates)`。
- Produces: `QuickItem` 移除 `promoteFixedRate`；卡片 chip 只用 `market`／`custom`（`rateSource === "live" → "market"`、`"custom" → "custom"`，其餘 `null`）。

- [ ] **Step 1: 改測試（失敗）**

`quick-item-card.test.tsx`：刪 promote 勾選／幣別清除 promote 的案例；改 chip 斷言（live→`市場`）。
`use-quick-save.test.ts`：刪「sends promoteRate …」；「omits promoteRate …」改為斷言**永遠**不含 `promoteRate`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/quick-expense/quick-item-card.test.tsx tests/lib/quick-expense/use-quick-save.test.ts`
Expected: FAIL

- [ ] **Step 3: 改實作**（移除 footer 的「設為專案固定匯率」；`quick-expense-v2` 不再傳 `customRates` 給 `resolvePreviewRate`；`use-quick-save` 不再送 `promoteRate`）。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/quick-expense/quick-item-card.test.tsx tests/lib/quick-expense/use-quick-save.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/v2/quick-expense lib/quick-expense tests/components/v2/quick-expense/quick-item-card.test.tsx tests/lib/quick-expense/use-quick-save.test.ts
git commit -m "refactor(rates): quick-expense drops promote + project fixed rate"
```

---

### Task 9: 建立支出 API 不再用專案固定匯率

**Files:**
- Modify: `app/api/projects/[id]/expenses/route.ts:110-116,211-250,332-338`
- Test: `tests/api/expenses.test.ts`

**Interfaces:**
- Consumes: `resolveRate`／`resolveExpenseRateMeta` 新簽章（Task 1）。
- Produces: create 不再選/讀 `customRates`、不再 `resolveRate({customRate})`、不再有 `promoteRate` 區塊；`rateKind` 由 meta 寫入（`"market" | "custom"`）。

- [ ] **Step 1: 改測試（失敗）**

`tests/api/expenses.test.ts`：
- 刪「records a project rate meta …」、「writes a promoted rate into the project fixed rates」、「honours a stored fixed rate even when a legacy rateSource says live」。
- 新增：`"a foreign expense defaults to a market rate meta even when customRates exist"`（mock 專案 `customRates:{USD:30}` → `rateKind==="market"`、`exchangeRate` 為即時）、`"ignores a promoteRate flag"`（送 `promoteRate:true` → **不** `project.update`）。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: FAIL

- [ ] **Step 3: 改實作**（刪 `customRates` 讀取、`customRate:` 參數、promote 區塊；`resolveExpenseRateMeta` 不傳 `hasProjectFixedRate`；`project` select 不再需要 `customRates`）。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/expenses/route.ts tests/api/expenses.test.ts
git commit -m "refactor(rates): expense create ignores project fixed rates"
```

---

### Task 10: 編輯支出 API 不再用專案固定匯率

**Files:**
- Modify: `app/api/projects/[id]/expenses/[expenseId]/route.ts:112,279-334,508-514`
- Test: `tests/api/expenses.test.ts`

**Interfaces:** 同 Task 9（改為 update 路徑）。

- [ ] **Step 1: 改測試（失敗）**

`tests/api/expenses.test.ts`：刪「overwrites an existing fixed rate when a promoted rate is saved on edit」、「leaves the project fixed rates untouched on edit without promoteRate」；新增 `"editing a foreign expense recomputes with the live rate"`、`"edit ignores a promoteRate flag"`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: FAIL

- [ ] **Step 3: 改實作**（同 Task 9 的減法，套在 update 路徑；`resolveRate` 不傳 `customRate`、meta 不傳 `hasProjectFixedRate`、刪 promote 區塊）。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/expenses/[expenseId]/route.ts tests/api/expenses.test.ts
git commit -m "refactor(rates): expense edit ignores project fixed rates"
```

---

### Task 11: 結算不再偏好專案固定匯率

**Files:**
- Modify: `app/api/projects/[id]/settle/route.ts:150-156,230-247,346-368`; `components/v2/settle/settle-v2-view.tsx:58-74`
- Test: `tests/api/settle.test.ts`, `tests/components/v2/settle-v2.test.tsx`

**Interfaces:**
- Produces: `exchangeRatesUsed[c] = 即時匯率`；`summary` 移除 `usingCustomRates`／`hasCustomRates`（保留 `exchangeRatesUsed`／`defaultRates`）；結算視圖文案一律「使用即時匯率結算」、移除「（自訂）」標記。

- [ ] **Step 1: 改測試（失敗）**

`tests/api/settle.test.ts`：新增 `"uses the live rate, ignoring customRates"`（專案 `customRates:{USD:30}`，無快照的舊支出 → 用即時換算）、`"does not expose usingCustomRates/hasCustomRates"`（`expect(data.summary).not.toHaveProperty("usingCustomRates")`）。加一個**快照不變**案例：有 `amountProject` 的支出即使設了 `customRates`，結算金額不變。
`tests/components/v2/settle-v2.test.tsx`：文案改為「使用即時匯率結算」，移除「（自訂）」。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/api/settle.test.ts tests/components/v2/settle-v2.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改實作**（settle 路由刪 `customRates` select/讀取與 summary flags；視圖移除條件文案與標記）。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/api/settle.test.ts tests/components/v2/settle-v2.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/settle/route.ts components/v2/settle/settle-v2-view.tsx tests/api/settle.test.ts tests/components/v2/settle-v2.test.tsx
git commit -m "refactor(rates): settlement uses live rates only"
```

---

### Task 12: 存檔 payload 型別清理

**Files:**
- Modify: `lib/hooks/useSaveExpense.ts:19-22`
- Test: `tests/lib/hooks/useSaveExpense*.test.ts`（若無則併入既有覆蓋）

**Interfaces:**
- Produces: `ExpensePayload.rateKind?: "market" | "custom" | null`；移除 `promoteRate`。

- [ ] **Step 1: 改測試**（若有型別相關斷言，改為無 `promoteRate`）。

- [ ] **Step 2: 改實作**（刪 `promoteRate`、收斂 `rateKind` 型別）。

- [ ] **Step 3: 跑測試**

Run: `npx vitest run tests/lib/hooks`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useSaveExpense.ts tests/lib/hooks
git commit -m "refactor(rates): drop promoteRate from the save payload type"
```

---

### Task 13: 全量驗證

- [ ] **Step 1: 全套測試**

Run: `npm run test:run`
Expected: 全綠（已知與本工作無關的 `tests/integration/vision-models.integration.test.ts` 若失敗，記錄但不阻擋）。

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors。

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 不得新增錯誤（既有 `tests/api/expenses.test.ts` 的 9 行既有錯誤不算）。

- [ ] **Step 4: 手動煙霧測試**（dev server）

開 `http://localhost:3000/projects/<id>/expenses/new`：外幣（JPY）→ 金額卡顯示 `市場`；開匯率面板 → 只有 `市場`／`自訂` 兩 tab；市場改日期 → 顯示歷史值；自訂預填最近用過的值、清單可沿用；存檔後結算頁顯示「使用即時匯率結算」。

- [ ] **Step 5: Commit（若煙霧測試有微調）**

```bash
git add -A && git commit -m "test(rates): phase-1 verification fixes"
```

---

## Self-Review

- **Spec coverage**：spec 3（模型）→ Task 1／3；4.1（面板）→ Task 5；4.2（標籤）→ Task 2；4.3（AI）→ Task 8；4.4（結算顯示）→ Task 11；5（資料/介面，Phase 1 停止使用）→ Task 7／9／10／11／12；4.5–4.7、Phase 2／3 → **不在本計畫**（後續計畫）。
- **Type consistency**：`RecentRate` 於 Task 4 定義、Task 5／6 使用；`resolvePreviewRate`／`resolveExpenseRateMeta` 簽章於 Task 1 定義、Task 6／7／8／9／10 使用；`ExpenseRateKind` 收斂後 `rateKind` payload 型別於 Task 12 對齊。
- **Review Focus**：每條都有對應測試（Task 3／5／6／11）。
- **Proportion**：以簽章＋測試斷言為主，未轉錄函式內容。

## 後續（不在本計畫）

- **Phase 2**：移除專案設定「固定匯率」區塊（`project-settings-v2*`、`fixed-rate-sheet.tsx`）、匯率頁「專案自訂匯率」（`currency-v2*`）、匯出（`export-*`）、總覽（`project-overview-v2`）的 `customRates` UI；`useCurrencyConversion` 的 `customRates` 選項與其餘呼叫端。
- **Phase 3**：清除 API payload（專案 PUT 的 `customRates`／`rateSource`）、舊版 V1 的 `customRates` 參照、`scripts/backfill-multi-currency.mjs`，並**遷移刪除** `Project.customRates` 欄位與既有 `rateKind="project"` 的資料遷移。
