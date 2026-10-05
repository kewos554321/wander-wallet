# UI v2 遷移設計

- 日期：2026-09-27
- 狀態：已確認，待撰寫實作計畫
- 設計來源：Claude Design 畫布「Wander Wallet UI/UX 重新設計」，本地副本位於 `design/project/*.dc.html`

## 1. 目標與限制

**目標**：將 Wander Wallet 逐步遷移至新版 UI/UX（v2），過程中現有用戶不受影響，且任何時候都能退回舊版（v1）。

**已確認的決策**

| 項目 | 決策 |
|---|---|
| 遷移方式 | 新舊並存，同一網址依版本渲染不同畫面（方案 A） |
| 比對方式 | 網址參數 `?ui=v1` / `?ui=v2`，不另開 `/v2` 路由，不設白名單 |
| 視覺數值 | 以 `design/project/*.dc.html` 內的實際數值為準 |
| A3 / A3c | 皆為 v2 互動模式參考，非二選一 |
| 多位付款人 | **不在本次範圍**，之後以獨立遷移處理 |
| 深色模式 | v2 試用期間只有淺色；深色 tokens 為「v2 改成預設」的上線條件 |
| 底部導覽列 | 不做。最終 A2 以可滑動的「功能」格狀卡片＋右下三顆浮動按鈕提供入口 |

**限制**

- 網址不能變：LINE LIFF 入口與已分享的專案連結都指向現有路由。
- 遷移期間資料庫只做擴充，不刪除、不改名欄位。
- v1 與 v2 的金額計算必須一致，不可有兩套邏輯。

## 2. 架構與切換機制

### 2.1 版本判斷

新增 `useUiVersion()` hook，依下列優先順序回傳 `"v1" | "v2"`：

1. 網址參數 `?ui=v1` 或 `?ui=v2`：採用並寫入 `sessionStorage`（key：`ww-ui-version`）
2. `sessionStorage` 中已記錄的版本：換頁後仍停留在同一版
3. `User.preferences.uiVersion`：從 `LiffProvider` 取得，階段 1 起使用
4. 預設 `"v1"`

`sessionStorage` 讀寫一律包 try/catch，失敗時略過該層。

### 2.2 頁面分流

```
app/projects/page.tsx        → 依 useUiVersion() 渲染 <ProjectsV1 /> 或 <ProjectsV2 />
components/v1/projects/...   → 原頁面內容原封不動搬移
components/v2/projects/...   → 新版畫面
```

- 路由檔只負責分流，不含畫面邏輯。
- 尚未完成 v2 的頁面不分流，一律顯示 v1。

### 2.3 邏輯共用

資料抓取與計算抽成 hooks（擴充現有 `lib/hooks/useProjectData.ts`），v1 與 v2 共用，兩版只在畫面層不同。

### 2.4 樣式隔離

- `<UiV2Scope>` 包裝元件：在根元素加上 `data-ui="v2"`、強制淺色，並套用 v2 字體變數。
- v2 tokens 只宣告在 `[data-ui="v2"]` 範圍內，`globals.css` 既有的 `:root`、`.dark` 變數不動。
- 字體：以 `next/font/google` 載入 Noto Serif TC（500/600/700）與 Noto Sans TC（400/500/600/700），變數只在 v2 範圍套用；v1 維持 Geist。

**v2 tokens（取自設計稿）**

| Token | 值 | 用途 |
|---|---|---|
| paper | `#FAF7F2` | 頁面背景 |
| surface | `#FFFFFF` | 卡片 |
| ink | `#1B1815` | 主要文字 |
| ink-muted | `#6E6860` | 次要文字 |
| ink-subtle | `#B7AE9D` | 輔助說明 |
| line | `#E7DFD2` | 邊框 |
| sand | `#F1EBE0` | 分段控制底色、中性底 |
| lake | `#1B5847` | 主色 |
| lake-soft | `#EAF5F1` | 主色淺底 |
| coral | `#E8825A` | AI 功能點綴 |
| danger | `#C4472F` | 危險動作 |

字級：Serif 用於 40 / 27 / 20 / 17px（主要數字、頁面主標題、次要金額、區塊標題），Sans 用於 15 / 13 / 12 / 11px。實作時如與 HTML 實際數值不同，以 HTML 為準。

### 2.5 比對用浮動切換按鈕

- 只在本次瀏覽曾使用 `?ui=` 參數時顯示，一般用戶看不到。
- 點擊在 v1 / v2 間切換（更新 `sessionStorage` 並重新渲染）。
- 位置與現有 `DebugOverlay` 相鄰，不另外佔用畫面。

### 2.6 推出階段

| 階段 | 誰看得到 v2 | 控制方式 | 進入條件 |
|---|---|---|---|
| 0 | 知道網址參數的人 | `?ui=v2` | 里程碑 1 完成 |
| 1 | 自願試用者 | 設定頁「試用新版介面（Beta）」寫入 `preferences.uiVersion` | 里程碑 1–4 完成 |
| 2 | 所有人，預設 v2 | 預設值改為 v2，保留「切回舊版」 | 深色模式完成（里程碑 5） |
| 3 | — | 刪除 v1 程式碼 | 階段 2 穩定運作 |

