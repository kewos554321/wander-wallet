# 多幣別支出 — 驗證文件（Review Doc）

- 日期：2026-10-08
- 對應設計：`docs/superpowers/specs/2026-10-08-multi-currency-expense-design.md`（v2：USD-first 雙層）
- 用途：把**設計重點**與**UX 流程**濃縮成一份可逐點驗證的清單。
- 狀態：待你驗證（✅ 同意 / ✏️ 要改 / ❓ 有疑問）

---

## 0. 一句話總覽

> 建立專案（設結算幣別，免設匯率）→ 新增支出選幣別，外幣帶入並可改「當下匯率」→ 分攤／付款用**原幣**輸入、即時看 `≈專案幣別` → 儲存時系統在**專案幣別**配好整數、記尾差 → 列表／統計／結算全用專案幣別（結算不再換算）→ 事後可改該筆匯率（回滾重算）。

---

## 1. 核心架構（USD-first 雙層）

```
建立支出時：
  ① 綁定匯率（當下）
  ② 總額換算成「專案幣別」→ 取整到最小單位（鎖定 totalMinor）
  ③ 在「專案幣別」上分攤與付款，配成整數（尾差用尾差帳分配）
  ④ 落地：原幣輸入（對帳） + 專案幣別結果（權威）

原幣層：Expense.amount、各人原幣金額        → 顯示／對帳
專案層：shareAmountProject、amountProject    → 權威／結算
```

- **換算順序＝先換算再分攤**（確認 ✅）。
- **唯一權威＝專案幣別**；只有專案幣別層會產生餘額／結算。
- 好處：尾差只在一個維度、符合成員心智、結算端不用再換算。

**驗證點**
- [ ] 同意「先換算成專案幣別，再在專案幣別上分攤」
- [ ] 同意「原幣純對帳／顯示，不參與結算」

---

## 2. 名詞

| 名詞 | 定義 |
|---|---|
| 專案幣別 | 專案結算幣別（`Project.currency`），權威層 |
| 原幣 | 該筆支出的原始幣別（`Expense.currency`），對帳層 |
| 綁定匯率 | 建立該筆時快照的匯率（`Expense.exchangeRate`） |
| 最小單位 | 幣別可表示的最小值（USD=0.01、TWD=1），分配與取整的單位 |
| totalMinor | 該筆換算後鎖定的專案幣別總額（最小單位整數） |
| 尾差帳 | 每位成員累積的尾差淨值（`ProjectMember.remainderDiscrepancy`） |
| 自訂匯率 | 該筆匯率 ≠ 專案當前固定匯率（純顯示徽章） |

---

## 3. 決策摘要

| 項目 | 決策 | 驗證 |
|---|---|---|
| 換算順序 | 先換算專案幣別，再分攤 | [ ] |
| 權威層 | 專案幣別（原幣僅對帳） | [ ] |
| 取整 | 每筆分配整數最小單位；殘差用尾差帳 | [ ] |
| 尾差帳位置 | `ProjectMember.remainderDiscrepancy`（per project） | [ ] |
| 匯率綁定 | 建立時快照綁在該筆支出 | [ ] |
| 預設匯率來源 | 專案設定可選**固定匯率／即時匯率**（預設**固定**） | [ ] |
| 事後改匯率 | **允許**（編輯該筆）→ 回滾＋重算（方案 A） | [ ] |
| 改專案固定匯率 | **只影響未來新支出** | [ ] |
| 分攤編輯 | 以**原幣**輸入，即時換算顯示專案幣別 | [ ] |
| 精度 | 分配用最小單位整數；匯率 `Decimal(18,8)` 不預圓 | [ ] |
| 顯示 | 雙層：原幣 + 專案幣別 | [ ] |

---

## 4. 計算流程（伺服器為唯一計算處）

```
輸入：原幣 amount、currency、splitDetail、payers[]（原幣）、exchangeRate（可省略）
  1. rate = exchangeRate（使用者已指定）
            ?? (rateSource === "fixed"
                  ? customRates[currency] ?? seedFromLive(currency)
                  : 即時匯率)
  2. totalMinor = roundToMinorUnit(amount × rate, 專案幣別)
  3. 分攤：weights = 各人原幣 share
       shareAmountProject_i = allocate(totalMinor, weights, discrepancy)
  4. 付款：weights = 各人原幣 payer amount
       amountProject_i = allocate(totalMinor, weights, discrepancy)
  5. 寫入原幣欄位 + *Project 欄位 + exchangeRate
  6. 不變式：Σ shareAmountProject = Σ amountProject = totalMinor
```

