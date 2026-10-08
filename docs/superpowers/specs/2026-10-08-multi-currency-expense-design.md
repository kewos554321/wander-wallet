# 多幣別支出（Multi-currency expenses）— 設計（spec）

- 日期：2026-10-08
- 狀態：待審（設計階段）
- 目標：讓**非專案結算幣別的支出**能正確換算成專案幣別參與記帳、分攤、結算、統計與匯出；換算結果**穩定、可解釋、帳一定平**。
- 範圍：v2 為主（新增支出、專案設定、匯率頁），v1 需相容。
- 核心原則：**每筆支出只保留高精度、不逐筆四捨五入；只在最後結算圓整一次。**

## 1. 問題

現況（`app/api/projects/[id]/settle/route.ts`、`lib/project-stats.ts`、`components/v2/export/export-data.ts`）：

- 非專案幣別支出**沒有儲存匯率**，換算在**讀取時即時**用「專案自訂匯率 or 即時匯率」計算。
- 即時匯率每 1 小時更新（`lib/services/exchange-rate.ts`：`CACHE_DURATION = 1h`）→ **同一筆支出每次看金額都可能不同**。
- 換算邏輯**散在至少三套**（前端 hook、匯出、結算），四捨五入位數不一致 → 列表與結算可能對不起來。
- 金額四捨五入用的是 `exchangeRatePrecision`（預設 2）→ TWD 被算到「分」（台幣無小數）。
- 每筆逐項四捨五入會產生殘差，若由固定的人吸收，長期會**系統性不公平**。

## 2. 名詞定義

| 名詞 | 定義 |
|---|---|
| 專案幣別（projectCurrency / 結算幣別） | 專案統一計算的幣別（`Project.currency`）。 |
| 支出幣別（expense currency） | 該筆支出的原幣（`Expense.currency`）。與專案幣別相同時，不需匯率。 |
| 固定匯率（fixed rate） | 專案層級、每個外幣一個值（`Project.customRates[currency]`）。單位：**1 外幣 = ? 專案幣別**。 |
| 單筆自訂匯率（per-expense rate） | 該筆支出覆寫的匯率（`Expense.exchangeRate`）。 |
| 自訂（custom） | 該筆支出有 `exchangeRate`（使用者改過），不隨專案匯率變動。 |
| 最小單位（minor unit） | 幣別可表示的最小值：TWD/JPY/KRW/IDR/VND = 1；USD/EUR/… = 0.01。 |
| 內部精度（internal precision） | 帳務運算的定點小數位。**固定 8 位**。 |

## 3. 決策摘要

| 項目 | 決策 | 理由 |
|---|---|---|
| 匯率基準 | **專案層級固定匯率**（每外幣一個值）為預設 | 一致性 > 精確度；短期行程波動小；全團用同一值最好解釋 |
| 匯率來源 | 第一次用到該外幣時，**自動帶入當下即時匯率**寫入專案固定匯率 | 使用者零設定；但值是**鎖住**的，不會漂移 |
| 每筆支出匯率 | **預設引用專案固定匯率**；可**單筆覆寫**（`Expense.exchangeRate`） | 支援「這筆匯率就是不一樣」 |
| 「自訂」定義 | `Expense.exchangeRate` 非 null = 自訂 | 明確、可持久判斷，不受專案匯率變動影響 |
| 改專案匯率 | 若影響到其他支出 → **兩段式確認**：`一起更新舊支出` / `只改未來` | 使用者要求「重複確認」 |
| 改的是什麼 | 編輯的是**匯率**（不是換算後金額） | 一般 App 慣例；避免反推 |
| 分攤幣別 | 付款人／分攤者金額**一律存原幣**；換算只在讀取／結算端 | 與帳單一致（`ExpensePayer`、`ExpenseParticipant`、`splitDetail`） |
| 精度 | 帳務用**定點整數、8 位小數**（BigInt） | 對最細幣別（美分 0.01）仍安全；避免浮點漂移 |
| 圓整時機 | **只在最後結算圓整一次**；每筆不逐項圓整、不逐筆分殘差 | 避免每項差額與系統性不公平 |
| 殘差處理 | 結算時對餘額圓整後，殘差用**最大餘數法**分攤 | 公平、且帳一定平 |
| 金額 vs 匯率精度 | 金額圓整用**幣別最小單位**；`exchangeRatePrecision` 只管**匯率顯示** | 修正 TWD 被算到「分」的錯誤 |
| 顯示層 | 明細以**原幣**為主，換算僅「≈」參考；權威 TWD 只出現在**統計與結算** | 避免明細逐項圓整與總額對不上 |
| 最小單位資料 | 程式碼常數（`lib/constants/currencies.ts`），**每個幣別明寫 `decimals`** | 靜態 ISO 資料；API 不提供、DB 不必要 |
| 幣別名稱 | 補**短名** + 元件加 `truncate` | 避免長名稱跑版 |
| 幣別：CNY/THB | 設為 **2**（ISO 4217；原為 0） | 正確性 |