`?ui=v2` 不設白名單：一般用戶不易發現，且第 3 節的相容設計確保即使進入 v2 也不會破壞 v1 的資料。

`public/sw.js` 目前沒有快取邏輯，不會造成切換後仍顯示舊畫面，不需處理。

## 3. 資料、API 與相容性

### 3.1 資料庫

唯一的結構變更（里程碑 3 才進行）：

```prisma
model Expense {
  // ...
  splitDetail Json? @map("split_detail") // v2 個人項目明細，選填
}
```

格式：

```ts
{
  version: 1,
  personalItems: { [memberId: string]: { name: string; amount: number }[] },
  customShares:  { [memberId: string]: number }
}
```

- 每人應付金額仍**只以 `ExpenseParticipant.shareAmount` 為準**；結算、統計、匯出不讀 `splitDetail`。
- 選填欄位，不影響既有資料；退回時刪除欄位即可。

### 3.2 API 調整

| API | 調整 | 里程碑 |
|---|---|---|
| `PUT /api/users/profile` | 放行 `uiVersion`（`"v1" \| "v2"`）與 `defaultCurrency` | 5（Beta 開關）／4（通用設定） |
| `POST/PUT /api/projects/[id]/expenses` | 接收 `splitDetail`；驗證個人項目總和＋共同分攤＝總金額，且與 `participants` 一致 | 3 |
| `GET /api/projects/[id]/expenses` | 回傳 `splitDetail` | 3 |
| `POST/PUT /api/projects` | 驗證新封面格式 | 4 |

旅程總額與成員（A1）沿用現有 `GET /api/projects`；「我的餘額」（A2）沿用現有 settle API，不新增端點。

### 3.3 封面新格式

- 格式：`icon:<iconId>;color:<colorId>`，例如 `icon:leaf;color:teal`。
- `parseCover()` 新增回傳型別 `"icon"`（含 `iconId`、`colorId`）；格式錯誤時回傳 `"none"`。
- v1 遇到 `"icon"` 類型時顯示預設封面，不會當成圖片網址造成破圖。
- **順序**：里程碑 1 先部署讀取端（v1、v2 皆更新），里程碑 4 的建立旅程／專案設定才開始寫入新格式。

### 3.4 防止 v1 覆蓋 v2 資料

- v1 編輯支出頁若偵測到 `splitDetail` 不為空：顯示「此支出使用新版功能建立，請切換到新版編輯」，表單唯讀、不可儲存。
- v1 仍可刪除此類支出（刪除不破壞資料一致性）。
- 此保護必須與 `splitDetail` 的寫入**在同一次部署**上線（里程碑 3）。

## 4. 里程碑

### 里程碑 1（本次實作）：基礎架構＋A1＋A2

**基礎架構**
- `useUiVersion()` hook
- 浮動切換按鈕
- `<UiV2Scope>` 包裝元件、v2 tokens、v2 字體
- `parseCover()` 支援 `icon:` 格式（只讀）

**頁面**
- A1 旅程列表（`app/projects/page.tsx`，設計稿 `MainCard3-njus.dc.html`）
  - 分流至 `ProjectsV1` / `ProjectsV2`
  - 「全部／進行中／已完成」依出發日與結束日推算；未設定日期者歸入「進行中」
- A2 旅程總覽（`app/projects/[id]/page.tsx`，設計稿 `Trip-m0lh.dc.html`）
  - 總額、平均每人、預算進度、我的餘額、功能格狀卡片（11 項）、最近支出、三顆浮動按鈕
  - 資料抓取抽成 hook，v1 同步改用

**不在範圍**：`splitDetail`、新增支出頁、封面寫入新格式。

### 後續里程碑（各自另行規劃）

| 里程碑 | 範圍 | 風險 |
|---|---|---|
| 2 | A6 全部支出、A5 結算、A7 成員、A8 統計 | 低（只讀） |
| 3 | A3 新增／編輯支出＋`splitDetail`＋v1 唯讀保護；A10 拍照、A11/A12 語音 | 高（寫入） |
| 4 | A9 建立旅程（開始寫入新封面格式）、A13 專案設定、A14 通用設定 | 中 |
| 5 | 深色 tokens、設定頁 Beta 開關，進入階段 1 | 中 |

## 5. 測試

- **單元測試**（`tests/lib/`）
  - `useUiVersion`：參數、sessionStorage、preferences、預設值的優先順序；sessionStorage 無法存取時的行為
  - `parseCover`：`icon:` 格式、格式錯誤的 fallback、既有 `preset:` 與自訂圖片不受影響
- **元件測試**（`tests/components/v2/`）
  - A1、A2 以假資料渲染，檢查總額、預算進度、日期篩選、功能入口連結
- **回歸**：現有 v1 測試全數通過
- **人工比對**：同一網址分別加 `?ui=v1` 與 `?ui=v2`，於 LIFF 內與手機瀏覽器各檢查一次

## 6. 不在本設計範圍

- 多位付款人（`ExpensePayer` 表）：需另行設計，採 expand–contract 遷移，並先統一所有計算邏輯改讀新表。
- v2 深色模式的實際色值：於里程碑 5 設計。
