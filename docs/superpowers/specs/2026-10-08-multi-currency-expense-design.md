# 多幣別支出（Multi-currency expenses）— 設計（spec）

- 日期：2026-10-08
- 狀態：待審（v2：結算幣別-first 雙層）
- 目標：讓**非專案幣別的支出**能正確、公平、可對帳地併入專案計算與結算；**帳一定平**。
- 範圍：v2 為主（新增支出、專案設定、匯率頁），v1 需相容。
- 核心架構：**結算幣別-first 雙層**（Settlement-currency-first）— 先換算成**專案的結算幣別**、再分攤；結算幣別為**唯一權威**，原幣僅供**對帳／顯示**。

## 1. 核心架構（結算幣別-first 雙層）

```
建立支出時：
  ① 綁定匯率（當下）
  ② 總額換算成「專案幣別」，取整到最小單位 → 鎖定 totalMinor
  ③ 在「專案幣別」上分攤與付款，配到整數最小單位（尾差用尾差帳分配）
  ④ 落地：原幣輸入 + 專案幣別結果（權威）

原幣層（TWD）：Expense.amount、currency、splitDetail、各人原幣金額 → 顯示／對帳
專案層（USD）：shareAmountProject、amountProject                        → 權威／結算
```

> 命名：核心是「**結算幣別**優先」，不是特定 USD。下方 TWD／USD 只是**示例**，實際第二層一律是該專案的結算幣別（可能是 TWD、EUR…）。

**為什麼結算幣別-first**
- **尾差只在一維**：只在結算幣別分一次，沒有「原幣尾差 → 換算又尾差」的鏈條，Ledger Audit 單純。
- **符合心智**：成員在乎「最後要付／拿多少結算幣別」。
- **結算端大幅簡化**：shares 已是專案幣別，不需再換算。

**唯一權威**：只有專案幣別層會產生 `balances` / `settlements`。原幣層不參與結算。

## 2. 名詞定義

| 名詞 | 定義 |
|---|---|
| 專案幣別 | 專案統一的結算幣別（`Project.currency`），權威層幣別。 |
| 原幣 | 該筆支出的原始幣別（`Expense.currency`），對帳層。 |
| 綁定匯率 | 建立該筆時快照的匯率（`Expense.exchangeRate`），單位：1 原幣 = ? 專案幣別。 |
| 最小單位（minor unit） | 幣別可表示的最小值（USD = 0.01）。**分配與取整的單位**。 |
| totalMinor | 該筆換算後鎖定的專案幣別總額，以最小單位整數表示。 |
| 尾差帳（remainderDiscrepancy） | 每位成員在專案內累積的「尾差分配」淨值（最小單位整數）。 |
| 自訂匯率 | 該筆 `exchangeRate` 與專案當前固定匯率不同（**純顯示**）。 |

## 3. 決策摘要

| 項目 | 決策 | 理由 |
|---|---|---|
| 換算順序 | **先換算成專案幣別，再分攤**（結算幣別-first） | 尾差單一維度、符合心智、結算簡化 |
| 權威層 | **專案幣別**（原幣僅對帳） | 避免兩本帳互相打架 |
| 取整 | **每筆分配整數最小單位**；殘差用**尾差帳**分配 | 顯示乾淨、加總相符、長期公平 |
| 尾差帳 | `ProjectMember.remainderDiscrepancy`（per project、最小單位整數） | 不受成員變動影響，永遠給「最虧」的人 |
| 匯率綁定 | 建立時**快照綁在該筆支出** | 金額穩定、不漂移 |
| 預設匯率來源 | 專案設定可選 **固定匯率 / 即時匯率**（預設**固定**） | 使用者決定新支出預設抓哪個值；兩者皆綁定快照 |
| 事後改匯率 | **允許**（編輯該筆）→ 回滾＋重算 | 使用者要求（方案 A） |
| 改專案固定匯率 | **只影響未來新支出**（已建立者不動） | 每筆已快照 |
| 分攤編輯 | 以**原幣**輸入，即時換算顯示專案幣別 | 對得上帳單 |
| 精度 | 分配用**最小單位整數**；匯率 `Decimal(18,8)`、不預圓 | 精確、可審計 |
| 顯示 | 雙層：原幣（對帳）＋專案幣別（權威） | 兩者都看得到 |