## 4. 資料模型變更

`prisma/schema.prisma`：

```prisma
model Expense {
  // ...既有欄位
  exchangeRate Decimal? @db.Decimal(18, 8) @map("exchange_rate") // 單筆自訂匯率；null = 用專案固定匯率
}
```

- **語意**：`null` = 使用專案固定匯率（會隨專案匯率一起變）；非 `null` = 自訂（凍結）。
- 專案幣別的支出**永遠為 `null`**。
- 專案固定匯率沿用既有 `Project.customRates`（JSON，單位 1 外幣 = ? 專案幣別），**不改結構**。

### 4.1 既有資料補齊（backfill）

- 既有外幣支出：`exchangeRate` 一律留 `null`（= 繼續引用專案固定匯率），**不逐筆回填**。
- 既有專案若無 `customRates`：於首次讀取或首次新增外幣支出時，用當下即時匯率 seed（見 §8）。
- 若 `customRates` 也不需要 backfill 腳本：以應用層 lazy seed 處理（見 §8.1）。

### 4.2 不變式（invariant）

- 每筆支出的 `exchangeRate != null` ⇒ `currency != projectCurrency`。
- 換算後，同一筆的「付款總額 = 分攤總額」（全精度恆等，見 §5）。

## 5. 精度與換算規則（核心）

新增 `lib/currency-conversion.ts`（前端／後端共用、純函式）：

```ts
// 幣別最小單位（0 或 2 位）；見 lib/constants/currencies.ts
export function getCurrencyDecimals(currency: string): number

// 依幣別最小單位四捨五入（金額用）
export function roundToMinorUnit(amount: number, currency: string): number

// 匯率解析優先序
export function resolveExpenseRate(
  expense: { currency: string; exchangeRate: number | null },
  project: { currency: string; customRates: Record<string, number> | null },
  liveRates: Record<string, number> | null
): number

// 帳務層：8 位小數定點整數（BigInt）
export function toScaled(amount: number): bigint      // amount × 1e8
export function fromScaled(scaled: bigint): number    // ÷ 1e8

// 結算：把已圓整後的每人餘額，用最大餘數法收斂到整數總額
export function allocateRemainder(
  total: bigint,           // 已圓整的最小單位總額（整數）
  shares: { id: string; exact: number }[]
): Map<string, number>
```

**規則**：

1. **內部帳務精度 = 8 位小數**（`scale = 1e8`），用 `BigInt` 做加減乘，**不在中途四捨五入**。
2. 換算：`scaled = toScaled(amount) × toScaledBig(rate)`，得出的高精度值一路累加。
3. **匯率不預先圓整**：直接用 `Expense.exchangeRate ?? customRates[currency] ?? live`。
4. **只有結算時圓整一次**：把每個成員的淨餘額 `roundToMinorUnit(net, projectCurrency)`。
5. **殘差**：圓整後若加總 ≠ 0，用 `allocateRemainder`（最大餘數法）把殘差以最小單位分到「被捨去最多」的成員，確保加總 = 0。
6. **金額一律用幣別最小單位**；`exchangeRatePrecision` **不再用於金額圓整**，僅保留為匯率顯示小數位（見 §12）。
7. 匯率欄位精度：`Expense.exchangeRate` 用 `Decimal(18,8)`；對支援幣別可保留足夠有效位數（若未來加入極小值幣別再提高）。

> **為何是 8 位**：對最細幣別（美分，圓整門檻 0.005），8 位精度下累積誤差在 10 萬次運算仍只占門檻約 1%；6 位只夠約 1,000 次（≈200 筆支出），對人多筆多的行程會踩線。

> **註（範圍界定）**：本節的「不逐筆圓整」只針對**換算成專案幣別**。**原幣內的平均分攤**（例：¥3,200 ÷ 3 除不盡）仍由既有 `lib/expense-split.ts` 的 `computeShares`／`derivePayerShares` 在**原幣整數**上處理（餘數給第一個自動成員）。兩者互不衝突：原幣分帳先算好，再整筆換算。

## 6. 匯率解析優先序

```
Expense.exchangeRate            // 單筆自訂（最高）
  └─ 否則 Project.customRates[currency]   // 專案固定匯率
       └─ 否則 即時匯率（live）             // 僅作 seed/兜底
```

