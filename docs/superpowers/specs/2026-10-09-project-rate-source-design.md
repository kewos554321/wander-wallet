# 專案匯率來源（固定 / 即時）設計

日期：2026-10-09
狀態：待實作
相關：`docs/superpowers/specs/2026-10-08-multi-currency-expense-design.md`（多幣別結算，本設計沿用其「結算為權威、原幣僅供顯示」原則）

## 1. 背景與問題

專案目前有兩種「匯率」概念：

- **每個外幣一個固定匯率**（`Project.customRates[currency]`）：使用者可在專案設定填寫。
- **即時匯率**：來自 `open.er-api.com`，未設定固定匯率時的來源。

問題（使用者實際遇到的）：

1. **「移除固定匯率」撐不住。** 當 `rateSource === "fixed"` 且某幣別沒有固定匯率時，後端會在**第一筆**該外幣支出時，把當下的即時匯率**自動寫進** `Project.customRates`（auto-seed）。所以把匯率刪掉後，只要再新增一筆外幣支出，它就被「設回固定」。使用者無法真正回到「一直用即時」。
2. **專案層級的「匯率來源」開關是死的。** `Project.rateSource`（`"fixed" | "live"`，預設 `"fixed"`）這個欄位存在，但 **UI 沒有任何地方設定它、`Project` GET/PUT 與 `useProjectData` 也沒處理**，所以實際上永遠是「固定」模式。
3. **前後端對 `rateSource` 的認知不一致。** 只有支出的 create/edit API 會看 `rateSource`；`resolvePreviewRate`、`useCurrencyConversion`、`settle` 的 legacy fallback、`export-data`、清單畫面都只認 `customRates`（有自訂就用）。就算模式設成即時，表單預覽仍會顯示固定值，跟存檔結果不一致。

## 2. 目標 / 非目標

**目標**

- 提供一個**專案層級的「匯率來源」開關**：`專案固定匯率` / `即時匯率`。
- 「即時匯率」模式：**所有**新支出用即時，**忽略但保留**已設定的固定匯率值；之後切回「專案固定匯率」可原樣恢復（可逆）。
- 「專案固定匯率」模式下，**某幣別沒有填固定值 → 用即時**，且 **不再自動寫入**。
- 讓所有會換算的地方（表單預覽、`useCurrencyConversion`、結算 legacy fallback、匯出、清單）**一致**遵守此開關。

**非目標**

- 不改動既有支出的金額（它們是凍結快照，見 §5）。
- 不改動單筆支出層級的匯率覆寫（既有 rate sheet / `rateKind` 行為不變）。
- 不新增 schema 欄位（`rateSource` 已存在）。
- v1 專案設定畫面「不加」此開關（v2 才加）；但 v1 的換算會透過共用 lib/route 一起遵守模式。

## 3. 名詞

- **固定匯率（fixed）**：`Project.customRates[currency]`，一個外幣對結算幣別的固定值。
- **即時匯率（live）**：外部市場匯率。
- **匯率來源（rateSource）**：專案層級預設，`"fixed"`（預設）或 `"live"`。
- **生效自訂匯率（effective custom rates）**：`rateSource === "live" ? null : customRates`。
- **自動 seed**：現行在缺固定匯率時，把首筆即時匯率寫回 `customRates` 的行為（本設計移除）。

## 4. 設計

### 4.1 單一真理 helper

新增一個純函式（放 `lib/currency-conversion.ts`）：

```ts
export function effectiveCustomRates(
  rateSource: "fixed" | "live" | null | undefined,
  customRates: Record<string, number> | null | undefined,
): Record<string, number> | null {
  if (rateSource === "live") return null
  return customRates ?? null
}
```

以此「傳生效後的值」的方式套用，**不必更動 `resolvePreviewRate` / `useCurrencyConversion` / `export-data` 的介面**（把生效值餵進去即可），把改動面壓到最小。

### 4.2 專案資料帶出 rateSource

- `useProjectData` 回傳新增 `rateSource`，並新增 `effectiveCustomRates`（＝ §4.1 對 `project.customRates` 的結果）。
  - `customRates`（原始值）保留，供**專案設定**與**幣別頁**編輯／顯示休眠值。
  - 需要換算的消費端改用 `effectiveCustomRates`。
- `Project` 型別（`lib/hooks/useProjectData.ts`）新增 `rateSource`。
- `app/api/projects/[id]/route.ts`：
  - GET 回傳 `rateSource`（Prisma 預設會帶出；確認型別/序列化即可）。
  - PUT 接受並驗證 `rateSource`（僅允許 `"fixed" | "live"`）。

### 4.3 移除自動 seed

- `resolveRate` 不再回傳 `shouldSeedFixed`（或保留欄位但不再使用；本設計採移除，回傳簡化為 `{ rate, source }`，`source` 中 `"seeded"` 併為 `"live"`）。
- `app/api/projects/[id]/expenses/route.ts`（POST）與 `.../[expenseId]/route.ts`（PUT）：移除 `seedRate` 與對 `Project.customRates` 的自動 `update`。
- 結果：`fixed` 模式下，缺固定值 → 一律即時，且**不會**被寫回。要固定時，由使用者在專案設定輸入（或幣別頁的「設為專案固定匯率」）。

### 4.4 UI：專案設定

`components/v2/project-settings/project-settings-v2-view.tsx` 「幣別與匯率」卡片：

