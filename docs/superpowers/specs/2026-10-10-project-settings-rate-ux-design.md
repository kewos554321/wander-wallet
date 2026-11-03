# 專案設定「幣別與匯率」UX ＋ 移除匯率計算精度 設計

日期：2026-10-10
狀態：待實作
相關：`docs/superpowers/specs/2026-10-09-project-rate-source-design.md`（匯率來源 固定/即時；同一張卡片，一起進實作）

## 1. 背景與問題

「專案設定 → 幣別與匯率」卡片目前的 UX 有幾個問題：

1. **沒有說明最小單位。** 系統其實有 `getCurrencyDecimals()`（TWD/JPY/KRW/VND = 0 位，其他多數 = 2 位），但畫面完全沒顯示，使用者不知道金額會四捨五入到整數還是分。
2. **新增幣別要自己打匯率。** 按「新增幣別」只會加一列**空白**輸入框，使用者得自己查匯率填入。
3. **每列的即時匯率提示是錯的。** 不論有沒有填固定值，那行小字**永遠**寫「目前使用即時匯率：1 X = …」，填了值也不變。
4. **「匯率計算精度」欄位名不符實。** 新模型結算用「結算幣別的最小單位整數」，此欄位對新資料已無作用；它仍影響舊資料（沒有快照的 legacy 列）與餘額四捨五入，但使用者無從理解，且對 0 位小數幣別（TWD/JPY…）的顯示換算其實是錯的。

## 2. 目標 / 非目標

**目標**

- 在卡片顯示**結算幣別的最小單位與說明**，以及各外幣的最小單位。
- 讓「新增幣別」時**直接以當下即時匯率預填**（可再編輯），並修正每列狀態文案。
- **移除「匯率計算精度」欄位**，改為一律依**結算幣別的最小單位**做金額四捨五入（顯示與結算的 legacy 路徑都一致）。
- 匯率數值顯示維持 **6 位有效數字**（決策 A，與金額卡／匯率面板一致）。

**非目標**

- 不動結算「以最小單位整數為權威」的核心（見多幣別設計）。本設計只是把精度欄位收斂成幣別最小單位。
- 不改「匯率來源 固定/即時」邏輯（見另一份 spec）。
- 不改既有支出金額。

## 3. 設計

### 3.1 最小單位說明

- 共用文字：
  - 0 位：`最小單位：1 {結算幣別}，金額四捨五入到整數`
  - 2 位：`最小單位：0.01 {結算幣別}`
  由 `getCurrencyDecimals(code)` 決定。
- **結算幣別**下方顯示一行（明碼 `data-testid="settlement-minor-unit"`）。
- **每個外幣列**尾端顯示該外幣的最小單位，例如 `USD ＝ [input] TWD（最小單位 0.01）`。

### 3.2 新增幣別：直接套用即時匯率

- 按「新增幣別」（選好幣別後）→ 新增該外幣列，並把**當下即時匯率預填**進輸入框。
  - 預填值用 `roundRateForDisplay(liveRate)`（6 位有效數字，與金額卡/面板一致）。
  - 即時匯率尚未取得時 → 留空，列下方顯示 `讀取中…`；取得後再填入（或提示手動輸入）。
- **修正每列狀態小字**，反映實際狀態：
  - 未填 → `使用即時匯率：1 X = {live} Y`
  - 已填 → `使用自訂匯率：1 X = {value} Y`
  - 即時匯率未知 → `即時匯率讀取中…`

### 3.3 小數點顯示（決策 A）

- 匯率一律以 **6 位有效數字**顯示（`roundRateForDisplay`）；不顯示尾零。
- 套用於：設定頁預填值、每列小字、金額卡、匯率面板（後三者現況已如此）。

### 3.4 移除「匯率計算精度」