## 4. 資料模型變更

`prisma/schema.prisma`：

```prisma
model Project {
  // ...既有
  rateSource String @default("fixed") @map("rate_source") // 新支出預設匯率來源：fixed | live
}

model Expense {
  // ...既有
  exchangeRate Decimal? @db.Decimal(18, 8) @map("exchange_rate") // 綁定匯率；同幣別為 null
}

model ExpenseParticipant {
  // ...既有
  shareAmount        Decimal @db.Decimal(10, 2)            // 原幣（對帳）
  shareAmountProject Int?    @map("share_amount_project")  // 結算幣別（權威，最小單位整數）
}

model ExpensePayer {
  // ...既有
  amount        Decimal @db.Decimal(10, 2)            // 原幣
  amountProject Int?    @map("amount_project")        // 結算幣別（權威，最小單位整數）
}

model ProjectMember {
  // ...既有
  remainderDiscrepancy Int @default(0) @map("remainder_discrepancy") // 尾差帳（最小單位整數，per project）
}
```

- `exchangeRate`：同幣別支出為 `null`；外幣支出**必為快照值**（不再有「null = 引用專案匯率」語意）。
- 專案幣別金額（`*Project`）為**權威**，以**結算幣別最小單位整數**儲存（US$10.57 → `1057`）；原幣欄位維持不變（對帳用）。
- 型別用 `Int`（單人最小單位上限約 21 億，實務足夠）；顯示時才除以 `10^decimals` 還原（見 §12）。

### 4.1 既有資料 backfill

- 既有外幣支出：以當下 `Project.customRates[currency]`（或即時匯率）回填 `exchangeRate` 與 `*Project`（換算後取整成最小單位整數）；`remainderDiscrepancy` 起始 0。
- 同幣別支出：`exchangeRate = null`、`*Project` 可留 `null`（讀取時視為原幣＝專案幣別）。

## 5. 建立／更新支出的計算流程

**伺服器端為唯一計算處**（client 只做近似預覽，見 §9）。

```
輸入：原幣 amount、currency、splitDetail、payers[]（原幣）、exchangeRate（可省略）
  1. rate = exchangeRate                                     // 使用者已指定（若有）
            ?? (Project.rateSource === "fixed"
                  ? (customRates[currency] ?? seedFromLive(currency))  // 固定匯率（缺則 seed）
                  : 即時匯率)                                  // 即時匯率
  2. totalMinor = roundToMinorUnit(amount × rate, projectCurrency)   // 整數最小單位
  3. 分攤：weights = 各人原幣 share
       shareAmountProject_i = allocate(totalMinor, weights, discrepancy)
  4. 付款：weights = 各人原幣 payer amount
       amountProject_i = allocate(totalMinor, weights, discrepancy)
       （同一交易、同一 discrepancy 狀態依序套用）
  5. 寫入原幣欄位 + *Project 欄位 + exchangeRate
  6. 不變式：Σ shareAmountProject = Σ amountProject = totalMinor
```

> 分攤／付款「兩側」都各做一次整數分配（因為兩側各自要湊到 `totalMinor`），尾差帳各自更新。

## 6. 尾差帳（Discrepancy）演算法

**定義**：`remainderDiscrepancy`（整數、單位＝專案幣別最小單位）。
- **正** = 該成員歷史上被多分到的尾差（多付）。
- **負** = 少付。
- 分配時把尾差優先給「**目前最低（最虧）**」者。

**分配函式**（前端／後端共用，`lib/currency-conversion.ts`）：

```ts
// totalMinor：整數最小單位；weights：各人以原幣計的權重（≥0）
// discrepancy：各人目前尾差；回傳各人於專案幣別的整數分配（和 = totalMinor）
export function allocate(
  totalMinor: bigint,
  weights: { id: string; weight: bigint }[],
  discrepancy: Map<string, number>
): Map<string, bigint>
// 1) exact_i = totalMinor * weight_i / Σweight
// 2) base_i  = floor(exact_i)
// 3) R = totalMinor - Σbase_i
// 4) 依 discrepancy 由低到高（平手取原順序）取前 R 人 +1
// 5) 回傳；呼叫端對被 +1 者 discrepancy += 1
```

