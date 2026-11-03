# 專案匯率設定（來源 + 設定頁 UX）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓「專案匯率」可預期又可逆——設定頁顯示最小單位、新增幣別自動帶入即時匯率、移除匯率計算精度欄位，並加上專案層級的「固定/即時」匯率來源開關。

**Architecture:** 兩階段。Phase A 只動設定頁與「金額四捨五入位數」的來源（由 `exchangeRatePrecision` 改為 `getCurrencyDecimals(專案幣別)`）。Phase B 讓 `Project.rateSource` 真正生效：新增一個 `effectiveCustomRates()` 純函式，把所有「有自訂用自訂」的消費端集中改用它，並移除自動 seed。

**Tech Stack:** Next.js 16 (App Router, Turbopack)、React 19、Prisma 6、Vitest + Testing Library、Tailwind（v2 設計 token）。

**Spec:**
- `docs/superpowers/specs/2026-10-10-project-settings-rate-ux-design.md`
- `docs/superpowers/specs/2026-10-09-project-rate-source-design.md`

## Global Constraints

- 匯率顯示一律 **6 位有效數字**（`roundRateForDisplay`）；金額顯示依該幣別最小單位（`formatAmount`）。
- 最小單位：`getCurrencyDecimals()`（TWD/JPY/KRW/VND = 0，其他多數 = 2）。
- `rateSource` 僅允許 `"fixed" | "live"`，預設 `"fixed"`。
- 既有支出**不重算**（結算用已存的 `*Project` 整數快照）。
- 每個任務：先寫失敗測試（RED）→ 觀察失敗 → 最小實作（GREEN）→ 全套通過 → commit。
- 指令：`npx vitest run <path>`；全套 `npm run test:run`；lint `npm run lint`。
- 每完成一個任務即 commit（訊息見各任務）。

## Review Focus

1. **新增幣別時即時匯率尚未載入**（`rates` 為空）→ 不可預填 `0`/`NaN`；應留空並顯示「讀取中…」。
2. **0 位小數結算幣別（TWD）的 legacy 換算** → 不得出現小數（不可殘留 `precision=2`）。
3. **舊資料 / 未帶 `rateSource`** → 必須視為 `"fixed"`（不可默默變成 live）。
4. **清空單一幣別固定值後儲存** → `customRates` payload 只移除該幣別，其餘保留。
5. **`rateSource="live"` 但 `customRates` 仍有值** → 表單預覽／清單／匯出／結算一律用即時（不得顯示固定值）。

---

## Phase A — 設定頁 UX 與精度移除

### Task A1: 幣別最小單位文字 helper

**Files:**
- Modify: `lib/constants/currencies.ts`
- Test: `tests/lib/currencies.test.ts`

**Interfaces:**
- Produces: `minorUnitLabel(currencyCode: string): string` — 0 位 → `"1 TWD（無小數）"`；2 位 → `"0.01 USD"`。

- [ ] **Step 1: Write the failing test**（加在 `tests/lib/currencies.test.ts` 的 import 與新 `describe`）

```ts
import { minorUnitLabel } from "@/lib/constants/currencies"
// ...
describe("minorUnitLabel", () => {
  it("labels a zero-decimal currency", () => {
    expect(minorUnitLabel("TWD")).toBe("1 TWD（無小數）")
    expect(minorUnitLabel("JPY")).toBe("1 JPY（無小數）")
  })
  it("labels a two-decimal currency", () => {
    expect(minorUnitLabel("USD")).toBe("0.01 USD")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/currencies.test.ts`
Expected: FAIL — `minorUnitLabel is not a function`.

- [ ] **Step 3: Implement** in `lib/constants/currencies.ts`

```ts
/** Human label for a currency's minor unit, e.g. "1 TWD（無小數）" / "0.01 USD". */
export function minorUnitLabel(currencyCode: string): string {
  const decimals = getCurrencyDecimals(currencyCode)
  if (decimals === 0) return `1 ${currencyCode}（無小數）`
  return `${(10 ** -decimals).toFixed(decimals)} ${currencyCode}`
}
```

- [ ] **Step 4: Run test to verify it passes** → `npx vitest run tests/lib/currencies.test.ts` (PASS)

- [ ] **Step 5: Commit**

```bash
git add lib/constants/currencies.ts tests/lib/currencies.test.ts
git commit -m "feat(currency): add minor-unit label helper"
```

### Task A2: 設定頁顯示最小單位