**驗證點**
- [ ] 分攤與付款「兩側」都各做一次整數分配（各自湊到 totalMinor）
- [ ] 客戶端只是近似預覽；儲存後以伺服器回傳為準（誤差 ≤ 1 最小單位／人）

---

## 5. 尾差帳演算法

- 正 = 歷史上被多分到（多付）；負 = 少付。
- 分配時尾差優先給**目前最低（最虧）**者 → 長期公平、不偏袒。

```ts
allocate(totalMinor, weights, discrepancy) → 各人整數分配（和 = totalMinor）
1) exact_i = totalMinor * weight_i / Σweight
2) base_i  = floor(exact_i)
3) R       = totalMinor - Σbase_i
4) 依 discrepancy 由低到高（平手取原順序）取前 R 人 +1
5) 被 +1 者 discrepancy += 1
```

- 回滾（編輯／刪除）：`extra_i = 已存 project 值 − floor(exact_i)`，`discrepancy -= extra_i`，再重配。
- 全程同一交易，避免併發漂移。

**驗證點**
- [ ] 同意「給最虧的人 +1」的公平策略
- [ ] 同意編輯／刪除時回滾尾差帳

---

## 6. 資料模型變更

```prisma
model Project {
  rateSource String @default("fixed") @map("rate_source") // fixed | live
}
model Expense {
  exchangeRate Decimal? @db.Decimal(18, 8)                 // 綁定匯率；同幣別 null
}
model ExpenseParticipant {
  shareAmount        Decimal  @db.Decimal(10, 2)           // 原幣（對帳）
  shareAmountProject Decimal? @db.Decimal(18, 8)           // 專案幣別（權威）
}
model ExpensePayer {
  amount        Decimal  @db.Decimal(10, 2)                // 原幣
  amountProject Decimal? @db.Decimal(18, 8)                // 專案幣別（權威）
}
model ProjectMember {
  remainderDiscrepancy Int @default(0)                     // 尾差帳（最小單位整數）
}
```

- 既有外幣支出 backfill：以當下匯率回填 `exchangeRate` + `*Project`；尾差帳起始 0。

**驗證點**
- [ ] `*Project` 精度用 `Decimal(18,8)`（或要更低？）
- [ ] 同幣別支出 `exchangeRate = null`

---

## 7. UX 流程（從建立專案到結算）

### 7.1 建立專案
- 輸入名稱、封面、日期、**結算幣別**。
- 結算幣別下方**依所選幣別動態**顯示最小單位唯讀說明（TWD→「四捨五入至整數」、USD→「四捨五入至 0.01」）。
- **此時不需設匯率**。
- [ ] 驗證

### 7.2 專案設定 › 幣別與匯率
- **預設匯率來源**：`固定匯率` / `即時匯率`（預設固定）。
  - 固定 → 新增外幣支出預設帶入固定匯率（缺則自動 seed 即時）。
  - 即時 → 新增時預設帶入當下即時匯率。
- **固定匯率清單**（使用中的外幣）。
- 說明：只影響未來新支出；已建立的已綁定。
- 無「改匯率影響舊支出＋二次確認」流程。
- [ ] 驗證

### 7.3 匯率頁
- 換算器 + 「設為專案固定匯率」。
- [ ] 驗證

### 7.4 新增支出（核心）
- 選幣別：
  - **＝專案幣別** → 不顯示匯率、不綁定。
  - **≠專案幣別** → 依「預設匯率來源」帶入**綁定匯率**；顯示 `≈ 專案幣別`；可點擊**改這一筆**匯率。
- 分攤／付款以**原幣**輸入；每人小字顯示 `≈ 專案幣別`。
- 若尾差帳把某人 +1，明細標「**尾差**」。
- [ ] 驗證

### 7.5 儲存後（系統）
1. 綁定匯率快照。
2. 原幣總額 → 專案幣別 → 取整（totalMinor）。
3. 專案幣別上分攤＋付款（尾差帳分配）。
4. 落地＋更新尾差帳（同交易）。
- [ ] 驗證