- 若 `Σweight = 0`：全員均分（退化處理）。
- 尾差 `R` 必 < 人數。

**回滾（編輯／刪除時）**：
- 依「上次分配結果」還原：對每人 `extra_i = 已存 project 值 − floor(exact_i)`，`discrepancy -= extra_i`。
- 再以新值重新分配。
- 全流程在**同一交易**內；避免併發漂移。

## 7. 匯率綁定與編輯

- **建立**：`exchangeRate` 快照綁在該筆（外幣）。預設值依 `Project.rateSource`（固定／即時）帶入；同時算好 `*Project`。
- **編輯允許改該筆匯率（方案 A）**：
  1. 回滾此筆的 discrepancy（§6）。
  2. 以新匯率重算 `totalMinor` 與 `*Project`。
  3. 重新分配 + 更新 discrepancy。
  4. 同一交易完成。
- **改專案固定匯率**：只影響**未來**新支出；已建立者不動（**移除**先前的「改匯率→二次確認」流程）。
- **「自訂」徽章**：`exchangeRate` ≠ 專案當前固定匯率 → 純顯示。

## 8. 寫入 API 契約

`app/api/projects/[id]/expenses/route.ts`（POST）與 `.../[expenseId]/route.ts`（PUT）：

```jsonc
{
  "currency": "TWD",
  "exchangeRate": 0.031715,          // 可省略（未帶 → 依 Project.rateSource：固定匯率 / 即時）
  "payers": [{ "memberId": "...", "amount": 600 }],
  "participants": [{ "memberId": "...", "shareAmount": 316.67 }],
  "splitDetail": { ... }             // 原幣
}
```

- **伺服器計算** `shareAmountProject` / `amountProject` / `totalMinor` / discrepancy（§5）。
- 驗證：`exchangeRate > 0`（外幣）、付款合計 = 原幣金額、分攤合計 = 原幣金額（±0.01）。
- POST 內若 `customRates[currency]` 不存在 → 以即時匯率 seed；即時失敗時用 fallback 並標示。
- 回應帶回 `*Project` 值（供前端顯示最終結果）。
- UT：`lib/hooks/useSaveExpense.ts` payload 加 `exchangeRate`。

## 9. UI：新增／編輯支出（v2）

- **金額卡**：原幣輸入 + `≈ {專案幣別} {金額}`、綁定匯率；點擊可展開改匯率（方案 A）。
- **分攤編輯**：以**原幣**輸入（對帳）；每人小字顯示 `≈ {專案幣別}`。
- **預覽與權威值的落差**：client 的 `*Project` 為**近似**（無法得知伺服器當下的 discrepancy）；儲存後以伺服器回傳值為準，誤差 ≤ 1 最小單位／人。UI 標示 `≈`。
- **尾差提示**：若某人被分配 +1，明細可標「尾差」，避免使用者覺得加總怪。
- 同幣別支出：不顯示匯率行、不送 `exchangeRate`。

## 10. 結算與讀取

- **結算 `app/api/projects/[id]/settle/route.ts`**：**大幅簡化** — 直接累加 `amountProject` / `shareAmountProject`（已是專案幣別），不需換算；殘差已於建立時處理，結算不會有尾差。
- **統計 `lib/project-stats.ts`**：用 `*Project` 直接累加。
- **匯出 `lib/export/*`**：專案幣別用 `*Project`；原幣欄位顯示原幣金額與綁定匯率。
- **列表 `lib/hooks/useProjectExpenses.ts` / `components/v2/expenses/*`**：顯示原幣 + `≈` 專案幣別。
- **v1 相容**：共用同一批 `*Project` 讀取；v1 表單加匯率欄位與功能對等。

## 11. 前端：專案設定與匯率頁

- **專案設定** `project-settings-v2*`：
  - **預設匯率來源**（新支出預設用哪個匯率）：`固定匯率` / `即時匯率`（預設固定）。
    - 選「固定匯率」→ 顯示固定匯率表；新增外幣支出時預設帶入該值（缺則自動 seed 即時匯率）。
    - 選「即時匯率」→ 新增時預設帶入當下即時匯率。
  - **固定匯率清單**（每個使用中的外幣一列，可改、有「用即時」）。
  - 說明：「**只影響未來的新支出**；已建立的支出已綁定當時匯率。」
  - **移除**先前的「受影響 N 筆 + 兩段式確認」。
