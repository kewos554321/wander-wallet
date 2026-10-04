# UI v2 里程碑 5 設計：Beta 開關與 v2 深色模式

- 日期：2026-09-29
- 狀態：設計已口頭確認，待審閱本文件
- 上層設計：`docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`（2.6 推出階段、3.2）
- 基底分支：`feat/ui-v2-m2`（含 M1–M4）；本里程碑分支：`feat/ui-v2-m5`

## 1. 目標與決策

**目標**：(1) 使用者可在設定頁自行開啟 v2（階段 1）；(2) v2 支援深色模式，作為階段 2（預設 v2）的上線條件。

| 項目 | 決策 |
|---|---|
| 範圍 | Beta 開關與深色模式在同一里程碑完成 |
| 深色色值 | 設計稿無深色色票；本文件提出一版，實作後由維護者在 app 內檢視，調整只需改 `app/globals.css` |
| 深色機制 | 沿用現有 `ThemeProvider`（`<html class="dark">`），v1／v2 共用同一外觀設定 |
| v1 改動 | 只有 v1 通用設定頁：新增 Beta 開關、存偏好改用 `usePreferences`（保留 `uiVersion`）；畫面其餘不變 |
| 資料庫 | 無變更 |

## 2. Beta 開關

### 2.1 API

`PUT /api/users/profile`：當 `preferences.uiVersion` 存在且不是 `"v1"`／`"v2"` 時回 400 `{ error: "無效的介面版本" }`。其他行為不變。

### 2.2 設定頁

- 共同元件 `components/ui-version/beta-toggle-row.tsx`（v1、v2 各自包樣式外殼也可，但切換邏輯共用 `useBetaToggle`）。
- `lib/hooks/use-beta-toggle.ts`：
  - `enabled` = 目前生效版本是否為 v2（`useUiVersion().version === "v2"`）。
  - `toggle(next: boolean)`：`usePreferences().save({ uiVersion: next ? "v2" : "v1" })`；成功後移除 sessionStorage `ww-ui-version`、以 `history.replaceState` 移除網址 `ui` 參數、派送 `UI_VERSION_CHANGE_EVENT`，畫面立即切換。失敗時顯示 `usePreferences` 的錯誤，不切換。
- v2 通用設定：新增區塊，列「試用新版介面（Beta）」＋說明「關閉後回到舊版介面」，`role="switch"`，`aria-checked` 為 `true`。
- v1 通用設定：新增同名開關，說明「搶先體驗全新設計，可隨時關閉」，`aria-checked` 為 `false`；並把 v1 的 `savePreferences` 改為呼叫 `usePreferences().save`（修正 v1 儲存其他偏好時丟失 `uiVersion`）。
- 浮動切換鈕規則不變（只在網址參數或 sessionStorage 覆寫時出現）。

## 3. 深色模式

### 3.1 Token

`app/globals.css` 新增 `.dark [data-ui="v2"] { color-scheme: dark; … }`，重新定義所有 v2 token；淺色 `[data-ui="v2"]` 區塊只新增 3.2 的新 token，既有值不變。

| token | 淺色 | 深色 |
|---|---|---|
| `paper` | `#FAF7F2` | `#161412` |
| `surface` | `#FFFFFF` | `#201D1A` |
| `ink` | `#1B1815` | `#F2EDE4` |
| `ink-muted` | `#6E6860` | `#B3AB9F` |
| `ink-subtle` | `#B7AE9D` | `#7A7268` |
| `line` | `#E7DFD2` | `#34302B` |
| `sand` | `#F1EBE0` | `#2A2622` |
| `check` | `#C9BFAC` | `#5A534A` |
| `lake` | `#1B5847` | `#4FB394` |
| `lake-soft` | `#EAF5F1` | `#17302A` |
| `link` | `#24735D` | `#6CC7AA` |
| `coral` | `#E8825A` | `#F09A76` |
| `coral-soft` | `#FBEAE0` | `#3A2519` |
| `plum` | `#6B5B95` | `#A897D6` |
| `plum-soft` | `#EFEAF7` | `#2A2438` |
| `gold` | `#9C7A28` | `#D4AE55` |
| `gold-soft` | `#F7EFDD` | `#332A16` |
| `rose` | `#A14A68` | `#D77E9C` |
| `rose-soft` | `#F6E9EE` | `#37212A` |
| `danger` | `#C4472F` | `#E8735A` |

### 3.2 新 token（取代寫死的顏色）

