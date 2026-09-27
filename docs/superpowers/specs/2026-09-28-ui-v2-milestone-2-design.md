# UI v2 里程碑 2 設計：A6 全部支出、A5 結算、A7 成員、A8 統計

- 日期：2026-09-28
- 狀態：已確認，待撰寫實作計畫
- 上層設計：`docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`（架構、切換機制、推出階段皆沿用，本文件不重複）
- 設計來源：`design/project/ExpenseList.dc.html`（A6）、`Settle.dc.html`（A5）、`Members.dc.html`（A7）、`Stats.dc.html`（A8）
- 基底分支：`feat/ui-v2-m1`；本里程碑分支：`feat/ui-v2-m2`

## 1. 目標與決策

**目標**：以 M1 建立的架構完成 4 個頁面的 v2 畫面；v1 行為與畫面不變。

| 項目 | 決策 |
|---|---|
| 設計稿未畫的 v1 功能 | 全部保留，改為 v2 樣式放入版面（見第 3 節）；A8 例外，見下 |
| A8 統計圖表 | 依設計稿改為 CSS 長條；不用 recharts；拿掉「類別趨勢」與「成員收支長條」（成員收支在 A5 已有） |
| 對話框／確認視窗 | 沿用 v1 元件（與 M1 一致）；全站 v2 對話框樣式延到里程碑 5 |
| API／資料庫 | 不修改 |
| 設計稿新增功能 | A5「日均花費」、A6 依付款日期分組＋排序切換，皆以既有資料在前端計算 |
| 分支 | `feat/ui-v2-m2` 由 `feat/ui-v2-m1` 分出，M1 可獨立合併 |

## 2. 架構

每個頁面比照 M1：

1. 原頁面原封不動搬到 `components/v1/<page>/`。
2. 路由檔只以 `UiVersionSwitch` 分流。
3. 資料抓取與寫入動作抽成共用 hook，v1 同步改用；計算抽成純函式。

| 頁面 | 路由 | 共用 hook（新增） | 純函式（新增） |
|---|---|---|---|
| A6 | `app/projects/[id]/expenses/page.tsx` | `useProjectExpenses(projectId)`：抓取、單筆刪除（含 LINE 通知選項）、批次刪除 | `groupExpensesByDay()`、`sortExpenses()` |
| A5 | `app/projects/[id]/settle/page.tsx` | `useSettlement(projectId)`：抓取 `/settle`、顯示幣別切換與換算、分享文字 | `computeDailyAverage()` |
| A7 | `app/projects/[id]/members/page.tsx` | `useProjectMembers(projectId)`：抓取、新增佔位成員、移除、批次移除 | — |
| A8 | `app/projects/[id]/stats/page.tsx` | 沿用現有資料抓取方式抽成 hook | `computeProjectStats()`：類別佔比、成員排行（應分攤金額）、每日趨勢 |

- 篩選沿用 `lib/hooks/useExpenseFilters.ts`。
- 邀請沿用 M1 的 `components/project/invite-dialog.tsx`。
- v1 統計頁的成員分攤計算抽入 `computeProjectStats()`，v1、v2 共用，確保數字一致。

### 2.1 新增計算規則

- **日均花費**：`總額 ÷ 天數`。天數優先用 `getTripDays(startDate, endDate)`；缺日期時用支出付款日期（`expenseDate`）最早到最晚的天數（含頭尾）；沒有支出時日均為 0。
- **分組**：依 `expenseDate` 的本地日期分組，組內與組間皆依目前排序；今天的組標題加「（今天）」，格式 `M/D`。
- **排序**：「付款日期」（預設）依 `expenseDate` 新到舊；「建立日期」依 `createdAt` 新到舊。選「建立日期」時仍依付款日期分組，只改變組內順序。

## 3. 各頁 v2 內容

### A6 全部支出
- 頂部總覽卡：總支出、日期範圍、筆數、平均每筆。
- 搜尋框；篩選 chip：類別、付款人、參與者、金額。
- 篩選列右側：排序切換（建立日期／付款日期）、「顯示 x／y 筆」、「清除」、「批次」。
- 依付款日期分組的支出卡片：類別、描述、金額、付款時間與建立時間、地點（有才顯示）、付款人、分攤人數。
- 保留的 v1 功能：
  - 點卡片 → `/projects/[id]/expenses/[expenseId]/edit`
  - 單筆刪除 → 卡片右側「⋯」選單，確認視窗含「通知 LINE 群組」選項
  - 收據圖片 → 有圖片時顯示縮圖，點擊開大圖
  - 語音記帳 → 右下浮動按鈕（同 A2）
  - 批次模式 → 卡片變勾選，底部「刪除 n 筆」

### A5 結算
- 計算總覽：支出筆數、總金額、日均花費、人均。
- 轉帳建議：付款人 → 收款人、金額。
- 按鈕：「計算說明」（沿用 v1 對話框）、「分享」（沿用 v1 分享對話框）、「查看統計」（連到 A8）。
- 保留的 v1 功能：
  - 顯示幣別切換 → 總覽卡右上幣別選單
  - 各人應收／應付 → 轉帳建議下方「各人收支」區塊
  - 廣告 → 總覽卡下方
  - 評分卡 → 頁面最下方

### A7 成員
- 頂部：人數；右側「邀請」「手動新增」兩個按鈕。
- 成員列：頭像、名字、「建立者／你／佔位成員」標籤、email 或「尚未加入」、移除按鈕（建立者與自己不顯示）。
- 保留的 v1 功能：批次移除 → 人數旁「批次」文字按鈕；批次模式下每列為勾選框，底部「移除 n 位」。

### A8 統計
- 類別佔比：橫條，顯示百分比與金額。
- 成員排行：依應分攤金額排序。
- 每日趨勢：依付款日期的 CSS 長條。

### 共同規則
- 版面數值以各自設計稿為準；頂列用 `V2TopBar`；金額用 `formatCurrency`。
- 載入中顯示骨架；無資料顯示空狀態文字。
- v2 元件不得使用 `dark:` variant。

## 4. 測試

- 純函式單元測試：`groupExpensesByDay`、`sortExpenses`、`computeDailyAverage`、`computeProjectStats`。
- 共用 hook 的 `renderHook` 測試：刪除、批次刪除、新增成員、移除成員、錯誤時的 `alert`。
- v2 畫面元件測試（假資料）：關鍵數字、空狀態、保留功能的入口。
- v1 既有測試全部通過。
- 人工比對：同一網址 `?ui=v1` 與 `?ui=v2`。

## 5. 任務切分

每頁兩個 task：先「搬移 v1 + 抽共用邏輯」，再「v2 畫面」。共 8 個 task，加上最後的整體驗證。

## 6. 不在本設計範圍

- v2 樣式的對話框（里程碑 5）。
- 深色模式（里程碑 5）。
- 多位付款人（獨立遷移）。
