# Remove the v1 interface — design and record

- 日期：2026-11-04
- 狀態：已實作（工作目錄變更，待提交）
- 範圍：移除 v1 介面、版本切換機制與只被 v1 使用的程式碼；先把導覽補到 v2

## 1. 目標

v2 已是預設介面，v1 仍可從 `?ui=v1`、sessionStorage、`preferences.uiVersion` 與設定頁「使用舊版介面」進入。此變更要一次移除所有進入 v1 的方式與 v1 程式碼，讓專案只剩一套介面。

## 2. 決策

| # | 決策 |
|---|---|
| D1 | 一次到位：關入口與刪碼同一個版本，rollback 依賴版本回復。 |
| D2 | 先補 v2 導覽，再刪 v1；導覽是這次唯一先補回的能力。 |
| D3 | 批次刪除支出／成員、v1 頭像編輯接受消失（與近期 v2 方向一致）。 |
| D4 | 舊的 `?ui=v1` 連結直接渲染 v2；不新增轉址。 |
| D5 | 資料庫不動：`preferences.uiVersion` 留在 JSON，不再讀寫；`splitDetail` 等資料欄位不變。 |
| D6 | 只刪除 v1 專屬與已無引用的程式碼，共用 API、Prisma、hooks、admin 仍在用的 `components/ui/*` 保留。 |

## 3. v2 導覽

- 新元件：`components/v2/onboarding/project-tour.tsx`，沿用 `driver.js`。
- 顯示條件：專案總覽載入完成、`useOnboarding()` 尚未完成，且不在載入中。
- 完成或跳過都會寫入 `onboardingCompleted`。
- 錨點：`trip-summary`、`feature-grid`、`more-features`、`share`、`add-expense-area`。
- popover portal 到 `body`，因此使用 `.wander-wallet-tour-v2` 與固定 v2 色值，不依賴 `[data-ui="v2"]` 變數。
- 設定頁「重看導覽」保留，現在會真的顯示 v2 導覽。

## 4. 移除內容

- `components/v1/**`（17 檔）
- 只被 v1 使用的模組：
  - `components/voice/voice-expense-dialog.tsx`
  - `components/dashboard/**`
  - `components/settle/{settlement-calc-dialog,share-settlement-dialog}.tsx`
  - `components/export/export-options-form.tsx`
  - `components/cover-picker.tsx`
  - `components/expense/{expense-form,expense-filter-content}.tsx`
  - `components/layout/{app-header,app-layout}.tsx`
  - `components/location-picker.tsx`
  - `components/member-avatar.tsx`
  - `components/project/invite-dialog.tsx`
  - `components/onboarding/app-tour.tsx`
  - `components/ui/{filter-dropdown,search-input,bottom-sheet,tooltip,calculator}.tsx`
  - `components/system/install-prompt.tsx`
- 版本機制：`components/ui-version/**`、`lib/ui-version.ts`、`lib/hooks/useUiVersion.ts`、`lib/hooks/use-beta-toggle.ts`
- 路由：18 條 page 直接渲染 v2，不再使用 `UiVersionSwitch`
- 偏好與 API：`UserPreferences.uiVersion`、`PUT /api/users/profile` 的 `uiVersion` 驗證
- AuthGate：未登入一律顯示 `LoginV2`
- 設定頁：「使用舊版介面」區塊
- 展示頁：`app/demo/ui-consistency`
- 依賴：`@radix-ui/react-tooltip`

## 5. 相容性

- `preferences.uiVersion = "v1"` 的既有使用者：部署後直接看到 v2，偏好值保留但不讀取。
- sessionStorage `ww-ui-version`：不再有程式讀取，殘留值無害。
- `?ui=v1`／`?ui=v2`：忽略參數，仍顯示 v2。
- 沒有 Prisma migration。

## 6. 驗證

- `npm run test:run`：2674 passed、15 failed；15 個失敗在 HEAD 基準也存在（upload-direct、avatar-picker、card、skeleton、feature-grid 舊斷言），與本次無關。
- `npm run lint`：0 errors。
- `npm run build`：成功。
- 新增／更新測試：`project-tour`、`project-overview-v2` 導覽錨點與觸發、`m8-routes` 只驗 v2、`auth-gate` 只驗 LoginV2、設定頁移除舊版開關、profile API 移除 uiVersion 案例。

## 7. 已知落差

- 批次操作只存在於 v1，現在正式消失。
- v1 的頭像編輯消失，profile 維持 v2 唯讀。
- v1 的 `AppTour` 以 v2 導覽取代。