### 7.6 支出列表／明細
- 顯示 `原幣金額` + `≈ 專案幣別`；與統計／結算一致。
- [ ] 驗證

### 7.7 編輯／刪除
- 改該筆匯率／金額／分攤 → **回滾尾差 + 重算**。
- 改專案固定匯率 → 不影響既有支出。
- [ ] 驗證

### 7.8 統計
- 用**專案幣別**結果直接累加。
- [ ] 驗證

### 7.9 結算
- **不換算、無尾差**：shares/paid 已是專案幣別，直接算餘額與轉帳。
- [ ] 驗證

### 7.10 匯出
- 專案幣別權威值 + 原幣金額 + 綁定匯率（對帳）。
- [ ] 驗證

---

## 8. 顯示統一與跑版修正

- 金額小數位 = 幣別最小單位（TWD/JPY 0 位；USD/EUR 2 位）。
- **唯一入口** `formatAmount` / `formatCurrency`；禁止 `toFixed()`／裸 `toLocaleString()`。
- 收斂既有旁路：`expense-form.tsx`、`settlement-calc-dialog.tsx:87`、`lib/expense-changes.ts`、兩個 calculator、`stats-v1`/`category-donut`、`mileage-v1`、`csv-generator.ts`、v2 分帳的 `$`→ISO。
- 長幣別名稱加 `truncate` / `min-w-0`（`currency-field.tsx`、`currency-select.tsx`、v1）。
- [ ] 驗證

---

## 9. 待你確認的可調整決策（§18）

| 項目 | 目前採納 | 可改為 | 你的決定 |
|---|---|---|---|
| 事後改該筆匯率 | A：允許（回滾＋重算） | B：建立後不可改 | |
| 「自訂」徽章 | 保留（純顯示） | 移除 | |
| 原幣每人分攤顯示 | 顯示（由輸入重建） | 只顯示原幣總額 | |
| CNY / THB `decimals` | 2 | 0 | |
| `*Project` 欄位精度 | `Decimal(18,8)` | 更低位數 | |
| v1 範圍 | 功能對等 | 僅 v2 | |

> 另有兩點想再和你對一次：**預設匯率來源的預設值＝固定**、且為**整個專案一個切換**（非每個外幣一個）。

---

## 10. 驗收條件（§17）

- [ ] 建立專案時，結算幣別說明依所選幣別動態顯示最小單位。
- [ ] 專案設定可切換「預設匯率來源（固定／即時）」；新增外幣支出依此帶入預設匯率。
- [ ] 新增 JPY/TWD 支出：建立時綁定匯率；`*Project` 為整數最小單位且 Σ = 專案幣別總額。
- [ ] 分攤／付款在專案幣別加總相符；尾差帳有更新。
- [ ] 編輯該筆匯率 → 重算且回滾正確；刪除 → 正確回滾。
- [ ] 改專案固定匯率 → 只影響未來；不需確認流程。
- [ ] 結算 `settlements` 加總 = 0；統計／匯出與結算一致。
- [ ] 顯示統一（TWD 無小數、USD 保留美分）；長名稱不跑版。
- [ ] `npm run test:run` 全綠；`npm run lint` 無錯誤。

---

## 11. 分階段執行（§14）

| Phase | 內容 |
|---|---|
| 1 | 精度核心：`lib/currency-conversion.ts`（minor unit、`allocate`、`resolveRate`）；`currencies.ts` 補 `decimals`／短名 |
| 2 | 資料模型：`exchangeRate`、`*Project`、`remainderDiscrepancy`；backfill |
| 3 | 寫入 API + 尾差帳：POST/PUT 伺服器計算（含回滾）；seed 匯率；`useSaveExpense` |
| 4 | 讀取端簡化：settle／stats／export／列表改讀 `*Project` |
| 5 | v2 UI：新增支出、專案設定、匯率頁 |
| 6 | 顯示統一與跑版 + v1 相容 |
| 7 | 收尾：`docs/DATABASE.md`、`docs/API.md`、lint、測試、逐階段 commit |

---

## 12. 不在本次範圍（§16）

- 每筆多段匯率、依日期抓歷史匯率。
- 部分付款／應收應付。
- 自訂幣別／加密貨幣。
- 跨專案合併的尾差帳。