| 新 token | 淺色 | 深色 | 取代 |
|---|---|---|---|
| `line-soft` | `#F0EAE0` | `#2A2622` | `border-[#F0EAE0]`、`bg-[#F0EAE0]` |
| `lake-tint` | `#D2EAE1` | `#1F3D34` | `bg-[#D2EAE1]` |
| `lake-border` | `#DDEDE6` | `#2C4A41` | `border-[#DDEDE6]`、`border-[#DCEAE3]`、`border-[#B7D9CB]` |
| `lake-mid` | `#2F8F74` | `#4FB394` | `border-[#2F8F74]`、`bg-[#2F8F74]` |
| `on-lake` | `#FFFFFF` | `#0F1F1A` | 湖水綠（或其他實色主題色）底上的 `text-white` |
| `coral-strong` | `#C4602F` | `#F09A76` | `text-[#C4602F]` |
| `danger-soft` | `#F6DCD3` | `#3A1E18` | `bg-[#F6DCD3]`、`bg-[#FDF1EC]`、`border-[#F3D3C4]` |
| `danger-strong` | `#C4432A` | `#E8735A` | `text-[#C4432A]` |
| `overlay` | `rgb(0 0 0 / 0.4)` | `rgb(0 0 0 / 0.6)` | `bg-black/40` 等遮罩 |

其餘零星色：`bg-[#FBE3D2]`、`bg-[#F6DCCB]` → `coral-soft`；`bg-[#E4DCF2]` → `plum-soft`；`bg-[#DCD3C2]`、`border-[#DCD3C2]` → `check`；`accent-[#1B5847]` → `accent-v2-lake`；開關圓鈕的 `bg-white` → 新 token `knob`（淺 `#FFFFFF`／深 `#F2EDE4`）；其他 `bg-white` → `bg-v2-surface`。每個 token 需在 `@theme inline` 宣告 `--color-v2-*`。

### 3.3 例外

- `components/v2/quick-expense/camera-step.tsx`：本來就是深色取景畫面，維持原色。
- 封面圖示顏色：`COVER_COLORS` 新增 `darkBg`（`lake #17302A`、`coral #3A2519`、`red #3A1E18`、`rose #37212A`、`gold #332A16`、`plum #2A2438`），`fg` 深色時改用 3.1 對應的提亮色（`lake #4FB394`、`coral #F09A76`、`red #E8735A`、`rose #D77E9C`、`gold #D4AE55`、`plum #A897D6`，欄位 `darkFg`）。`CoverArt` 以 CSS 變數輸出淺／深兩組（`--cover-fg`、`--cover-bg`、`--cover-fg-dark`、`--cover-bg-dark`），由 `globals.css` 的 `[data-cover-art]` 與 `.dark [data-ui="v2"] [data-cover-art]` 規則選用。
- 統計圖表與 `preset:` 封面漸層：維持原色。
- 借用的 v1 元件（日曆、幣別選單、地點、圖片、計算機）：跟隨 v1 自己的深色樣式，不修改。

### 3.4 守門測試

`tests/components/v2/no-hardcoded-colors.test.ts`：掃描 `components/v2/**/*.tsx`（排除 `camera-step.tsx`），出現 `-[#` 任意十六進位色、`bg-white`、`text-white`、`bg-black`、`dark:` 即失敗，錯誤訊息列出檔案與行號。

### 3.5 外觀設定

v2 通用設定加回「外觀」區塊：「淺色」「深色」「系統」三個選項（`aria-pressed`），使用 `useTheme()`（`components/system/theme-provider`），與 v1 共用。

## 4. 模組

| 檔案 | 內容 |
|---|---|
| `app/api/users/profile/route.ts`（修改） | 2.1 |
| `lib/hooks/use-beta-toggle.ts` | 2.2 |
| `components/v2/settings/general-settings-v2.tsx`（修改） | Beta 開關、外觀區塊 |
| `components/v1/settings/general-settings-v1.tsx`（修改） | Beta 開關、儲存改用 `usePreferences` |
| `app/globals.css`（修改） | 3.1、3.2、封面規則 |
| `lib/covers.ts`（修改） | `darkBg`、`darkFg` |
| `components/v2/cover/cover-art.tsx`（修改） | CSS 變數 |
| `components/v2/**`（修改） | 以 token 取代寫死顏色 |

## 5. 限制

- v2 元件不得使用 `dark:` variant（深色一律靠 token）。
- 淺色外觀在改動前後必須一致（token 的淺色值等於原寫死值）。
- 文案繁體中文，註解英文。不改 schema、不執行 `prisma db push`。

## 6. 測試

- API：`uiVersion` 為 `"v2"` 通過、`"v3"`／`1` 回 400。
- `useBetaToggle`：開啟寫入 `"v2"`、關閉寫入 `"v1"`、成功後清除 sessionStorage 與網址參數並派送事件、失敗不清除。
- v1／v2 通用設定：開關初始狀態、點擊呼叫 toggle；v1 儲存其他偏好時請求內容含原本的 `uiVersion`；v2 外觀三選項呼叫 `setTheme`。
- `CoverArt`：輸出四個 CSS 變數且深色值正確。
- 守門測試（3.4）。
- 全套 `npm run test:run`、`npm run lint` 通過。

## 7. 不在範圍

- 階段 2（預設改為 v2）、階段 3（刪除 v1）。
- 借用的 v1 元件改成 v2 樣式。
- 統計圖表深色配色。
