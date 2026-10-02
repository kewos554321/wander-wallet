# UI v2 里程碑 6：套用 v20261003 設計稿

- 日期：2026-10-03
- 狀態：待使用者審閱，之後交給 opencode 執行
- 設計來源：`design/project-v20261003/*.dc.html`（新）；舊版快照 `design/project-backup-20260929/`（與 `design/project/` 相同）
- 目標：「安全將 v1 theme 轉到 v2」。v2 已實作 A1–A14，本里程碑只做「新設計稿 vs 現有 v2 程式」的差異修正（delta），**不動 v1**。

## 1. 範圍

| 畫面 | 設計稿 | 主要程式 | 差異報告 |
|---|---|---|---|
| A1 旅程列表 | `MainCard3-njus` | `components/v2/projects/` | `gap-a1-a2.md` |
| A2 旅程總覽 | `Trip-m0lh` | `components/v2/project/` | `gap-a1-a2.md` |
| A2d 功能列 | `Trip-feature-row-demo` | `components/v2/project/feature-grid.tsx` | `gap-a1-a2.md` |
| A3b/A3d 新增支出 | `AddExpense-section-demo` / `AddExpense-ngs7-sections` | `components/v2/expense-form/` | `gap-a3.md` |
| A5b 結算 | `Settle-sections` | `components/v2/settle/` | `gap-a5-a7.md` |
| A6b 全部支出（含 `FilterDropdowns-test`） | `ExpenseList-sections` | `components/v2/expenses/` | `gap-a5-a7.md` |
| A7b 成員 | `Members-sections` | `components/v2/members/` | `gap-a5-a7.md` |
| A9b 建立旅程 | `NewProject-sections-demo` | `components/v2/new-project/`、`cover/` | `gap-a9-a14.md` |
| A13 專案設定 | `ProjectSettings` | `components/v2/project-settings/` | `gap-a9-a14.md` |
| A14 通用設定 | `GeneralSettings` | `components/v2/settings/` | `gap-a9-a14.md` |

差異報告在 `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/`，內含每個元素的設計數值、現況、要改的檔案與測試。**當差異報告與本文件衝突時，以本文件為準。**

## 2. 不可違反的原則（保護 v1）