所有消費端（列表、統計、匯出、結算）**一律呼叫 `resolveExpenseRate`**，不得自寫換算。

## 7. 寫入 API 契約

`app/api/projects/[id]/expenses/route.ts`（POST）與 `.../expenses/[expenseId]/route.ts`（PUT）：

```jsonc
{
  // ...既有欄位
  "currency": "JPY",
  "exchangeRate": 0.2265   // 可選；非專案幣別才接受
}
```

- **驗證**：`exchangeRate` 可省略（省略 = 用專案固定匯率）；若有值須 > 0，且 `currency != projectCurrency`，否則 400。
- **寫入**：`exchangeRate` 有值 → 存該值；無值 → 存 `null`。
- **編輯時幣別改為專案幣別** → `exchangeRate` 強制清為 `null`。
- 活動紀錄（`diffChanges` 欄位清單）加入 `exchangeRate`。
- `lib/hooks/useSaveExpense.ts` 的 `ExpensePayload` 加 `exchangeRate`。

### 7.1 自動 seed 專案固定匯率

`app/api/projects/[id]/expenses/route.ts`（POST）內，寫入前：

- 若 `currency != projectCurrency` 且 `Project.customRates[currency]` **不存在** → 以當下即時匯率寫入 `customRates[currency]`。
- 即時匯率取得失敗時使用 fallback，並於回應帶出 `usedFallbackRate: true`（前端可提示）。

（替代方案：獨立端點 `POST /api/projects/[id]/exchange-rates`；本 spec 採在 POST 內 ensure，較少來回。）

## 8. 讀取與結算

### 8.1 結算 `app/api/projects/[id]/settle/route.ts`

- `expense.findMany` include `exchangeRate`。
- 每筆：`rate = resolveExpenseRate(expense, project, liveRates)`。
- 以 **8 位定點**累加 `balance`、`totalPaid`、`totalShare`（付款人、分攤者、個人項目皆用同一個 `rate`）。
- **最後**：`roundToMinorUnit` 餘額 → `allocateRemainder` 收斂 → 既有 `calculateOptimalSettlements`。
- `expenseDetails` 的 `convertedAmount` 為**顯示值**（可圓整），但 `balances`/`settlements` 以定點累加後圓整為準。

### 8.2 統計 `lib/project-stats.ts`

- `convert` 介面改為能取得**整筆支出**（含 `exchangeRate`）：`convertExpense(expense)`。
- 付款人、分攤者改用同一解析後的 `rate`；不再逐項獨立猜匯率。

### 8.3 匯出 `components/v2/export/export-data.ts`

- `convertToProjectCurrency(amount, currency, ctx)` → 加入 `expense.exchangeRate`；優先序同 `resolveExpenseRate`。

### 8.4 列表 `lib/hooks/useProjectExpenses.ts` / `components/v2/expenses/*`

- `ProjectExpense` 型別加 `exchangeRate: number | null`。
- 顯示採 §11（原幣為主 + `≈`）。

### 8.5 v1 相容

- `components/v1/*`（含 `components/expense/expense-form.tsx` 內嵌換算）改為共用 `lib/currency-conversion.ts`；v1 表單加單筆匯率欄位，與 v2 對等。

## 9. 前端：新增／編輯支出（v2）

`components/v2/expense-form/`：

- `use-expense-draft.ts`：state 加 `exchangeRate: number | null`；`DraftInit.currency` 帶入專案固定匯率作為預設。
- `amount-card.tsx`：`currency != projectCurrency` 時，金額下方新增一行**唯讀換算**：
  - `≈ NT$725 · 1 JPY = 0.2265 TWD`；右側徽章 `專案匯率` / `自訂`（自訂為橘色）。
  - 點擊該行 → 展開匯率編輯器（**編輯匯率**，非金額）＋「套用」「重設為專案匯率」。
- `expense-form-v2-view.tsx`：切換幣別時，若專案無該外幣固定匯率 → 顯示提示「已自動新增 XXX 固定匯率」。
- 幣別 = 專案幣別：**不顯示**換算行、不送 `exchangeRate`。

## 10. 前端：專案設定（固定匯率）

`components/v2/project-settings/project-settings-v2*.tsx`、`exchange-rate-row.tsx`：