- `ProjectFormValues` 移除 `exchangeRatePrecision`；設定頁移除該欄位；`toUpdatePayload` 不再送此欄位；`validateProjectForm` 移除對應驗證。
- 讀取端不再依賴 `exchangeRatePrecision`，改以 `getCurrencyDecimals(projectCurrency)`：
  - `app/api/projects/[id]/settle/route.ts`：`roundToPrecision(x, precision)` → 改為四捨五入到**結算幣別最小單位**；`calculateOptimalSettlements(balances, …)` 傳入結算幣別小數位。
  - `lib/hooks/useCurrencyConversion.ts`：`convert()` 的 `precision` 改由呼叫端傳入 `getCurrencyDecimals(projectCurrency)`（或 hook 內部直接算）。
  - `useProjectData.precision` → 保留欄位名但改為衍生值 `getCurrencyDecimals(projectCurrency)`（避免大規模改呼叫端）；其消費端（`expenses-v2`、`export-v2`、`project-overview-v2`、`stats-v1`、`currency-v1`、v1 `expense-form`）因此自動改為幣別最小單位。
- `Project.exchangeRatePrecision` 欄位**保留但不再使用**（之後可清）；`GET` 仍可回傳以免破壞其他讀取。
- 影響與正確性：新資料的 `*Project` 已是整數最小單位，對它們而言此變更是 **no-op**；差異只出現在 **legacy（無快照）** 列的換算與金額顯示——且方向是「更正確」（例如 TWD 專案不再顯示到小數第二位）。

## 4. 檔案 / 介面

| 檔案 | 變更 |
|---|---|
| `components/v2/project-settings/project-settings-v2-view.tsx` | 最小單位行、新增預填、移除精度欄位 |
| `components/v2/project-settings/exchange-rate-row.tsx` | 顯示幣別最小單位、狀態小字修正、預填 |
| `components/v2/project-settings/project-settings-v2.tsx` | 載入即時匯率供預填；移除 precision |
| `lib/hooks/use-project-form.ts` | 移除 `exchangeRatePrecision` |
| `app/api/projects/[id]/route.ts` | PUT 不再處理 `exchangeRatePrecision`（或忽略） |
| `app/api/projects/[id]/settle/route.ts` | 依結算幣別最小單位四捨五入 |
| `lib/hooks/useCurrencyConversion.ts` | 金額四捨五入改依幣別最小單位 |
| `lib/hooks/useProjectData.ts` / `useProjectOverview.ts` / `lib/project-overview.ts` | precision 收斂 |
| `components/v2/currency/*`、`components/v1/**`（stats/currency/expenses/expense-form） | 同步 |
| 測試 | 見 §5 |

## 5. 測試計畫

- 設定頁：顯示結算幣別最小單位；新增幣別以即時匯率預填；每列狀態小字正確；**沒有**精度欄位。
- `use-project-form`：不再有 `exchangeRatePrecision`；payload 不含它。
- `settle`：TWD 專案的金額/結算四捨五入到整數；USD 專案到 0.01；legacy 列換算正確。
- `useCurrencyConversion`：`convert` 對 0 位小數幣別回傳整數。
- 全套 `npm run test:run` ＋ `npm run lint`。

## 6. 相容 / 遷移

- 無 schema 變更（欄位保留未用）。
- 既有支出不變。
- 行為變更：金額顯示/結算的「四捨五入位數」由專案設定欄位改為**幣別最小單位**（對 0 位小數幣別是修正）。
- 回滾：純程式變更，`git checkout main`。

## 7. 決策記錄

- 小數點：**A — 6 位有效數字**（與金額卡/面板一致）。
- 最小單位：**結算幣別一行 + 每列標示該外幣最小單位**。
- 新增幣別：**直接以當下即時匯率預填**（可編輯）。
- 匯率計算精度：**移除**（UI 移除，結算/顯示改依幣別最小單位）。

## 8. 未竟 / 未來

- 是否提供「一鍵把目前即時值設為固定」於幣別頁（另一討論）。
- 清理未使用的 `Project.exchangeRatePrecision` 欄位。
