# UI v2 里程碑 8：新畫面（匯率／歷史紀錄／匯出／筆記／消費地圖／照片牆）

- 日期：2026-10-04
- 狀態：待使用者審閱，之後交給 opencode 執行
- 設計來源：`design/project-v20261004/*.dc.html`（已 commit `f6f74aa`）之 A15／A16／A22／A23／A24／A25
- 盤點依據：`docs/superpowers/specs/2026-10-04-ui-v2-v20261004/new-screens.md`（M7 只列清單不實作，本里程碑接續實作其中 6 個）
- 目標：把 6 個「v2 尚未開發」的畫面，以 **UI-first、唯讀既有 API** 的方式補上 v2 版本，route 以 `UiVersionSwitch` 切換，**不改 v1、不改 API、不改 schema、不改 `lib/**`**。
- 分支／worktree：`feat/ui-v2-m8`，`.worktrees/ui-v2-m8`（自 `main` @ `3e0748a` 開）。

## 1. 範圍

本里程碑只做以下 6 個畫面。其餘新畫面（A17 里程、A18 登入、A19 加入旅程、A20 邀請分享、A14b 個人資料）**不在範圍**，另案。

| 稿 | 畫面 | v1 來源（route 檔案本體） | v2 container（新增） | v2 view（新增） | 資料（既有 API） | Size |
|---|---|---|---|---|---|---|
| A24 | 筆記 | `app/projects/[id]/notes/page.tsx` | `components/v2/notes/notes-v2.tsx` | `notes-v2-view.tsx` | `GET`/`PUT /api/projects/[id]/memo` | S |
| A25 | 照片牆 | `app/projects/[id]/photos/page.tsx` | `components/v2/photos/photos-v2.tsx` | `photos-v2-view.tsx` | `GET /api/projects/[id]`、`GET …/expenses`（`image`） | S |
| A23 | 匯出 | `app/projects/[id]/export/page.tsx` | `components/v2/export/export-v2.tsx` | `export-v2-view.tsx`、`export-data.ts` | `GET /api/projects/[id]`（含 `participants.shareAmount`）、`GET /api/exchange-rates` | M |
| A15 | 匯率 | `app/projects/[id]/currency/page.tsx` | `components/v2/currency/currency-v2.tsx` | `currency-v2-view.tsx`、`format.ts` | `GET /api/projects/[id]`、`GET /api/exchange-rates`（`?date=`） | M |
| A22 | 歷史紀錄 | `app/projects/[id]/activity-logs/page.tsx` | `components/v2/activity-logs/activity-logs-v2.tsx` | `activity-logs-v2-view.tsx`、`format.ts`、`filter-panels.tsx` | `GET /api/projects/[id]/activity-logs`、`GET /api/projects/[id]` | L |
| A16 | 消費地圖 | `app/projects/[id]/map/page.tsx` | `components/v2/map/map-v2.tsx` | `map-v2-view.tsx`（薄包 `components/map/expense-map.tsx`） | `GET /api/projects/[id]`、`GET …/expenses` | L |

執行順序（使用者選定，簡→難）：**A24 → A25 → A23 → A15 → A22 → A16**。

## 2. 不可違反的原則（保護 v1）