- 卡片頂端新增 segmented 控制項：
  `匯率來源：[ 專案固定匯率 ｜ 即時匯率 ]`（預設 `專案固定匯率`）。
  說明文案：`只影響未來的新支出`。
- 「自訂匯率（選填）」區塊：
  - `fixed` 模式：維持現狀（可編輯）；提示 `未填的幣別將使用即時匯率`。
  - `live` 模式：顯示提示 `目前為即時匯率模式，以下固定匯率暫不使用`；**仍可檢視/編輯**（值保留，切回即生效）。
- `lib/hooks/use-project-form.ts`：`ProjectFormValues` 新增 `rateSource`；`emptyProjectForm` 預設 `"fixed"`；`toUpdatePayload` 帶上 `rateSource`；`project-settings-v2.tsx` 載入時讀入。

### 4.5 各處套用清單（改用生效值）

| 位置 | 現況 | 改為 |
|---|---|---|
| `components/v2/expense-form/expense-form-v2.tsx` | `customRates` 建 `previewRateInfo`、`rateContext.fixedRate` | 用 `effectiveCustomRates` |
| `components/v2/quick-expense/quick-expense-v2.tsx` | 同上 | 用 `effectiveCustomRates` |
| `components/v2/expenses/expenses-v2.tsx` | `useCurrencyConversion({customRates})` | 傳 `effectiveCustomRates` |
| `components/v2/export/export-v2.tsx` | `ctx.customRates` | 傳 `effectiveCustomRates` |
| `components/v1/expenses/expenses-v1.tsx`、`components/v1/export/export-v1.tsx`、`components/v1/stats/stats-v1.tsx` | 讀 `customRates` | 用生效值 |
| `app/api/projects/[id]/settle/route.ts` | legacy fallback `customRates[c] ?? live` | 用生效值（`live` 模式視為無自訂；`usingCustomRates` / `hasCustomRates` 亦依生效值） |
| `components/v2/currency/currency-v2.tsx`、`components/v1/currency/currency-v1.tsx` | 顯示/編輯固定值 | **保留原始值**（可管理），加上模式提示 |
| `components/v2/project-settings/*` | 編輯固定值 | **保留原始值** |
| `app/api/.../expenses` POST/PUT | 已看 `rateSource` | 不變（並去 seed） |

## 5. 邊界與不變量

- **既有支出不受影響。** 結算使用已存的 `ExpensePayer.amountProject` / `ExpenseParticipant.shareAmountProject`（凍結快照）；切換 `rateSource` 不重算舊帳。
- **切換只影響未來新支出的預設值**，以及各頁「顯示用」的換算。
- 上一輪的 `rateKind` 標籤（`專案 / 市場 / 即時 / 自訂`）在兩種模式下仍正確：`live` 模式下新支出預覽為 `市場/即時`，`fixed` 模式且有值時為 `專案`。
- 單筆覆寫（rate sheet）不受模式限制，永遠可用。

## 6. 資料 / 介面變更

- **Schema**：無變更（`Project.rateSource` 已存在，預設 `"fixed"`）。
- **API**：`Project` GET 回傳 `rateSource`；PUT 接受/驗證 `rateSource`；支出 POST/PUT 停止 seed。
- **型別**：`Project.rateSource`、`ProjectFormValues.rateSource`、`useProjectData.rateSource` / `effectiveCustomRates`。
- **共用函式**：`effectiveCustomRates`；`resolveRate` 回傳簡化。

## 7. 測試計畫

- `tests/lib/currency-conversion.test.ts`：`effectiveCustomRates`（live → null、fixed → 原值、undefined）。
- `tests/lib/multi-currency-correctness.test.ts` / `currency-conversion.test.ts`：`resolveRate` 去 seed 後行為。
- `tests/api/expenses.test.ts`：外幣 create/edit **不再**寫 `Project.customRates`；`rateSource="live"` 時忽略 `customRates` 並用即時。
- `tests/api/projects.test.ts`（或既有）：PUT 接受/拒絕 `rateSource`；GET 回傳。
- 元件：`expense-form-preview` / `expense-form-v2-view`：live 模式下預覽用即時（即使 `customRates` 有值）；settings UI segmented 控制項切換與 payload。
- `currency-v2` / `export-v2` / `settle`：live 模式視為無自訂。
- 全套 `npm run test:run` ＋ `npm run lint`。

## 8. 相容 / 遷移

- **無資料遷移**：欄位已存在，預設 `"fixed"`，既有專案行為大致不變。
- **行為變更**：移除 auto-seed 後，缺固定匯率的幣別將**持續**使用即時（不再被首筆支出寫死）。原本已 seed 進去的值仍在 `customRates`，`fixed` 模式下照用。
- 回滾：純程式變更，`git checkout main` 即可。

## 9. 決策記錄

- 採**專案層級總開關**（使用者要的是「設過固定匯率後，突然不想被它綁住」的一鍵、可逆切換）。
- **即時模式：保留並忽略**固定值（不是刪除），切回即恢復。
- **固定模式：缺值＝即時**，並**移除自動 seed**（不再偷偷寫回）。
- 以 `effectiveCustomRates` 集中規則，避免各畫面各自解讀。

## 10. 未竟 / 未來（不做）

- v1 專案設定不加此開關（僅 v2）。
- 幣別頁「即時模式下休眠值的呈現方式」可再優化（目前僅加提示）。
- 是否提供「一鍵把目前即時值設為固定」的批次操作（幣別頁已有單幣別按鈕，暫不擴充）。