- 「固定匯率」清單（每個使用中的外幣一列），可編輯；附「用即時」按鈕。
- 說明：「單位：1 外幣 = ? 專案幣別；第一次用到新外幣時自動帶入即時匯率。」
- **修改匯率時**（若該外幣有未自訂的支出）：

  1. 第一段：顯示「將從 A 改為 B」＋「會影響 N 筆未自訂的 XXX 支出」。
  2. 第二段（重複確認）：「要一起更新舊支出嗎？」
     - `一起更新`：未自訂支出維持引用 → 自動反映新值（自訂支出不動）。
     - `只改未來`：把**現有**未自訂的該幣別支出，`exchangeRate` 設為**舊的專案匯率**（凍結），再更新專案匯率；新支出用新值。

## 11. 前端：匯率頁

`components/v2/currency/currency-v2*.tsx`：

- 換算器（既有）＋「**設為專案固定匯率**」按鈕（寫入 `customRates[currency]`）。
- 顯示各幣別固定匯率的新鮮度（沿用 `isRatesStale`）。

## 12. 幣別常數、顯示統一與跑版修正

`lib/constants/currencies.ts`：

- 補齊**常見幣別**，且**每筆明寫 `decimals`**。
- `CNY`、`THB` 改為 `decimals: 2`（原為 0）。
- `SHORT_NAMES`（現於 `components/v2/ui/currency-field.tsx`）補齊短名：`CHF 瑞郎`、`NZD 紐幣`、`MYR 馬幣`、`PHP 披索`、`AED 迪拉姆`、`TRY 里拉`；`TWD 台幣`。
- 「匯率顯示小數位」：`Project.exchangeRatePrecision` 保留但**僅影響匯率顯示**（或移除欄位改固定/自動）。金額不再用它。

### 12.1 顯示統一（金額小數）

**規則**：金額顯示的小數位 = 該幣別的最小單位（`getCurrencyDecimals`）。

| 幣別 | 顯示 |
|---|---|
| TWD / JPY / KRW / IDR / VND（0 位） | `TWD 725`、`JPY 3,200` |
| USD / EUR / HKD / SGD / THB …（2 位） | `USD 1,066.67` |

內部 8 位精度**永不顯示**。

**唯一入口**：所有金額一律走 `formatAmount` / `formatCurrency`（`lib/constants/currencies.ts`）。**禁止** `toFixed()` 或裸 `toLocaleString()` 用於金額。

**要收斂的旁路**（現況不一致）：

| 檔案 | 問題 | 修法 |
|---|---|---|
| `components/expense/expense-form.tsx`（v1） | 多處 `toFixed(2)` → 台幣顯示「分」 | 改 `formatCurrency` / `formatAmount` |
| `components/settle/settlement-calc-dialog.tsx:87` | `perPerson.toFixed(precision)` | 改 `formatAmount(..., projectCurrency)` |
| `lib/expense-changes.ts:44` | 裸 `toLocaleString()`（最多 3 位） | 改 `formatCurrency` |
| `components/ui/calculator.tsx:98`、`components/v2/expense-form/calculator-pad.tsx:206` | 裸 `toLocaleString` | 依目前輸入幣別的最小單位 |
| `components/v1/stats/stats-v1.tsx`、`components/v2/stats/category-donut.tsx` | `Math.round` → USD 掉美分 | 移除多餘 `Math.round`，交給 formatter |
| `components/v1/mileage/mileage-v1.tsx` | `maximumFractionDigits: 0` | 改 `formatAmount` |
| `lib/export/csv-generator.ts:31` | 自帶 `formatAmount`（zh-TW） | 共用主 formatter |
| v2 分帳（`payer-picker`、`split-editor`、`split-summary`） | 用 `$` 前綴 | 改用 ISO 代碼（對齊 `currency-field.tsx` 慣例） |

> 收斂後「小數點」只剩一條規則：**該幣別最小單位幾位，就顯示幾位**；TWD 不再有小數、USD 不再掉美分。

**跑版修正**（長名稱）：

- `components/v2/ui/currency-field.tsx`：`currencyLabel` 的 span 加 `truncate`，外層加 `min-w-0`。
- `components/ui/currency-select.tsx`：下拉項目的名稱 span 加 `truncate`；必要時固定 `SelectContent` 寬度。
- v1（`new-project-v1.tsx`、`currency-v1.tsx`）同樣加截斷。

## 13. 邊界情況

- 支出幣別 = 專案幣別：不顯示匯率、`exchangeRate` 為 `null`。
- 編輯時幣別改回專案幣別：清除 `exchangeRate`。
- 專案幣別被更動：所有固定／自訂匯率的「基準幣別」改變 → 顯示警告，既有 `exchangeRate` 視為失效（需重設或重新 seed）。
- 即時匯率抓不到、使用 fallback：seed 的值標示「備用匯率」。
- 除不盡：見 §5；只有「≥ 最小單位」的殘差需具名分攤。
- 支出金額為 0：不影響換算。
- 權限：專案固定匯率僅**擁有者／建立者**可改（沿用現有專案設定權限）。