1. 可新增／修改：`components/v2/**`、`components/v1/**`（**只新增**抽取用的 `<name>-v1.tsx`，不修改任何既有 v1 元件）、`app/projects/[id]/<screen>/page.tsx`（**只**改成 `UiVersionSwitch`）、`app/globals.css`（只能**新增** v2 tokens）、`tests/**`、`docs/**`。
2. **絕對不可修改**：既有 `components/v1/**` 檔案內容、`components/ui/**`、`components/expense/**`、`components/map/**`（只被 v2 匯入，不修改）、`components/export/export-options-form.tsx`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/**`、`tests/components/v1/**`。
3. 不新增 API、不改資料庫。
4. `components/v2/**` 內禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts`；本里程碑結束時 `EXEMPT` 必須為空）。
5. 每個 task 結束都要跑 `npm run lint` 與 `npm run test:run`，全綠才能 commit。
6. v1 護欄（基準 commit `3e0748a`）：
   `git diff --name-only 3e0748a -- components/v1 components/ui components/expense components/map components/export/export-options-form.tsx components/location-picker.tsx app/api prisma lib`
   - `components/ui`、`components/expense`、`components/map`、`components/export/export-options-form.tsx`、`components/location-picker.tsx`、`app/api`、`prisma`、`lib` 必須 **完全沒有** 變更。
   - `components/v1/**` 只允許出現**新增**（`A`）的 `-v1.tsx`；**不得**有既有 v1 檔案的修改（`M`）或刪除（`D`）。抽取檔案內容必須與原 `page.tsx` 逐字相同（見 §8）。

### 2.1 v1 抽取規則（D45）

現有 6 個 route 的 v1 直接寫在 `page.tsx`。為了套用與其他 v2 route 一致的 `UiVersionSwitch`，將每頁 v1 主體**原封搬移**為 `components/v1/<area>/<name>-v1.tsx`：

- 元件簽名由 route 的 `({ params })` + `use(params)` 改為接受 `projectId: string` prop，其餘 JSX、state、effect、handler **逐字不變**。
- `page.tsx` 變為：

```tsx
"use client"
import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { NotesV1 } from "@/components/v1/notes/notes-v1"
import { NotesV2 } from "@/components/v2/notes/notes-v2"

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<NotesV1 projectId={id} />} v2={<NotesV2 projectId={id} />} />
}
```

- v1 元件的既有 `AppLayout` 標題/返回連結維持不變（v1 外觀）。
- 此舉只新增檔案；不得修改其他 v1 元件。

## 3. 設計決策

| # | 問題 | 決定 |
|---|---|---|
| D44 | 里程碑範圍 | 只做 A15/A16/A22/A23/A24/A25；A17/A18/A19/A20/A14b 另案。 |
| D45 | 路由接線 | 抽取 v1 至 `components/v1/<area>/<name>-v1.tsx`（逐字、`params`→`projectId`），`page.tsx` 改 `UiVersionSwitch`。只新增、不改既有 v1 元件（§2.1）。 |
| D46 | 架構與資料 | 每畫面＝container（`"use client"`、包 `UiV2Scope`、抓資料、持有 UI 狀態）＋純 props 的 view。**不新增 `lib/**` hook**；用 `useAuthFetch` 直接抓，或重用既有 `useProjectData`／`useProjectExpenses`／`useCurrencyConversion`。 |
| D47 | 共用 primitives | 新增 `components/v2/ui/category-chips.tsx`（A16＋A25）、`components/v2/ui/search-field.tsx`（A22）、`components/v2/ui/checkbox-row.tsx`（A23）。重用既有 `V2TopBar`、`SECTION_CARD`/`SECTION_TITLE`、`V2CurrencyField`、`FilterPopover`＋`filter-panels`、`DateRangeField`、`use-dismiss`。A15 深色 hero 卡先內嵌（只有 A15 用到）。 |
| D48 | A22 篩選 | 保留 v1 全部 8 篩選＋條件式幣別；沿用 v1「只對已載入分頁做 client-side 篩選」的行為（spec 註明此限制）。新增 `activity-logs/filter-panels.tsx`（操作／操作者／付款人；actor/payer 為名稱字串，非 member id），其餘重用 Category/Currency/Amount/Date panels。`formatChanges`、動作文案抽成 `activity-logs/format.ts`。 |
| D49 | A16 地圖 | 薄包：`map/map-v2.tsx` 以 `dynamic(..., { ssr: false })` 載入**未修改**的 `components/map/expense-map.tsx`，只把周圍 chrome token 化；保留 v1 的 4 種地圖樣式與點擊→編輯。Leaflet 圖磚/attribution 非 token 化（已知、可接受）。 |
| D50 | A23 匯出數學 | 在 `components/v2/export/export-data.ts`（純函式）重現 v1 演算法（換算→成員 paid/share/balance→greedy 結算→分類統計），檔案產生重用 `lib/export/{csv-generator,pdf-generator,types}`；`components/export/export-options-form.tsx` 不動。成員配對以 **member id**（避免同名混淆）；成員 `paid`/`share`/`balance` 與 `participantShares` 四捨五入至小數 2 位（v1 未四捨五入，屬刻意偏差，見 §9）。 |
| D51 | A25 燈箱 | 保留 v1 lightbox 功能（鍵盤左右／Esc、上/下一張、資訊列、`查看`→編輯），改為 v2 token 行內 overlay（`bg-v2-lightbox`，不用 Radix Portal）。 |
| D52 | A15 換算 | 重用 `useProjectData`＋`useCurrencyConversion`（即時匯率、`getRate`/`convert`、`ratesTimestamp`、`usingFallback`）；歷史匯率 `?date=` 由 container 直接抓。相對時間與自訂匯率 diff 抽成 `currency/format.ts`。 |
| D53 | 新 tokens | 新增 `--v2-gold-tint`、`--v2-lightbox`；若 A15 hero 的 opacity modifier 編譯不穩，才追加 `--v2-on-lake-soft`／`--v2-on-lake-line`（§4）。設計稿中無精確 token 者以最近 token 代替並記錄（§9）。 |
| D54 | 金額格式 | 維持 `formatCurrency`（`TWD 1,280`）；設計稿的 `NT$`／`$` 為已知偏差（沿用 M7 D43/D17），waived。 |
| D55 | A24 錯誤處理 | 沿用 v1 儲存流程（dirty tracking、saving、saved、錯誤用 `alert`），不擴大範圍。 |
| D56 | 執行切分 | Part 0 基礎 → Part 1（A24、A25）→ Part 2（A23、A15）→ Part 3（A22、A16）→ Part 4 Final（§6）。 |

## 4. 新增 tokens（只加在 `[data-ui="v2"]`、`.dark [data-ui="v2"]` 與 `@theme inline`）

| Token | 淺色 | 深色（提案） | 用在 |
|---|---|---|---|
| `--v2-gold-tint` | `#F0E0AD` | `#4A3C18` | A22 編輯費用表頭 icon 底（設計稿 `#F0E0AD`） |
| `--v2-lightbox` | `rgb(23 20 18 / 0.96)` | `rgb(23 20 18 / 0.96)` | A25 燈箱底（避免禁用 `bg-black`） |

對應 Tailwind class：`bg-v2-gold-tint`、`bg-v2-lightbox`（在 `@theme inline` 加 `--color-v2-<name>: var(--v2-<name>);`）。全部登錄到 `tests/components/v2/v2-tokens.test.ts` 的 `NEW_TOKENS`。

半透明白（A15 hero 內 `rgba(250,247,242,.12/.3)`）優先以 opacity modifier 處理：`bg-v2-paper/10`、`border-v2-paper/30`。若 Tailwind v4 對 CSS-var 色 + 透明修飾編譯不穩，則補 `--v2-on-lake-soft`／`--v2-on-lake-line` 兩個 token 並登錄測試（實作時確認）。

## 5. 各畫面設計

### 5.1 A24 筆記（S）

- **路線**：`GET`/`PUT /api/projects/[id]/memo`（`{ memo }`）。
- **View 結構**：
  - `V2TopBar title="筆記" backHref="/projects/{id}" titleClassName="text-[17px] font-semibold"`（設計稿 serif 16/700，v2 統一）。
  - 提示列：`mx-4 mt-3.5 rounded-[12px] border border-v2-lake-border bg-v2-lake-soft px-3.5 py-2.5`，燈泡 icon `text-v2-lake` + 12px「所有成員共享的筆記，可記錄行程、重要資訊等」。
  - 內文卡：`mx-4 mt-3 flex-1 rounded-2xl border border-v2-line bg-v2-surface p-4`，內含無框 `<textarea>`（`bg-transparent text-[15px] leading-[1.7] text-v2-ink resize-none h-full`），placeholder 同設計稿。
  - 底部：全寬按鈕 `h-12 rounded-[14px] bg-v2-lake text-v2-paper text-[15px] font-bold`，文案 `已儲存`／`儲存中...`／`儲存變更`；`!hasChanges || saving` 時 `disabled` + 降透明度。
- **狀態**：`memo`、`originalMemo`、`loading`、`saving`、`saved`；`hasChanges = memo !== originalMemo`。
- **空／載入**：載入顯示 skeleton（token 化）。

### 5.2 A25 照片牆（S）

- **路線**：`GET /api/projects/[id]`（`currency`、`name`）＋ `GET /api/projects/[id]/expenses`（`image`、`amount`、`category`、`description`、`expenseDate`、`payer`）。
- **View 結構**：
  - `V2TopBar title="照片牆"`。
  - 計數列 `N 張收據照片`（13px image icon `text-v2-lake` + `text-v2-ink-muted`）。
  - `CategoryChips`（D47）：`全部 N` + 有照片的分類（emoji＋label＋count），active = `bg-v2-lake text-v2-on-lake`，其餘 `bg-v2-surface border-v2-line`。
  - Grid：`grid grid-cols-2 gap-2.5`（`sm:grid-cols-3 md:grid-cols-4` 沿用 v1 響應式）。
  - 磚塊：`relative aspect-square rounded-[14px] overflow-hidden`；`next/image` `fill object-cover`；左上分類 badge（`bg-v2-surface` + 分類 identity 文字色，10px/600）；底部漸層 `bg-gradient-to-t from-v2-ink/75 to-transparent` + 金額（serif 13/700 `text-v2-paper`）＋描述（10px，截斷）。
  - **Lightbox（保留 v1）**：行內 `fixed inset-0 z-50 bg-v2-lightbox`；點背景關閉、右上 X、左/右箭頭、`next/image` `object-contain`；底部資訊列（分類 pill、金額、描述、日期、付款人、位置、`查看`→`/projects/{id}/expenses/{id}/edit`）；計數 `n / N`。鍵盤 ←/→/Esc。`role="dialog" aria-modal aria-label="照片檢視"`，開啟時 focus。
  - 空狀態：`還沒有照片` / `記帳時上傳收據照片…` + `新增消費` 連結；分類無照片：`此分類沒有照片`。

### 5.3 A23 匯出（M）

- **資料**：直接 `GET /api/projects/[id]`（需完整 `expenses[].participants[].shareAmount`、`members[]`、`customRates`；`useProjectData` 的 `project.expenses` 只有 `{ expenseDate }`，**不足**，改用 `useAuthFetch` 直接抓，與 v1 一致）；`GET /api/exchange-rates`（當幣別 > 1）。
- **`export-data.ts`（純函式，可單測）**：`convertToProjectCurrency`、`filteredExpenses`（日期範圍＋分類）、`buildMemberBalances`、`buildSettlements`（greedy，`|balance| < 1` 視為結清）、`buildExportData` → `ExportData`（型別來自 `lib/export/types`）。與 v1 相同輸入必得相同輸出。
- **View 結構**：
  - `V2TopBar title="匯出"`。
  - 卡片（`SECTION_CARD`）：`匯出格式` 二磚（CSV/PDF；選中 `border-2 border-v2-lake bg-v2-lake-soft text-v2-lake`，未選 `border-v2-line`）；`匯出內容` 三個 `CheckboxRow`（支出明細／結算資訊／統計摘要，各帶 11px 副標）；`篩選條件` 標題列 + `新增篩選`（`FilterPopover` + `CategoryPanel` + `DateRangeField`）；說明文字。
  - 專案摘要框：`rounded-[14px] border border-v2-lake-border bg-v2-lake-soft p-3.5`，三行 11px `text-v2-lake`：專案／支出筆數／成員人數。
  - 固定底部：`匯出 CSV`/`匯出 PDF`（`h-12 rounded-[14px] bg-v2-lake text-v2-paper`），`exporting || !hasSelectedContent || filteredExpenses.length === 0` 時停用；`匯出中...`。
  - 大量資料警告：PDF 且筆數 > 500 時顯示（沿用 v1 文案）。
- **行為**：CSV 同步產生；PDF `await import("@/lib/export/pdf-generator")`；檔名 `${projectName}_匯出`。
- **新元件**：`components/v2/ui/checkbox-row.tsx`（Radix `Checkbox`，非 Portal；checked `bg-v2-lake`/`border-v2-lake`、indicator 白勾用 `text-v2-on-lake`；label 主/副標）。

### 5.4 A15 匯率（M）

- **資料**：`useProjectData(projectId)`（`currency`、`exchangeRatePrecision`、`customRates`）＋ `useCurrencyConversion({ projectCurrency, customRates, precision })`（即時匯率、`getRate`/`convert`、`ratesTimestamp`、`usingFallback`）；歷史匯率由 container `useAuthFetch("/api/exchange-rates?date=…")`。
- **`currency/format.ts`（純函式）**：`formatRelativeTime(ts)`（剛剛／N 分鐘前／N 小時前／N 天前）、`isRatesStale(ts)`（>24h）、`customRateDiff(custom, live)`。
- **View 結構**：
  - `V2TopBar title="匯率"`。
  - 深色 hero：`mx-4 mt-3.5 rounded-[20px] bg-v2-lake text-v2-paper p-[18px] px-5`；標題 `匯率換算`（13/600 opacity-85）；`金額`；金額輸入（`rounded-[12px] border border-v2-paper/30 bg-v2-paper/10 font-v2-serif text-xl font-bold`）；from/to `V2CurrencyField`（在此深底需可讀；若 `V2CurrencyField` 外觀不符，於 hero 內以暗底樣式包一層，實作時確認）；圓形交換鈕 `bg-v2-paper text-v2-lake aria-label="交換幣別"`；結果 `font-v2-serif text-[32px] font-bold`；時間列（`Clock` icon + `更新於 … · 1 {from} = {rate} {to}`）。
  - `專案自訂匯率` 卡（`SECTION_CARD`）：列 `{from} → {projectCurrency}`，自訂值 + 「即時{x} · ±y%」（正 `text-v2-link`、負 `text-v2-danger-strong`）。
  - `即時匯率` 可收合卡：>24h 警示（`bg-v2-danger-tint border-v2-danger-border text-v2-danger-strong`）；3 欄格（`bg-v2-lake-soft rounded-[10px]` 幣別 + serif 14/700 匯率）。
  - `歷史匯率查詢` 可收合卡：日期輸入 + `查詢`；載入後顯示與即時對比（diff）。
  - 收合用 `<details>` 或受控 state；chevron 旋轉 180°。
- **偏差**：金額維持 `formatCurrency`（D54）。

### 5.5 A22 歷史紀錄（L）

- **資料**：`GET /api/projects/[id]/activity-logs?limit=50&offset=`（`{ logs, total, hasMore }`）；`GET /api/projects/[id]`（`currency`）。
- **`activity-logs/format.ts`（純函式）**：`getActionText`、`getActionTone`（create=lake／update=gold／delete=danger）、`formatChanges(changes, defaultCurrency)`（含 `amount`＋`currency` 合併列、`participants` 特例、日期欄位 zh-TW）、`categoryLabel`。與 v1 相同輸入必得相同輸出。
- **`activity-logs/filter-panels.tsx`**：`ActionPanel`（新增/編輯/刪除）、`ActorPanel`、`PayerPanel`（名稱清單，含 header 與空狀態）；重用 `FilterPopover` 外殼。
- **View 結構**：
  - `V2TopBar title="歷史紀錄"`。
  - 搜尋：`SearchField`（`components/v2/ui/search-field.tsx`，13px，placeholder `搜尋描述、付款人、操作者...`）。
  - 篩選列：`grid grid-cols-3 gap-2`；操作／操作者／類別（設計稿 3 個）＋付款人／幣別（條件式，>1 種才顯示）／金額範圍（`AmountPanel`）／建立日期／付款日期（`DatePanel`）。active 顯示 count badge（沿用 `FilterPopover`）。
  - 結果列：`顯示 {filtered} / {logs} 筆` + `清除篩選`（`text-v2-lake` + X icon）。
  - 活動卡：`rounded-2xl border border-v2-line bg-v2-surface overflow-hidden`；表頭 `py-2.5 px-3.5` 依 tone 上色（create `bg-v2-lake-soft text-v2-lake` + icon 底 `bg-v2-lake-edge`；update `bg-v2-gold-soft text-v2-gold` + icon 底 `bg-v2-gold-tint`；delete `bg-v2-coral-soft text-v2-danger` + icon 底 `bg-v2-danger-border`）；右側相對時間；內容：操作者列（頭像／👤 + 名稱，`系統` fallback）、支出摘要塊（`bg-v2-paper rounded-[10px]`：描述、`付款人：… · M/D`、金額、分類 pill）、變更 chips（`金額 <span line-through text-v2-danger>`舊`</span> → <span text-v2-lake>`新`</span>`；其餘欄位 label）。
  - `載入更多`（`hasMore`）；載入中 `載入中...`。
  - 空狀態：有篩選 → `沒有符合條件的紀錄`；無 → `還沒有操作紀錄`。
- **篩選行為**：client-side，只作用於已載入分頁（v1 行為，spec 註明；未來可改 server-side）。

### 5.6 A16 消費地圖（L）

- **資料**：`GET /api/projects/[id]`（`currency`、`name`）＋ `GET /api/projects/[id]/expenses`。
- **地圖**：`map/map-v2.tsx` 內 `const ExpenseMap = dynamic(() => import("@/components/map/expense-map").then(m => m.ExpenseMap), { ssr:false, loading })`；`components/map/expense-map.tsx` **不修改**。props：`expenses`（僅有座標者）、`projectCurrency`、`mapStyle`、`onExpenseClick`（→ `/projects/{id}/expenses/{id}/edit`）。
- **View 結構**：
  - `V2TopBar title="消費地圖"`。
  - 列：`N 筆消費有位置資訊`（MapPin + `text-v2-ink-muted`）+ `顯示列表/隱藏列表` 切換（`border-v2-lake-edge bg-v2-lake-soft text-v2-lake rounded-[8px] px-2.5 py-1.5`）。
  - `CategoryChips`（同 A25）。
  - 地圖容器：`mx-4 mt-3 h-[400px] rounded-[18px] border border-v2-line overflow-hidden bg-v2-lake-soft relative`；左上 `篩選中：全部` pill、右上地圖樣式鈕（4 種樣式，`MAP_STYLES`）；地圖本體填滿。
  - `顯示列表` 開啟時：下方消費卡（`rounded-[12px] border bg-v2-surface p-2.5`：分類 icon 磚、描述、`{payer}付款 · {location}`、金額）。
  - 空狀態：`尚無位置資訊` / 說明 + `新增消費`；footer `還有 N 筆消費沒有位置資訊`。

## 6. 執行順序與計畫檔

總計畫：`docs/superpowers/plans/2026-10-04-ui-v2-m8.md`。各 Part 各一份計畫（或同一份內分 Part）：

| Part | 內容 | 依賴 |
|---|---|---|
| 0 | worktree/branch、2 個新 tokens、`v2-tokens.test.ts`、共用 primitives（`category-chips`、`search-field`、`checkbox-row`）＋測試 | — |
| 1 | A24 筆記、A25 照片牆（含各自 v1 抽取與 route 接線） | 0 |
| 2 | A23 匯出、A15 匯率 | 0（A15 與 A23 共用 `useCurrencyConversion`／tokens；彼此不共用檔案，可依序） |
| 3 | A22 歷史紀錄、A16 消費地圖 | 0（A22 重用 Part 0 的 search-field 與既有 filter 元件；A16 重用 category-chips） |
| 4 | Final：lint、test、build、覆蓋率、v1 護欄、更新 spec | 全部 |

每個 Part 完成後 commit。Part 內順序即畫面由上到下（A24→A25；A23→A15；A22→A16）。

## 7. 測試與覆蓋率要求

- baseline：`docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`（vitest v8，無門檻）。
- **baseline 現實校正**：M6 baseline 的 `All files`（86.12）已與現況不符（本 worktree 實測 main 為 75.14，因 `components/v1/**` 多數未測且被計入）。因此本里程碑**不以 `All files` 為閘**；閘門為：
  1. 每個 `components/v2/<資料夾>` 的 Lines% 不得低於 M6 baseline 對應值（目前 `components/v2` 整體為 100）。
  2. **新增的共用 primitive／純函式**（`category-chips`、`search-field`、`checkbox-row`、`export-data`、`currency/format`、`activity-logs/format`、`activity-logs/filter-panels`）需有測試且 Lines% ≥ 90%；**螢幕 view 儘量 ≥ 90%**；**container 為 wiring，比照既有 `components/v2` container 實務**（專案無 coverage threshold，既有 container 多有低覆蓋）。
  3. 由 route 抽取而**新增的 `components/v1/**` 檔案不列入 ≥90%**（沿用既有 `components/v1/**` 慣例，多數未測）；其覆蓋率下滑屬預期、可接受。
- 測試：
  - 每個 `-view` 以 `renderView(overrides)` 直測（props 驅動），斷言 `data-testid` 與 token class。
  - container：mock `useAuthFetch`／`useProjectData`／`useProjectExpenses`／`useCurrencyConversion`，測接線與狀態（loading/empty/error/儲存）。
  - 6 條 route：新增 `UiVersionSwitch` 分支測試（比照 `tests/components/v2/m4-pages.test.tsx`，mock `useUiVersion`）。
  - `v2-tokens.test.ts`：加 `gold-tint`、`lightbox`（+ 可能的 on-lake-soft/line）到 `NEW_TOKENS`。
  - `no-hardcoded-colors.test.ts`：`EXEMPT` 保持空集合。
  - `export-data.test.ts`：以固定 fixture 驗證與 v1 相同輸入→相同 `ExportData`（成員餘額、greedy 結算、分類百分比）。
  - `activity-logs/format.test.ts`：`formatChanges` 各欄位（金額＋幣別合併、participants、日期、null）。
  - `currency/format.test.ts`：相對時間、stale、diff。
- 指令：`npm run lint && npm run test:run`（看 exit code）；`npm run build`；覆蓋率 `npm run test:coverage`。

## 8. v1 護欄驗證

抽取後，v1 分支行為需與原 page 逐字相同。驗證方式：

1. `git diff --name-only 3e0748a -- components/v1 components/ui components/expense components/map components/export/export-options-form.tsx components/location-picker.tsx app/api prisma lib` 中，`components/v1/**` 只應出現 **新增** 的 `-v1.tsx`（A/M 狀態）；不得有 `D`（刪除）或對既有 v1 檔案的 `M`。
2. 對每個抽取，人工/測試確認搬移後的 v1 JSX 與原 `page.tsx` 相同（先 `git show 3e0748a:<page>` 與新檔比對）。
3. 既有 v1 測試（`tests/components/v1/**`）全綠。

## 9. 要回報給使用者的問題點／已知偏差

1. 金額一律 `formatCurrency`（`TWD 1,280`），非設計稿的 `NT$`／`$`（沿用 M7 D43/D17）。
2. A22 保留 v1 全部 8 篩選＋條件式幣別，設計稿只畫 3 個；色彩沿用 v2 tokens。
3. A22 篩選只作用於已載入分頁（沿用 v1；未來可 server-side）。
4. A16 地圖本體為第三方 Leaflet，圖磚/attribution 非 v2 token；`components/map/expense-map.tsx` 不修改。
5. A23 匯出數學在 `components/v2/export/export-data.ts` 重現（因 `lib/**` 禁改）；與 v1 匯出結果應逐位一致。
6. 抽取 v1 會在 `components/v1/**` **新增**檔案（`-v1.tsx`），但不修改既有 v1 元件。
7. 設計稿色 `#FBF4DF`（A22 編輯表頭）以最近 token `--v2-gold-soft`（`#F7EFDD`）代替；`#F3D9CE`（A22 刪除 icon 底）以 `--v2-danger-border`（`#F3D3C4`）代替；`#E3EEDF→#D7E8DD`（A16 地圖佔位漸層）以 `bg-v2-lake-soft` 代替；`#A79F8F`（搜尋 placeholder）以 `--v2-ink-subtle`（`#B7AE9D`）代替。皆記錄為小幅偏差。
8. A15 深色 hero 上的 `V2CurrencyField` 目前為淺色 trigger；若在深底不可讀，實作時以局部深底樣式包裝（不修改共用元件行為，僅傳 class）。
9. A15 hero 的半透明層若 opacity modifier 編譯不穩，將補 `--v2-on-lake-soft`／`--v2-on-lake-line` tokens。
10. A24 錯誤沿用 v1 `alert`（D55）。
11. A25 lightbox 保留 v1 功能（含 `查看`→編輯），設計稿只畫 grid。
12. 本里程碑不含 A17 里程、A18 登入、A19 加入旅程、A20 邀請分享、A14b 個人資料。
13. 執行於 worktree `.worktrees/ui-v2-m8`、分支 `feat/ui-v2-m8`（自 `main` @ `3e0748a`）。
14. 覆蓋率閘門以 `components/v2/**` 與新增 v2 檔案為準；`All files` 因 baseline 過時而不設閘，抽取的 `components/v1/**` 新檔未測屬預期（§7）。
15. 資料取得：A16／A23／A25 重用 `useProjectData`＋`useProjectExpenses`（`ProjectExpense` 已含 `image`／`latitude`／`longitude`／`participants[].shareAmount`）；A22 直接 `useAuthFetch` 抓 activity-logs；A24 直接 `useAuthFetch` 抓 memo。
16. 覆蓋率實測：`components/v2` 整體（root）100%，所有既有 `components/v2/<folder>` 皆不低於 M6 baseline（多數提升）；共用 primitive／純函式 ≥90%；部分新 view／container（activity-logs、export、currency）低於 90%，比照既有專案 container 實務（§7）。
17. A23 匯出：成員配對以 member id（避免同名成員混淆）；成員 `paid`/`share`/`balance` 與 `participantShares` 四捨五入至小數 2 位（v1 未四捨五入）——屬刻意、可接受的偏差。
18. A15 轉換目標幣別由 `projectCurrency` 推導（使用者可覆寫），修正 v1 曾在非 TWD 專案把目標預設為 TWD 的問題；已加測試。
