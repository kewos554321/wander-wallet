# UI v2 里程碑 4 設計：A9 建立旅程、A13 專案設定、A14 通用設定

- 日期：2026-09-29
- 狀態：設計已口頭確認，待審閱本文件
- 上層設計：`docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`（3.2、3.3）
- 設計來源：`design/project/NewProject.dc.html`（A9）、`design/project/ProjectSettings.dc.html`（A13）、`design/project/GeneralSettings.dc.html`（A14）
- 基底分支：`feat/ui-v2-m2`（含 M3b）；本里程碑分支：`feat/ui-v2-m4`

## 1. 目標與決策

**目標**：`/projects/new`、`/projects/[id]/settings`、`/settings` 提供 v2 版本（與 v1 共用網址，由 `UiVersionSwitch` 切換）；v2 建立旅程與專案設定開始寫入新封面格式，v2 各處依圖示與顏色顯示封面。

| 項目 | 決策 |
|---|---|
| 程式組織 | v1 頁面內容原封不動搬到 `components/v1/...`；v2 為新元件；共用邏輯放新 hook／lib。v1 行為不變 |
| 外觀（淺色／深色／系統） | v2 通用設定在 M4 隱藏，M5 再加；v1 照常 |
| 封面選擇器 | 圖示＋顏色、或上傳自訂圖片；不提供 v1 的 emoji 預設封面。舊專案的 `preset:` 封面照常顯示，使用者改選才會替換 |
| 新封面格式 | `icon:<iconId>;color:<colorId>`（沿用 M1 已上線的讀取格式） |
| API | 只新增封面格式驗證；其他欄位沿用現有 API |
| 資料庫 | 無變更 |

## 2. 封面

### 2.1 圖示與顏色

| iconId | lucide 圖示 |
|---|---|
| `compass` | `Compass` |
| `leaf` | `Leaf` |
| `utensils` | `Utensils` |
| `globe` | `Globe` |
| `car` | `Car` |
| `bed` | `BedDouble` |
| `star` | `Star` |

| colorId | 前景色 | 底色 |
|---|---|---|
| `lake` | `#1B5847` | `#EAF5F1` |
| `coral` | `#C4602F` | `#FBE3D2` |
| `red` | `#C4472F` | `#F6DCD3` |
| `rose` | `#A14A68` | `#F5DDE6` |
| `gold` | `#9C7A28` | `#F6ECCF` |
| `plum` | `#6B5B95` | `#E7E2F2` |

預設（新建旅程未選擇時）：`leaf` + `lake`。實作時以設計稿色票為準微調底色，但 id 不可變。

### 2.2 `lib/covers.ts`

- 新增 `COVER_ICONS`、`COVER_COLORS`（id 與上表一致）。
- 新增 `buildIconCover(iconId, colorId): string`。
- `parseCover`：`icon:` 格式但 iconId 或 colorId 不在清單內時回傳 `{ type: "none" }`。
- 新增 `isValidCover(cover: unknown): boolean`：`null`、`undefined`、`""`、合法 `preset:<已知 id>`、合法 `icon:`、`https://` 開頭的自訂圖片網址（沿用現有 custom 判斷）為合法，其餘不合法。

### 2.3 API 驗證

- `POST /api/projects`、`PUT /api/projects/[id]`：`cover` 有提供且 `!isValidCover(cover)` 時回 400 `{ error: "封面格式不正確" }`，不寫入。
- v1 設定頁存檔時原樣送回載入的 `cover`，因此 `icon:` 封面不會被清除（計畫需以測試確認）。

### 2.4 v2 顯示

- 新增 `components/v2/cover/cover-art.tsx`：依 `parseCover` 畫方塊（自訂圖片、`preset` emoji 漸層、`icon` 圖示＋底色、`none` 預設葉子）；接受 `size`／`className`。
- `components/v2/projects/cover-thumb.tsx` 改用 `CoverArt`；v2 專案總覽若有封面顯示也改用它。

## 3. 畫面

### 3.1 A9 建立旅程（`/projects/new`）

- 頂部列「建立旅程」與返回。
- 「卡片預覽」：`CoverArt`＋名稱（空白時顯示 placeholder「峇里島放鬆之旅」樣式的灰字）＋天數（未設日期「— 天」）＋「尚未設定日期 · 尚未邀請旅伴」＋「尚未記帳」。
- 欄位：封面（`CoverPickerV2`）、旅程名稱（必填）、出發日與結束日（日期區間）、結算幣別（`CurrencySelect`，預設使用者偏好幣別）、預算（選填，數字）、描述（選填）、成員加入方式（`both`「兩者皆可」／`create_only`「僅建立新成員」／`claim_only`「僅取代佔位成員」，說明文字同 v1，預設 `both`）。
- 「建立旅程」：驗證通過後 `POST /api/projects`（欄位同 v1），成功導向 `/projects/<id>`；失敗在按鈕上方顯示伺服器錯誤。

### 3.2 A13 專案設定（`/projects/[id]/settings`）

