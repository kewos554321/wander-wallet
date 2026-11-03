# V2 畫面 Demo（現況 baseline）設計

日期：2026-10-11
狀態：待實作

## 1. 背景與問題

- 討論 UI 需求時，AI 用文字描述「畫面要怎麼改」，對非工程背景的人很抽象。
- 需要一個「畫面翻譯機」：用**真實的 v2 元件**把目前畫面擺出來。討論改動時，改元件、重整 demo 就能看到結果 —— 取代抽象的文字說明。
- 現況：`app/demo/add-expense`、`app/demo/rate-sheet` 已有雛形，但零散、涵蓋太少；且 `rate-sheet` 是手刻靜態頁（會與正式版 drift）。

## 2. 目標 / 非目標

**目標**

- 在 `/demo` 提供一個**免登入、免後端**的示範區，涵蓋指定的 4 類、共 12 個畫面。
- 每個畫面用**真實 v2 畫面元件** ＋ 一組**共用假資料**呈現，確保與正式版一致（single source of truth）。
- 提供 `/demo` 目錄頁，以及每個畫面上固定的「回 Demo 目錄」導覽。
- 會寫資料的動作（送出、刪除、登入、匯出）以假提示取代。

**非目標**

- 不動 v1、不碰資料庫／API、不改 app 現有行為與路由。
- 不做真登入、相機、定位、AI 解析。
- 不改 v2 元件的對外行為（唯二例外見 §4.3）。
- 不做 before/after 對照模式（列入未來）。

## 3. 範圍：畫面清單

| 分類 | 畫面 | 路由 | 使用元件 |
|---|---|---|---|
| 支出 | 支出列表 | `/demo/expenses` | `ExpensesV2View` |
| 支出 | 新增支出 | `/demo/add-expense`（現有） | `ExpenseFormV2View` |
| 支出 | 快速記帳 | `/demo/quick-expense` | `QuickInputStep`＋`ConfirmStep` |
| 支出 | 匯率面板 | `/demo/rate-sheet`（現有） | `RateSheet` |
| 專案 | 專案列表 | `/demo/projects` | `ProjectsV2View` |
| 專案 | 新專案 | `/demo/new-project` | `NewProjectV2View`（新抽出） |
| 專案 | 專案總覽 | `/demo/overview` | `ProjectOverviewV2View` |
| 專案 | 專案設定 | `/demo/project-settings` | `ProjectSettingsV2View` |
| 結算 | 結算 | `/demo/settle` | `SettleV2View` |
| 個人 | 個人設定 | `/demo/profile` | `ProfileV2View` |
| 個人 | 匯出 | `/demo/export` | `ExportV2View` |
| 個人 | 登入 | `/demo/login` | `LoginV2` |

## 4. 架構

### 4.1 路由與外框

- `app/demo/page.tsx`：目錄頁，依分類列出 12 個畫面並連到各自路由。
- `app/demo/<screen>/page.tsx`：各畫面（`"use client"`）。
- `app/demo/layout.tsx`：demo 外框 —— 包一層 `UiV2Scope`，並渲染固定的「← 回 Demo 目錄」按鈕（目錄頁除外）。
- `/demo/*` 已是 `PUBLIC_PREFIXES` 的公開路由（`components/auth/liff-provider.tsx`），免登入、不會被 `AuthGate` 擋。

### 4.2 假資料層

- 位置：`app/demo/_data/`（Next.js 中以 `_` 開頭的資料夾不會變成路由）。
- 內容：一組**一致的固定資料** —— 一趟「東京之旅」、4 位成員、約 12 筆支出（含 JPY／USD）、一份結算結果、匯率、當前使用者。
- 型別對齊各 view 的 props（`ProjectListItem`／`ProjectListMember`、`ProjectExpense`、`OverviewProject`／`ProjectSummary`、`SettleData`、`ExportContentOptions`／`ExportFilterOptions`／`ExportFormat` 等），以 TypeScript 編譯把關。
- 所有 demo 頁共用同一份，確保金額、人名、日期跨畫面一致。

### 4.3 呈現策略（做法 A：view 驅動）

- **有 `-view` 者**：直接渲染真實 `*-view`，餵 mock props；需要寫入的 callback 以 `alert`／提示取代（例如 `onExport`、`onRequestDelete`）。
- **新增支出**：由 `ExpenseFormV2View` 承接，`draft` 用 `useExpenseDraft` ＋ mock 資料建出（與現有 demo 同源）。相較現行手動拼子元件的做法更完整（含計算機、類別、地點、照片、刪除），故**升級現有 `/demo/add-expense`** 為真 view。
- **無 `-view` 者**（兩個例外）：
  - **新專案**：由 `new-project-v2.tsx` 抽出 `NewProjectV2View`（props 為表單狀態 + callback），container 只保留 hook 與送出邏輯。**正式碼重構，行為不變**，既有 `tests/components/v2/new-project-v2.test.tsx` 須維持綠。
  - **快速記帳**：組合 `QuickInputStep` ＋ `ConfirmStep`（這些步驟元件本身即純畫面元件），用 demo 自己的 state 假裝流程；略過 camera／parsing（或靜態呈現）。**不動正式碼。**
- **登入**：渲染 `LoginV2`（`isDevMode=false`、`onLogin` → 提示）。

## 5. 互動 / 真假邊界

- **真**：view 內部的 UI 狀態 —— 分頁切換、篩選、展開／收合、對話框開關、表單輸入。
- **假**：送出、刪除、登入、匯出等會寫入後端的動作 → 跳提示，不真的存。
- **不支援**：相機、GPS、AI 解析（需裝置／後端）。

## 6. 測試計畫

- 抽出的 `NewProjectV2View`：`npm run test:run` 須全綠（既有測試守住行為不變）。
- 新增的 `/demo` 頁：以手動驗收為主（開 `/demo` 逐頁點）；可選擇性加輕量 smoke test（渲染不炸）。
- 全數通過 `npm run lint` 與 `npm run test:run`。

## 7. 決策記錄

- 採**做法 A（view 驅動）**：直接用真元件，維持 single source of truth。
- 假資料**集中一份**在 `app/demo/_data/`，跨畫面共用。
- 無 view 的兩頁：**新專案抽 view**（零 drift）、**快速記帳用 steps 拼**（不動正式碼）。

## 8. 未竟 / 未來

- before/after 對照模式（每個改動可切「舊 / 新」）。
- 升級現有 `/demo/rate-sheet`：由手刻靜態改為真 `RateSheet`。
- 清理舊的 `demo/add-expense-critique.html`（手刻、未進 git）。
- 視需要把 demo 掛上更完整的導覽（例如每個分類一頁）。