1. 只能修改 `components/v2/**`、`app/globals.css`（只能「新增」v2 tokens）、`lib/covers.ts`（只能「新增」id，不可刪除或改名）、`tests/**`、`docs/**`。
2. **絕對不可修改**：`components/v1/**`、`components/ui/**`、`components/expense/**`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/hooks/useExpenseFilters.ts`、`lib/expense-split.ts`、`lib/project-overview.ts`、`lib/trip.ts`、任何 `tests/components/v1/**`。
3. 不新增 API、不改資料庫。（本里程碑所有畫面都不需要。多位付款人只做 UI 呈現，見 §4 問題 12。）
4. `components/v2/**` 內禁止寫 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts` 會檢查）。顏色一律用 token（`bg-v2-*`、`text-v2-*`、`border-v2-*`）。
5. 每個 task 結束都要跑 `npm run lint` 與 `npm run test:run`，全綠才能 commit。
6. 驗證 v1 沒被動到的指令（基準 commit `36633e1`）：
   `git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts`
   輸出必須是空的。

## 3. 設計決策（已替使用者選好預設值，之後可再調整）

| # | 問題 | 決定 |
|---|---|---|
| D1 | 哪個畫布是基準 | v20261003 |
| D2 | A9b「更多圖示」按鈕 | 顯示但 `disabled`，`title="即將推出"`，`aria-label="更多圖示"` |
| D3 | 新封面圖示 | 新增 id：`camera`（Camera）、`fork-knife`（UtensilsCrossed）、`hiking`（MountainSnow）、`mountain`（Mountain）、`heart`（Heart）、`sparkle`（Sparkles），中文標籤：相機／美食／登山／山岳／愛心／亮點 |
| D4 | 新封面顏色 `ink` | fg `#2A241F`、bg `#E9E5DF`、darkFg `#D9D2C7`、darkBg `#2A2622`（深色值為提案） |
| D5 | `red` 封面顏色 | 保留在資料（舊資料相容），只從 picker 隱藏：新增 `COVER_PICKER_COLORS`（lake, coral, plum, gold, rose, ink） |
| D6 | 自訂圖片封面上傳 | v2 picker 移除上傳按鈕；若目前值是自訂圖片，仍顯示「移除自訂圖片」 |
| D7 | A13 封面 | 48px 色塊按鈕，點擊開底部抽屜（內含 `CoverPickerV2` + 「完成」）；設計稿沒畫抽屜，屬自行補上 |
| D8 | A13 底部按鈕 | 維持固定在底部，圓角改 14px |
| D9 | A13 描述 50 字 | 只顯示 `n/50` 計數；超過 50 字計數變 danger 色，**不截斷、不擋儲存**（避免舊資料被截） |
| D10 | 預算前綴 / 千分位 | 前綴依結算幣別顯示符號（TWD→`NT$`，JPY→`¥`，USD→`$`，其他→幣別代碼）；不做千分位 |
| D11 | A14 Beta 開關卡 | 保留（設計稿沒有，但是推出機制需要） |
| D12 | 多位付款人 | A3 只顯示單一付款人的唯讀明細列；不顯示 `全選`、釘選、移除；不改資料 |
| D13 | A2 拍照 FAB | 移除總覽頁的拍照 FAB；拍照仍可從「語音/快速記帳」浮層內的「拍照或掃描收據」進入 |
| D14 | A2「修改」連結 | `/projects/{id}/settings` |
| D15 | A2 餘額顏色 | 金額 ≥ 0 用 `text-v2-ink`；< 0 維持 `text-v2-danger` |
| D16 | A1 無日期旅程的天數 badge | 維持現狀（不顯示） |
| D17 | 金額格式 | 維持 `formatCurrency`（`TWD 1,280`），不改成設計稿的 `NT$ 1,280` |
| D18 | A3 收據圖片卡 | 維持共用的 `ImagePicker`（v1 也在用），樣式差異列入問題清單 |
| D19 | A5–A7 設計稿沒有、但程式有的功能 | 全部保留：批次、AI 快速記帳 FAB、幣別篩選（多幣別才出現）、各人收支、匯率說明、贊助卡 |
| D20 | A6b 設計稿移除的項目 | 移除「建立日期」篩選 UI、卡片上的「建立時間」、卡片上的垃圾桶按鈕（改為滑動刪除）；hook 與 v1 不動 |
| D21 | 滑動刪除 | 實作 `swipe-row`；為了桌機/鍵盤，紅色刪除鈕永遠在 DOM 內且可 focus，focus 時自動展開（不可 `aria-hidden`／`display:none`／`inert`，也不可為了測試把按鈕藏起來） |
| D22 | A9b/A13 幣別標籤 | A9b 顯示 `code + 短名` 13px/700（TWD→`台幣`，其他用 `SUPPORTED_CURRENCIES[].name`）；A13 顯示 `code + 全名` 13px/600（`新台幣`）。用 v2 `currencyLabel(code, short?)` |
| D23 | A2「更多」展開面板 | 用 `border-t border-dashed border-v2-line` 分隔 + 11px/700 `更多功能` 標籤；**不是**圓角色框（與設計稿一致） |
| D24 | A2 功能卡 | 標題「功能」移入卡片內（13/700 lake）；tone 修正：筆記=plum、地圖=gold（目前 code 相反） |
| D25 | A3 付款人卡摘要 | 付款人卡內新增 `已選 N 人 / 金額相符 / $X = $T / $T` 摘要區塊（單一付款人：`已選 1 人`）；與分攤成員卡自己的摘要並存 |
| D26 | A6b 支出卡頁尾 | 一律渲染：左側地點或 `未填寫地點` 佔位；右側 32px 明細指示（有圖 `已附明細圖片`，無圖灰色 `未附明細圖片`） |

## 4. 新增 tokens（只加在 `[data-ui="v2"]`、`.dark [data-ui="v2"]` 與 `@theme inline`）

> `--v2-lake-border`（`#DDEDE6`）已存在，**不要改它**。設計稿的 `#B7D9CB` 是另一個顏色，用新 token `lake-edge`。

| Token | 淺色 | 深色（提案） | 用在 |
|---|---|---|---|
| `--v2-lake-edge` | `#B7D9CB` | `#2E5A4C` | A2 分享/修改膠囊、A5b/A7b 操作按鈕邊框（**不可**命名為既有的 `--v2-lake-border`；A2「更多」展開面板的隔線是 `--v2-line`，不是這個） |
| `--v2-danger-tint` | `#FDF1EC` | `#2A1713` | A13 危險區塊背景 |
| `--v2-danger-border` | `#F3D3C4` | `#5A2E23` | A13 危險區塊邊框 |
| `--v2-danger-wash` | `#FDF2EF` | `#2E1914` | A6b「移除篩選」chip 背景 |
| `--v2-danger-edge` | `#E8A796` | `#6A3A2E` | A6b「移除篩選」chip 虛線邊框 |

對應 Tailwind class：`bg-v2-lake-edge`／`border-v2-lake-edge`、`bg-v2-danger-tint`、`border-v2-danger-border`、`bg-v2-danger-wash`、`border-v2-danger-edge`（在 `@theme inline` 加 `--color-v2-<name>: var(--v2-<name>);`）。

另外加一個工具 class：`[data-ui="v2"] .v2-scroll { scrollbar-width: thin; scrollbar-color: var(--v2-line) transparent; }`（A6b 篩選面板捲動用）。

## 5. 執行順序與計畫檔

總計畫：`docs/superpowers/plans/2026-10-03-ui-v2-milestone-6.md`（含 Part 0 基礎、最後的覆蓋率與 v1 驗證）。各畫面群組各有一份計畫：

| Part | 檔案 | 內容 |
|---|---|---|
| 0 | 總計畫內 | 分支、tokens、`V2TopBar.titleClassName`、token 測試 |
| 1 | `2026-10-03-ui-v2-m6-part1-overview.md` | A1、A2、A2d |
| 2 | `2026-10-03-ui-v2-m6-part2-expense-form.md` | A3b、A3d |
| 3 | `2026-10-03-ui-v2-m6-part3-lists.md` | A5b、A6b、A7b |
| 4 | `2026-10-03-ui-v2-m6-part4-forms.md` | A9b、A13、A14 |
| 5 | 總計畫內 | 覆蓋率、v1 驗證、全部檢查 |

Part 1–4 彼此不共用檔案（共用的 tokens 與 top-bar 已在 Part 0 完成），**建議依序執行**，每個 Part 完成後 commit。

## 6. 測試與覆蓋率要求

- baseline：`docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`（vitest v8，無門檻）。
- 規則：每個 `components/v2/<資料夾>` 的 Lines% 不得低於 baseline；**新增檔案**的 Lines% ≥ 90%。
- baseline 偏低的資料夾要補測試：`components/v2/expenses`（28%，`expense-filter-bar.tsx` 與 `expenses-v2.tsx` 是 0%）、`components/v2/members`（57%，`members-v2.tsx` 39%）。
- 本里程碑要新增的測試檔：`tests/components/v2/{location-picker-v2,join-mode-picker,v2-currency-field,filter-panels,swipe-math,swipe-row,v2-top-bar,v2-tokens,section-card}.test.ts(x)`，以及更新所有被設計變更影響的既有測試（各 Part 內逐一列出）。

## 7. 要回報給使用者的問題點（執行結束後整理）

1. 基準畫布：v20261003 還是 `design/project`？
2. 「更多圖示」目前是停用的占位按鈕。
3. 新圖示 id 與 `ink` 顏色的 bg／深色值是提案。
4. `red` 顏色從 picker 隱藏（舊資料仍可顯示）。
5. 自訂圖片封面上傳在 v2 移除。
6. A13 封面抽屜為自行補上（設計稿未畫）。
7. A13 底部按鈕維持固定（設計稿為內嵌）。
8. 描述 50 字只做顯示計數，不擋儲存。
9. 預算前綴依幣別、無千分位。
10. A14 保留 Beta 開關卡。
11. 新 tokens 的深色值是提案。
12. 多位付款人：設計稿有，現在只顯示單一付款人（需要 schema + 結算重構 + v2 專用 API，另案）。
13. A2 移除拍照 FAB，改由快速記帳浮層進入。
14. A2「修改」導向 `/projects/{id}/settings`。
15. A2 餘額顏色（≥0 ink，<0 danger）。
16. 無日期旅程不顯示天數 badge。
17. 金額顯示維持 `TWD 1,280`，非 `NT$ 1,280`。
18. 收據圖片卡仍是共用 `ImagePicker` 樣式。
19. A5–A7：保留批次／AI FAB／幣別篩選／各人收支；移除建立日期篩選、建立時間、垃圾桶；付款人篩選改單選（設計稿）。
20. 滑動刪除在桌機不易發現（已提供鍵盤 focus 展開）。
21. 設計稿的 `#FBE3D2`、`#DCD3C2` 等無精確 token，以最接近的 token 代替。
22. 新增 token 命名：`lake-edge`（#B7D9CB）與 `danger-edge`（#E8A796）不可命名為既有的 `lake-border` / `danger-border`，否則會影響其他 v2 畫面／A13 危險區塊。
23. A9b 幣別短名 `台幣`（D22）。
24. A2「更多」面板用 `--v2-line` 而非 `lake-edge`（D23）；功能 tone 筆記/地圖已修正（D24）。
25. A6b 支出卡頁尾一律顯示（D26）——若版面過高，可退回「有地點或圖片才顯示」並記錄偏差。
26. 共用 `ImagePicker` 樣式未改（D18），樣式差異列為已知偏差。
