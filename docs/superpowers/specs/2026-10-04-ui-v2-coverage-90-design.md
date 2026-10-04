# UI v2 覆蓋率 90% 里程碑 — 設計（spec）

- 日期：2026-10-04
- 狀態：待執行
- 目標：讓 **`components/v2/**` 每個資料夾的 Lines% ≥ 90%**（目前 5 個未達標）。純測試工作，**不改產品行為**。

## 1. 背景與量測（main @ `55726e6`，`npm run test:coverage` exit 0）

- 全專案 `All files` Lines 73.2%（被 `components/v1/**` 0% 拉低，不在本里程碑範圍）。
- `lib` 97.25%、`app/api` 多數 100%。
- `components/v2` 逐資料夾 Lines%：

| 資料夾 | Lines% | 狀態 |
|---|---|---|
| cover / layout / members / ui | 100 | ✅ |
| expenses | 96.36 | ✅ |
| stats | 94 | ✅ |
| expense-form | 94.83 | ✅ |
| settings | 93.1 | ✅ |
| settle | 91.66 | ✅ |
| **new-project** | 85.71 | ❌ |
| **project** | 87.3 | ❌ |
| **project-settings** | 83.78 | ❌ |
| **projects** | 86.95 | ❌ |
| **quick-expense** | 85.5 | ❌ |

## 2. 範圍（要補的 5 個資料夾與其低覆蓋檔案）

| 資料夾 | 低覆蓋檔案（Lines%） | 未覆蓋行（來自 coverage） | 現有測試 |
|---|---|---|---|
| projects | `projects-v2.tsx` 0% | 10–13 | 只有 `projects-v2-view.test.tsx` |
| project | `date-range-field.tsx` 50% | 33,57–59 | `project-overview-v2.test.tsx`、`feature-grid.test.tsx` |
| project | `project-overview-v2.tsx` 77.77% | 38,50–55,68 | 同上 |
| project-settings | `exchange-rate-row.tsx` 50% | 27 | `project-settings-v2.test.tsx` |
| project-settings | `project-settings-v2-view.tsx` 66.66% | 87–116,132–167 | 同上 |
| project-settings | `project-settings-v2.tsx` 88.09% | (部分) | 同上 |
| project-settings | `delete-project-sheet.tsx` (stmts 80%) | 23–38 | 同上 |
| new-project | `new-project-v2.tsx` 84.37% | 49,92–102,131 | `new-project-v2.test.tsx` |
| quick-expense | `camera-step.tsx` 64.28% | 17–18,55–66 | `quick-expense/camera-step.test.tsx` |
| quick-expense | `confirm-step.tsx` 71.42% | 76–82 | `quick-expense/confirm-step.test.tsx` |
| quick-expense | `quick-item-card.tsx` 72% | 部分 | 無專屬（由 confirm-step 間接測） |

## 3. 原則（不可違反）

1. 只新增/修改 `tests/components/v2/**`；**不改 `components/v1/**`、`components/ui/**`、`app/api/**`、`prisma/**`、`lib/**`**。
2. **盡量不改產品程式碼**。只有在某個 UI 分支無法從既有測試觸發時，才允許最小、不改變行為的調整（且要在 commit/報告說明）。若調整會改變行為 → 不允許，改用整合方式測試。
3. 測試要驗證**真實行為**（渲染、互動、條件分支），不是只 mock；避免為了衝數字寫沒斷言的測試。
4. `tests/components/v2/no-hardcoded-colors.test.ts` 與所有既有 v2 測試必須維持綠。
5. 驗收指令：`npm run test:coverage`；判定標準為每個 `components/v2/**` 資料夾 **Lines ≥ 90%**。

## 4. 決策

| # | 決定 |
|---|---|
| C1 | 目標 = `components/v2` 每個資料夾 Lines ≥ 90%（不含 v1/shared 與全專案 All files）。 |
| C2 | 只補測試，不重構產品碼；必要的可測性微調需最小且不改變行為。 |
| C3 | 優先覆蓋「可由既有元件觸發」的分支（loading/error/empty/fallback/條件 render）；對於確實不可達的 defensive 分支，記錄為已知不覆蓋，並以其他行數補足到 ≥90%。 |
| C4 | 在 `main` 上工作（與使用者目前分支一致），完成後再確認是否 push。 |

## 5. 驗收

- `npm run test:coverage`：`components/v2` 全部資料夾 Lines ≥ 90%。
- `npm run test:run` 全綠（exit 0）。
- v1 保護 diff 為空：
  `git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts`
- 只動 `tests/components/v2/**`（＋必要時極小的 `components/v2/**`，需在報告說明）。