**Files:**
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`
- Modify: `components/v2/project-settings/exchange-rate-row.tsx`
- Test: `tests/components/v2/project-settings-v2.test.tsx`

**Interfaces:**
- Consumes: `minorUnitLabel` (Task A1); `getCurrencyDecimals` (`lib/constants/currencies`).
- Produces: DOM `data-testid="settlement-minor-unit"`；`ExchangeRateRow` 新增 prop `minorUnit?: string`（尾端小字）。

- [ ] **Step 1: Write the failing test** — 斷言結算幣別下方出現最小單位、每列出現該幣別最小單位。

```ts
it("shows the settlement currency's minor unit", () => {
  renderSettings({ currency: "TWD" }) // 既有 renderSettings helper
  expect(screen.getByTestId("settlement-minor-unit")).toHaveTextContent("1 TWD（無小數）")
})
it("labels each currency row with its minor unit", () => {
  renderSettings({ currency: "TWD", customRates: { JPY: "0.21" } })
  expect(screen.getByText(/0\.01 JPY/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails** → `npx vitest run tests/components/v2/project-settings-v2.test.tsx` (FAIL)

- [ ] **Step 3: Implement** — 在結算幣別欄位下加 `<p data-testid="settlement-minor-unit">最小單位：{minorUnitLabel(values.currency)}</p>`；`rateCurrencies.map` 傳 `minorUnit={minorUnitLabel(curr)}` 給 `ExchangeRateRow`，於尾端 `<span className="text-xs text-v2-ink-subtle">{minorUnit}</span>`。

- [ ] **Step 4: Run to verify it passes** (PASS)

- [ ] **Step 5: Commit** `git commit -m "feat(v2): show currency minor units in project settings"`

### Task A3: 新增幣別以即時匯率預填 + 狀態文案

**Files:**
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`
- Modify: `components/v2/project-settings/exchange-rate-row.tsx`
- Test: `tests/components/v2/project-settings-v2.test.tsx`

**Interfaces:**
- Consumes: `rates`（已傳入 view）、`roundRateForDisplay`、`rateFromRates`（`components/v2/currency/format`）、`liveRate()`（view 內既有 helper）。
- Produces: 新增幣別後該列輸入框值 = `String(roundRateForDisplay(live))`；每列小字反映狀態。

- [ ] **Step 1: Write the failing tests**

```ts
it("prefills the live rate when adding a currency", () => {
  renderSettings({ currency: "TWD" }, { rates: { TWD: 1, JPY: 0.21 } })
  fireEvent.change(screen.getByLabelText("新增幣別"), { target: { value: "JPY" } })
  fireEvent.click(screen.getByRole("button", { name: "新增" }))
  expect(screen.getByLabelText("JPY 匯率")).toHaveValue("0.21")
})
it("keeps the new row empty while rates are loading", () => {
  renderSettings({ currency: "TWD" }, { rates: {} })
  fireEvent.change(screen.getByLabelText("新增幣別"), { target: { value: "JPY" } })
  fireEvent.click(screen.getByRole("button", { name: "新增" }))
  expect(screen.getByLabelText("JPY 匯率")).toHaveValue("")
  expect(screen.getByText("即時匯率讀取中…")).toBeInTheDocument()
})
it("reflects filled vs empty in the row hint", () => {
  renderSettings({ currency: "TWD", customRates: { JPY: "0.2" } }, { rates: { TWD: 1, JPY: 0.21 } })
  expect(screen.getByText(/使用自訂匯率/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails** (FAIL)

- [ ] **Step 3: Implement** — 「新增」onClick：

```ts
const live = liveRate(props.rates, pendingCurrency, values.currency, 8) // 1 該幣別 = X 結算幣別
const value = live != null && live > 0 ? String(roundRateForDisplay(live)) : ""
set("customRates", { ...values.customRates, [pendingCurrency]: value })
setPendingCurrency("")
```

`ExchangeRateRow` 的即時小字改為：`value.trim() === ""` 且有 `liveRate` → `使用即時匯率：1 {currency} = {live} {settlement}`；`value.trim() !== ""` → `使用自訂匯率：1 {currency} = {value} {settlement}`；`liveRate == null` → `即時匯率讀取中…`。（`liveRate` prop 由 view 以 `roundRateForDisplay(liveRate(…))` 傳入。）

- [ ] **Step 4: Run to verify it passes** (PASS)

- [ ] **Step 5: Commit** `git commit -m "feat(v2): prefill the live rate when adding a currency"`

### Task A4: 從表單移除 exchangeRatePrecision

**Files:**
- Modify: `lib/hooks/use-project-form.ts`
- Modify: `components/v2/project-settings/project-settings-v2.tsx` (`EMPTY_VALUES`, `mapProjectToForm`, `ProjectRecord`)
- Test: `tests/lib/hooks/use-project-form.test.ts`, `tests/components/v2/project-settings-v2.test.tsx`

**Interfaces:**
- Produces: `ProjectFormValues` 不再有 `exchangeRatePrecision`；`toUpdatePayload` 不含它。

- [ ] **Step 1: Update failing tests** — 移除 `emptyProjectForm`/`toUpdatePayload` 斷言中的 `exchangeRatePrecision`；刪除「匯率精度需為 0 到 8 的整數」案例。在 `project-settings-v2.test.tsx` 加：

```ts
it("no longer sends exchangeRatePrecision", () => {
  // ...save flow
  expect(body).not.toHaveProperty("exchangeRatePrecision")
})
```

- [ ] **Step 2: Run to verify it fails** (FAIL)

- [ ] **Step 3: Implement** — 從 `ProjectFormValues`、`emptyProjectForm`、`validateProjectForm`、`toUpdatePayload` 移除該欄位；`EMPTY_VALUES` 與 `mapProjectToForm` 同步移除（`ProjectRecord.exchangeRatePrecision` 可留作型別相容，但不再讀取）。

- [ ] **Step 4: Run to verify it passes** (PASS)

- [ ] **Step 5: Commit** `git commit -m "refactor(v2): drop exchangeRatePrecision from the project form"`

### Task A5: 設定頁移除精度欄位；API 忽略它

**Files:**
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`
- Modify: `app/api/projects/[id]/route.ts`
- Test: `tests/components/v2/project-settings-v2.test.tsx`, `tests/api/project-detail.test.ts`

- [ ] **Step 1: Write failing tests** — 設定頁 `queryByLabelText("匯率計算精度")` 不存在；API：送 `exchangeRatePrecision` 時不再寫入 `updateData.exchangeRatePrecision`（`prisma.project.update` 的 `data` 不含該鍵）。

- [ ] **Step 2: Run to verify it fails** (FAIL)

- [ ] **Step 3: Implement** — view 移除精度 `div`；`PUT` 移除對 `exchangeRatePrecision` 的解構與 `updateData.exchangeRatePrecision = …`（欄位在 DB 保留）。同步移除 `npx eslint` 會抓到的未用變數。

- [ ] **Step 4: Run to verify it passes** (PASS)

- [ ] **Step 5: Commit** `git commit -m "refactor(v2): remove the rate-precision field"`

### Task A6: 金額四捨五入改依結算幣別最小單位

**Files:**
- Modify: `app/api/projects/[id]/settle/route.ts`
- Modify: `lib/hooks/useCurrencyConversion.ts`
- Modify: `lib/hooks/useProjectData.ts`, `lib/hooks/useProjectOverview.ts`
- Modify: `components/v2/currency/currency-v2.tsx`（`convertedAmount` 的 `* 100` 硬編）
- Test: `tests/api/settle.test.ts`, `tests/lib/hooks/useCurrencyConversion.test.ts`, `tests/lib/hooks/useProjectData.test.ts`

**Interfaces:**
- Consumes: `getCurrencyDecimals` (`lib/constants/currencies`).
- Produces: `useProjectData().precision` 語意改為「結算幣別小數位」；`settle` 的 `roundToPrecision` 與 `calculateOptimalSettlements(balances, decimals)` 改用 `getCurrencyDecimals(projectCurrency)`。

- [ ] **Step 1: Write failing tests**

```ts
// settle.test.ts：TWD 專案，legacy（payer 無 amountProject）100 JPY × 0.21 → 21（整數）
it("rounds legacy conversion to the settlement currency's minor unit", async () => { /* ... */ })
// useCurrencyConversion.test.ts
it("converts to whole units for a zero-decimal currency", () => {
  const { result } = renderHook(() => useCurrencyConversion({ projectCurrency: "TWD", customRates: { JPY: 0.21 } }))
  expect(result.current.convert(100, "JPY")).toBe(21)
})
// useProjectData.test.ts：precision 由幣別決定
it("derives precision from the settlement currency", async () => {
  /* TWD → 0, USD → 2 */
})
```

- [ ] **Step 2: Run to verify it fails** (FAIL)

- [ ] **Step 3: Implement** — `settle`: `const decimals = getCurrencyDecimals(projectCurrency)`；所有 `roundToPrecision(x, precision)` → `roundToPrecision(x, decimals)`（或新增 `roundToMinorUnit`）；`calculateOptimalSettlements(balances, decimals)`。`useProjectData`/`useProjectOverview`: `precision: getCurrencyDecimals(project?.currency || DEFAULT_CURRENCY)`。`useCurrencyConversion.convert`: 以 `getCurrencyDecimals(projectCurrency)` 取代 `options.precision`（移除 `precision` 選項，或保留但預設由幣別推導）。`currency-v2` 的 `convertedAmount` 改用 `fromMinorUnits(toMinorUnits(numeric*rate, projectCurrency), projectCurrency)`。

- [ ] **Step 4: Run to verify it passes**（含 `npm run test:run` 全套）(PASS)

- [ ] **Step 5: Commit** `git commit -m "refactor: round amounts by the settlement currency's minor unit"`

---

## Phase B — 匯率來源（固定 / 即時）

### Task B1: effectiveCustomRates helper

**Files:**
- Modify: `lib/currency-conversion.ts`
- Test: `tests/lib/currency-conversion.test.ts`

**Interfaces:**
- Produces:

```ts
export function effectiveCustomRates(
  rateSource: "fixed" | "live" | null | undefined,
  customRates: Record<string, number> | null | undefined,
): Record<string, number> | null
```

- [ ] **Step 1: Write failing tests** — `live` → `null`；`fixed`/`undefined` → 原值；`undefined` 的 customRates → `null`。

- [ ] **Step 2: RED** → `npx vitest run tests/lib/currency-conversion.test.ts` (FAIL)

- [ ] **Step 3: Implement** — 見上方簽名（`rateSource === "live" ? null : customRates ?? null`）。

- [ ] **Step 4: GREEN** (PASS)

- [ ] **Step 5: Commit** `git commit -m "feat(currency): add effectiveCustomRates helper"`

### Task B2: Project API 與 useProjectData 帶出 rateSource

**Files:**
- Modify: `app/api/projects/[id]/route.ts`（GET 確認帶出、PUT 驗證寫入）
- Modify: `lib/hooks/useProjectData.ts`（`Project.rateSource`、回傳 `rateSource` + `effectiveCustomRates`）
- Test: `tests/api/project-detail.test.ts`, `tests/lib/hooks/useProjectData.test.ts`

**Interfaces:**
- Produces: `useProjectData().rateSource: "fixed" | "live"`；`useProjectData().effectiveCustomRates: Record<string, number> | null`。

- [ ] **Step 1: Write failing tests** — PUT `{ rateSource: "live" }` → `updateData.rateSource === "live"`；PUT `{ rateSource: "bogus" }` → 400 或不寫入；`useProjectData` 回傳 `rateSource`（預設 fixed）與 `effectiveCustomRates`（live 時為 null）。

- [ ] **Step 2: RED** (FAIL)

- [ ] **Step 3: Implement** — `route.ts` PUT：解構 `rateSource`，`if (rateSource !== undefined) { if (rateSource === "fixed" || rateSource === "live") updateData.rateSource = rateSource; else return 400 }`。`useProjectData`：`Project` 加 `rateSource?: string`；回傳 `rateSource: (project?.rateSource === "live" ? "live" : "fixed")`、`effectiveCustomRates: effectiveCustomRates(rateSource, customRates)`。

- [ ] **Step 4: GREEN** (PASS)

- [ ] **Step 5: Commit** `git commit -m "feat(api): persist and expose the project rate source"`

### Task B3: 設定頁「匯率來源」開關

**Files:**
- Modify: `lib/hooks/use-project-form.ts`（`rateSource: "fixed" | "live"`、payload）
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`（segmented）
- Modify: `components/v2/project-settings/project-settings-v2.tsx`（載入/送出）
- Test: `tests/lib/hooks/use-project-form.test.ts`, `tests/components/v2/project-settings-v2.test.tsx`

**Interfaces:**
- Consumes: Task B2 的 `rateSource`。
- Produces: `ProjectFormValues.rateSource`；`toUpdatePayload` 帶上 `rateSource`。

- [ ] **Step 1: Write failing tests** — `emptyProjectForm` 含 `rateSource: "fixed"`；`toUpdatePayload(v({ rateSource: "live" }))` 含 `rateSource: "live"`；view：切到「即時匯率」後儲存 body 的 `rateSource === "live"`；live 模式顯示「目前為即時匯率模式，以下固定匯率暫不使用」。

- [ ] **Step 2: RED** (FAIL)

- [ ] **Step 3: Implement** — form 型別/預設/payload；view 在卡片頂端加兩段式按鈕（沿用 `optionButtonClass` 風格）；live 時的自訂匯率區塊加提示（值仍可編輯）。

- [ ] **Step 4: GREEN** (PASS)

- [ ] **Step 5: Commit** `git commit -m "feat(v2): project rate-source toggle in settings"`

### Task B4: 移除自動 seed

**Files:**
- Modify: `lib/currency-conversion.ts`（`resolveRate` 移除 `shouldSeedFixed`，`"seeded"` → `"live"`）
- Modify: `app/api/projects/[id]/expenses/route.ts`、`app/api/projects/[id]/expenses/[expenseId]/route.ts`（移除 `seedRate` 與 `project.update`）
- Test: `tests/lib/currency-conversion.test.ts`, `tests/lib/multi-currency-correctness.test.ts`, `tests/api/expenses.test.ts`

**Interfaces:**
- Produces: `resolveRate(...) → { rate: number; source: "same" | "provided" | "fixed" | "live" }`（無 `shouldSeedFixed`）。

- [ ] **Step 1: Update failing tests** — 移除 `shouldSeedFixed`/`seeded` 斷言；新增：外幣 create/edit 後 `prisma.project.update`（seed）**未被呼叫**。

- [ ] **Step 2: RED** (FAIL)

- [ ] **Step 3: Implement** — 移除回傳欄位與兩處 `if (seedRate != null) { tx.project.update(...) }`。

- [ ] **Step 4: GREEN** (PASS)

- [ ] **Step 5: Commit** `git commit -m "refactor: stop auto-seeding the project fixed rate"`

### Task B5: 消費端改用 effectiveCustomRates

**Files:**
- Modify: `components/v2/expense-form/expense-form-v2.tsx`（`previewRateInfo`、`rateContext.fixedRate`）
- Modify: `components/v2/quick-expense/quick-expense-v2.tsx`
- Modify: `components/v2/expenses/expenses-v2.tsx`
- Modify: `components/v2/export/export-v2.tsx`
- Modify: `components/v1/expenses/expenses-v1.tsx`、`components/v1/export/export-v1.tsx`、`components/v1/stats/stats-v1.tsx`
- Modify: `app/api/projects/[id]/settle/route.ts`（legacy fallback 與 `usingCustomRates`）
- Test: `tests/components/v2/expense-form-preview.test.tsx`, `tests/api/settle.test.ts`

**Interfaces:**
- Consumes: `useProjectData().effectiveCustomRates`；`effectiveCustomRates()` (Task B1)。

- [ ] **Step 1: Write failing test**

```ts
// expense-form-preview：專案的 API mock 帶 rateSource:"live" 且 customRates:{JPY:0.01}
it("ignores fixed rates when the project is in live mode", async () => {
  render(<ExpenseFormV2 projectId="p1" mode="create" />)
  fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "1000" } })
  fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "JPY" } })
  // 預覽金額用即時匯率（非固定的 0.01），chip 顯示「即時」
  expect(await screen.findByTestId("rate-source")).toHaveTextContent("即時")
  expect(screen.getByTestId("amount-conversion")).toHaveTextContent("≈ USD 6.70")
})
```

- [ ] **Step 2: RED** (FAIL)

- [ ] **Step 3: Implement** — 把「傳給 `previewRateInfo`/`useCurrencyConversion`/`export-data`/`settle` 的 customRates」改用 `effectiveCustomRates(rateSource, customRates)`（v2 取 `useProjectData().effectiveCustomRates`；v1 與 settle 用 helper 就地計算）。`settle` 的 `usingCustomRates`/`hasCustomRates` 亦依生效值。

- [ ] **Step 4: GREEN**（含 `npm run test:run` 全套 + `npm run lint`）(PASS)

- [ ] **Step 5: Commit** `git commit -m "feat: honour the project rate source across previews, lists, export and settle"`

---

## Self-Review

**Spec coverage:**
- 設定頁 UX spec：最小單位（A1,A2）、新增幣別預填（A3）、小數點 6 位有效（既有 `roundRateForDisplay`，A3 沿用）、移除精度（A4,A5,A6）。
- rate-source spec：`effectiveCustomRates`（B1）、`rateSource` 存取（B2）、設定頁開關（B3）、去 seed（B4）、各處套用（B5）。
- 兩份 spec 的「未竟」項目明確排除，未列入任務。

**Type consistency:** `effectiveCustomRates(rateSource, customRates)`、`minorUnitLabel(code)`、`resolveRate` 回傳無 `shouldSeedFixed`、`useProjectData.rateSource/effectiveCustomRates/precision(語意=幣別小數位)` 在各任務一致。

**Review Focus 對應：** ①A3 Step1（rates 空）；②A6 Step1（TWD legacy）；③B2 Step1（未帶 rateSource → fixed）；④A4/A5 + B3 的 payload 測試；⑤B5 Step1。