- 分區：基本資訊（名稱、封面、描述）、日期與預算（日期區間、預算＋說明「設定預算後，可在旅程總覽查看花費進度」）、幣別與匯率（結算幣別；自訂匯率列表：幣別＝數值、可新增／刪除，未設定顯示「目前使用即時匯率：1 X = Y 結算幣別」；匯率計算精度 0–8 位小數）、成員加入方式。
- 底部固定「取消」（回上一頁）與「儲存變更」（`PUT /api/projects/[id]`，欄位同 v1：`name, description, cover, budget, currency, startDate, endDate, joinMode, exchangeRatePrecision, customRates`）。
- 「危險區域」：說明「刪除專案後，所有成員、支出紀錄都會永久移除，此操作無法復原。」＋「刪除專案」→ 確認對話框 → `DELETE /api/projects/[id]` → 導向 `/projects`。
- 權限：沿用 v1 判斷（非擁有者時的行為與 v1 相同）。

### 3.3 A14 通用設定（`/settings`）

- 個人資料卡（頭像字首、名稱、「LINE 用戶 · 點擊編輯個人資料」）→ `/settings/profile`（該頁不改）。
- 記帳偏好：預設幣別（說明「新增支出時優先使用此幣別」）、預設分帳方式（均分／自訂金額）。
- LINE 通知：說明「控制支出操作時是否發送 LINE 群組通知」＋新增／更新／刪除三個開關。
- 其他：「重看導覽」（說明「進入任一旅程時會重新顯示導覽」，行為同 v1 `resetOnboarding`）、「功能介紹」（同 v1：開新分頁 `/`）、「意見回饋」（同 v1：開新分頁 LINE 官方帳號連結）。
- 不顯示外觀區塊。
- 每次變更立即儲存（同 v1）；儲存使用 `usePreferences`，**以原始 `user.preferences` 為基底合併**，保留 `uiVersion` 等未列在 `UserPreferences` 預設值中的欄位；失敗時顯示錯誤並還原畫面值。

## 4. 模組

| 檔案 | 內容 |
|---|---|
| `lib/covers.ts`（修改） | 2.2 |
| `app/api/projects/route.ts`、`app/api/projects/[id]/route.ts`（修改） | 2.3 |
| `lib/hooks/use-project-form.ts` | 建立／設定共用表單狀態與驗證（名稱必填且去空白後 ≤ 現有上限；結束日不可早於出發日；預算需為空或 ≥ 0 的數字；精度為 0–8 整數；自訂匯率需 > 0） |
| `lib/hooks/use-preferences.ts` | 讀取合併後偏好、`save(patch)` 保留原始欄位 |
| `components/v2/cover/cover-art.tsx`、`cover-picker-v2.tsx` | 2.4、封面選擇器（上傳沿用 `uploadImageToR2`，type `"cover"`） |
| `components/v2/new-project/new-project-v2.tsx` | A9 |
| `components/v2/project-settings/project-settings-v2.tsx` | A13 |
| `components/v2/settings/general-settings-v2.tsx` | A14 |
| `components/v1/new-project/new-project-v1.tsx`、`components/v1/project-settings/project-settings-v1.tsx`、`components/v1/settings/general-settings-v1.tsx` | 由原頁面檔原封不動搬移 |
| `app/projects/new/page.tsx`、`app/projects/[id]/settings/page.tsx`、`app/settings/page.tsx` | 改為 `UiVersionSwitch`；v2 以 `UiV2Scope` 包裹 |

## 5. 限制

- v2 元件不得使用 `dark:` variant；版面數值以設計稿為準。
- 文案為繁體中文，程式註解為英文。
- 不修改 `prisma/schema.prisma`；不執行 `prisma db push`、不連線資料庫。
- 搬移到 `components/v1/` 的程式碼除 import 路徑與匯出名稱外不得修改。
- `/settings/profile` 不在範圍。

## 6. 測試

- `lib/covers`：`buildIconCover`、`parseCover` 未知 id → `none`、`isValidCover` 各類輸入（含 `javascript:`、未知 preset、格式錯誤的 `icon:`）。
- API：兩個 route 對不合法封面回 400 且不呼叫 prisma 寫入；合法 `icon:` 通過。
- `use-project-form`：各驗證規則與錯誤訊息。
- `use-preferences`：儲存時保留 `uiVersion`；失敗還原。
- 元件：A9 預覽隨輸入更新、必填驗證、送出 payload（含 `icon:` 封面）與導向；A13 載入顯示、儲存 payload、自訂匯率新增／刪除、刪除需確認；A14 各開關儲存、無外觀區塊、連結行為；`CoverArt` 四種型別；`CoverPickerV2` 選圖示／顏色輸出正確字串。
- 頁面切換：三個 page 在 v1／v2 分別渲染對應元件。
- 全套 `npm run test:run` 與 `npm run lint` 通過。

## 7. 不在範圍

- 深色主題與外觀設定（M5）、Beta 開關（M5）。
- `/settings/profile`、成員管理、匯出。
- 刪除舊 `preset:` 封面或資料轉換。