- **結算幣別欄位**：下方顯示**依所選幣別動態**的最小單位唯讀說明（TWD→「四捨五入至整數」、USD→「四捨五入至 0.01」）。
- **匯率頁** `currency-v2*`：換算器 + 「設為專案固定匯率」。

## 12. 幣別常數、顯示統一與跑版修正

`lib/constants/currencies.ts`：
- 補齊常見幣別，**每筆明寫 `decimals`**；`CNY`、`THB` 改 `2`。
- `SHORT_NAMES` 補短名（`CHF 瑞郎`、`NZD 紐幣`、`MYR 馬幣`、`PHP 披索`、`AED 迪拉姆`、`TRY 里拉`、`TWD 台幣`）。
- `exchangeRatePrecision` 保留但**僅影響匯率顯示**。

### 12.1 顯示統一（金額小數）

- 規則：金額小數位 = 幣別最小單位（TWD/JPY/… 0 位；USD/EUR/… 2 位）。內部精度不顯示。
- **唯一入口** `formatAmount` / `formatCurrency`；**禁止** `toFixed()` / 裸 `toLocaleString()` 於金額。收斂既有旁路：`components/expense/expense-form.tsx`、`settlement-calc-dialog.tsx:87`、`lib/expense-changes.ts`、兩個 calculator、`stats-v1`/`category-donut` 的多餘 `Math.round`、`mileage-v1`、`csv-generator.ts`、v2 分帳的 `$`→ISO 代碼。

### 12.2 跑版修正

- `components/v2/ui/currency-field.tsx` span 加 `truncate`、外層 `min-w-0`。
- `components/ui/currency-select.tsx` 下拉名稱 span 加 `truncate`。
- v1（`new-project-v1.tsx`、`currency-v1.tsx`）同樣加截斷。

## 13. 邊界情況

- 支出幣別 = 專案幣別：`exchangeRate = null`、`*Project` 可空（讀取視為相同）。
- **編輯該筆匯率 / 刪除**：回滾 discrepancy，同一交易（§6）。
- **改專案幣別**：`remainderDiscrepancy` 的單位（最小單位）改變 → 需重設為 0 或轉換；顯示警告。
- **成員中途加入/移除**：尾差帳以「目前成員」為準，不受影響。
- **即時匯率 fallback**：標示「備用匯率」。
- **併發**：所有 discrepancy 更新與支出寫入同交易。

## 14. 分階段執行（每階段可獨立部署、可回退）

**Phase 1 — 精度核心**
- 新增 `lib/currency-conversion.ts`（minor unit、`allocate`、`resolveRate`、定點）；`currencies.ts` 補 `decimals`、短名。
- 驗收：純函式單元測試（§5 範例、allocate、回滾）。

**Phase 2 — 資料模型**
- `Expense.exchangeRate`、`ExpenseParticipant.shareAmountProject`、`ExpensePayer.amountProject`、`ProjectMember.remainderDiscrepancy`；backfill。

**Phase 3 — 寫入 API + 尾差帳**
- POST/PUT 伺服器計算 `*Project` + discrepancy（含回滾）；seed 專案匯率；`useSaveExpense`。

**Phase 4 — 讀取端（簡化）**
- settle / stats / export / 列表改讀 `*Project`；移除結算換算。

**Phase 5 — v2 UI**
- 新增支出（原幣輸入 + ≈ 專案 + 匯率編輯）；專案設定（移除確認流程）；匯率頁。

**Phase 6 — 顯示統一與跑版 + v1 相容**

**Phase 7 — 收尾**
- `docs/DATABASE.md`、`docs/API.md`；`npm run lint`、`npm run test:run`；逐階段 commit。

## 15. 測試策略

- 單元：`allocate`（整除、除不盡、單人、零權重）、discrepancy 演算法（輪替公平、回滾）、`resolveRate`。
- API：POST/PUT（匯率驗證、原幣合計、`*Project` 正確、discrepancy 更新與回滾）、seed。
- 結算：Σ `amountProject` = Σ `shareAmountProject`；`settlements` 加總 = 0。
- 顯示：`formatAmount` 各幣別；無 `toFixed`/裸 `toLocaleString`。
- 元件：v2 `amount-card`、分攤編輯、專案設定、匯率頁。