## 14. 分階段執行（每階段可獨立部署、可回退）

**Phase 1 — 精度核心**
- 新增 `lib/currency-conversion.ts`（minor unit、resolve、8 位定點、remainder）；`currencies.ts` 補 `decimals` 與短名。
- 驗收：純函式單元測試（含 §5 範例）。

**Phase 2 — 資料模型**
- `Expense.exchangeRate` + migration；backfill 決策（留 null）。
- 驗收：schema 套用、既有資料不受影響。

**Phase 3 — 寫入 API + seed**
- POST/PUT 接受 `exchangeRate`；自動 seed 專案匯率；`useSaveExpense`。
- 驗收：API 測試（驗證、幣別切換清除、seed）。

**Phase 4 — 讀取端統一（風險最高）**
- 結算、`project-stats`、`export-data`、`useProjectExpenses` 全改用 `lib/currency-conversion.ts`；簽名改為整筆支出。
- 驗收：同一筆支出在列表／統計／匯出／結算**數字一致**。

**Phase 5 — v2 UI**
- 新增支出換算行／編輯器；專案設定固定匯率＋兩段式確認；匯率頁「設為固定匯率」。
- 驗收：元件與表單測試。

**Phase 6 — 顯示統一與跑版 + v1 相容**
- 金額顯示統一（§12.1：收斂所有 `toFixed`／裸 `toLocaleString`／多餘 `Math.round`／`$`→ISO 代碼）；幣別短名、`truncate`；v1 表單與顯示面功能對等。
- 驗收：v1/v2 對應測試；手動 smoke（**TWD 無小數、USD 保留美分**、長名稱不跑版）。

**Phase 7 — 收尾**
- `docs/DATABASE.md`、`docs/API.md` 更新；`npm run lint`、`npm run test:run`；逐階段 commit。

## 15. 測試策略

- 單元：`lib/currency-conversion.ts`（minor unit、resolve 優先序、8 位累加、remainder；§5 的 JPY→TWD 多人範例）。
- API：expenses POST/PUT（`exchangeRate` 驗證、幣別切換、seed）；settle（單筆自訂 vs 專案）與現有 `isBalanced` 一致。
- 元件：v2 `amount-card` 換算行／編輯器；`project-settings` 兩段式確認；`currency-v2` 設為固定匯率。
- 顯示：`formatAmount` / `formatCurrency` 對各幣別（TWD 0 位、USD 2 位）；全域**無金額**使用 `toFixed` 或裸 `toLocaleString`（以 lint/測試把關）。
- 迴歸：凡依賴 `convert(amount, currency)` 的呼叫端逐一套用為整筆支出版本。
- 指令：`npm run lint`、`npm run test:run`；關鍵階段 `npm run test:coverage`。

## 16. 不在本次範圍（未來工作）

- 每筆支出「多段匯率」或依日期抓歷史匯率。
- 部分付款／應收應付。
- 自訂幣別／加密貨幣（decimals 由使用者定義）→ 屆時才需 DB 表。
- 匯率歷史圖表／自動更新固定匯率。

## 17. 驗收條件

- 新增一筆 JPY 支出：預設顯示專案固定匯率換算；可單筆覆寫匯率；再開啟維持自訂值。
- 專案幣別 TWD 的支出不顯示、不儲存匯率。
- 修改專案固定匯率時：有受影響支出 → 兩段式確認；`一起更新` 與 `只改未來` 行為符合 §10。
- 同一筆支出在列表、統計、匯出、結算的專案幣別金額**一致**。
- **金額顯示統一**：TWD 等 0 位幣別不顯示小數；USD 等 2 位幣別保留美分；無金額使用 `toFixed`／裸 `toLocaleString`。
- 結算 `settlements` 加總 = 0；金額為專案幣別最小單位的整數。
- 長幣別名稱在專案設定／匯率頁／下拉選單**不跑版**。
- `npm run test:run` 全綠；`npm run lint` 無錯誤。

## 18. 已採建議、可調整的決策

| 項目 | 目前採納 | 可改為 |
|---|---|---|
| 顯示層策略 | A：明細以原幣為主，換算僅 `≈` | B：明細顯示整數 TWD（需逐項圓整，會回到對不上的問題） |
| CNY / THB `decimals` | 2（ISO） | 0（若刻意簡化） |
| `exchangeRatePrecision` 欄位 | 保留但僅影響匯率顯示 | 直接移除，改固定/自動 |
| v1 範圍 | 功能對等（納入 Phase 6） | 僅 v2，v1 之後補 |