## 16. 不在本次範圍

- 每筆多段匯率、依日期抓歷史匯率。
- 部分付款／應收應付。
- 自訂幣別／加密貨幣。
- 跨專案合併的尾差帳。

## 17. 驗收條件

- 建立專案時，結算幣別說明依所選幣別動態顯示最小單位。
- 專案設定可切換「預設匯率來源（固定／即時）」；新增外幣支出時依此帶入預設匯率。
- 新增 JPY/TWD 支出：建立時綁定匯率；`*Project` 為整數最小單位且 Σ = 專案幣別總額。
- 分攤／付款在專案幣別加總相符；尾差帳有更新。
- 編輯該筆匯率 → 重算且 discrepancy 正確回滾重配；刪除 → 正確回滾。
- 改專案固定匯率 → 只影響未來；不需確認流程。
- 結算 `settlements` 加總 = 0；統計／匯出與結算數字一致。
- 顯示統一（TWD 無小數、USD 保留美分）；長名稱不跑版。
- `npm run test:run` 全綠；`npm run lint` 無錯誤。

## 18. 已定案的決策

| 項目 | 決定 |
|---|---|
| 事後改該筆匯率 | **允許**（回滾＋重算） |
| 「自訂」徽章 | 保留（純顯示） |
| 原幣每人分攤顯示 | 顯示（由輸入重建） |
| CNY / THB `decimals` | 2 |
| `*Project` 欄位 | **最小單位整數**（`Int`；US$10.57 → `1057`） |
| 支出整筆結算幣別金額 | 不另存，用各人金額加總 |
| v1 範圍 | 功能對等（Phase 6） |
| 預設匯率來源 | 固定；**整個專案一個開關** |

## 19. UX 流程（從建立專案到結算）

### 19.1 建立專案
- 輸入名稱、封面、日期、**結算幣別**。
- 結算幣別下方**依所選幣別動態**顯示最小單位唯讀說明（TWD→「四捨五入至整數」、USD→「四捨五入至 0.01」）。
- **此時不需設匯率**（還不知道會用到哪些外幣）。

### 19.2 專案設定 › 幣別與匯率
- **預設匯率來源**（新支出預設用哪個匯率）：`固定匯率` / `即時匯率`（預設**固定**）。
- **固定匯率清單**（使用中的外幣，每列可改、有「用即時」）。
- 說明：「只影響未來的新支出；已建立的支出已綁定當時匯率。」
- （無「受影響 N 筆 + 兩段式確認」流程。）

### 19.3 匯率頁
- 換算器 + 「設為專案固定匯率」。

### 19.4 新增支出（核心）
- 選幣別：
  - **＝專案幣別** → 不顯示匯率、不綁定。
  - **≠專案幣別** → 依「預設匯率來源」帶入**綁定匯率**；顯示 `≈ 專案幣別`；可點擊**改這一筆**匯率。
- **分攤／付款以原幣輸入**（對帳）；每人小字顯示 `≈ 專案幣別`。
- 若尾差帳把某人 +1，明細標「**尾差**」。

### 19.5 儲存後（系統行為）
1. 綁定匯率快照到該筆。
2. 原幣總額 → 換算專案幣別 → 取整最小單位（`totalMinor`）。
3. 在**專案幣別**上分攤與付款，配成整數（尾差依**尾差帳**給「最虧」的人）。
4. 落地（原幣 + 專案幣別）＋ 更新尾差帳（同交易）。

### 19.6 支出列表／明細
- 顯示 `原幣金額` + `≈ 專案幣別`；與統計／結算一致。

### 19.7 編輯／刪除
- 改該筆匯率／金額／分攤 → **回滾尾差 + 重算**。
- 改**專案固定匯率** → 不影響既有支出。

### 19.8 統計
- 用**專案幣別**結果直接累加。

### 19.9 結算
- **不換算、無尾差**：shares/paid 已是專案幣別，直接算餘額與轉帳。

### 19.10 匯出
- 專案幣別權威值 + 原幣金額 + 綁定匯率（對帳）。
