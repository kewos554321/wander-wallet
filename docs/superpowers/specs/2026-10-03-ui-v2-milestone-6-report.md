# UI v2 里程碑 6 執行報告：套用 v20261003 設計稿

- 日期：2026-10-03
- 分支：`feat/ui-v2-m6`（基準 `36633e1`，結束 `2b5fe09` + 本報告 commit）
- Spec：`docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-design.md`
- 計畫：`docs/superpowers/plans/2026-10-03-ui-v2-milestone-6.md`（Parts 1–4 各有一份子計畫）
- 驗證：本報告由 Task 5.1–5.4 產出（openCode 執行；Task 5.5 人工目視比對交由人類）。

## 1. 各畫面完成狀態

| 畫面 | 設計稿 | 狀態 | 備註 |
|---|---|---|---|
| A1 旅程列表 | `MainCard3-njus` | 完成 | — |
| A2 旅程總覽 | `Trip-m0lh` | 完成 | 已知偏差：頭像字母取 `creator.name` 首字；「修改」→ `/projects/{id}/settings`（D14）；無日期不顯示天數（D16）；金額維持 `TWD 1,280`（D17）。 |
| A2d 功能列 | `Trip-feature-row-demo` | 完成 | 已知偏差：F9 開啟中 chip 用 `bg-v2-sand`（設計 `#F5F1E8`，無精確 token，2-unit 偏差）。 |
| A3b 新增支出（section demo） | `AddExpense-section-demo` | 完成 | 拆帳編輯器金額前綴為字面 `$`（plan-mandated，見新問題 NP1）。 |
| A3d 新增支出（sections） | `AddExpense-ngs7-sections` | 完成 | 同上；付款人卡為單一付款人唯讀明細（D12）。 |
| A5b 結算 | `Settle-sections` | 完成 | 保留批次／匯率說明／贊助卡（D19）。 |
| A6b 全部支出 | `ExpenseList-sections` | 完成 | 頁尾一律渲染（D26：`未填寫地點` / `未附明細圖片`）；滑動刪除（D21）。 |
| A7b 成員 | `Members-sections` | 完成 | — |
| A9b 建立旅程 | `NewProject-sections-demo` | 完成 | 「更多圖示」為停用占位（D2）；幣別短名 `台幣`（D22）。 |
| A13 專案設定 | `ProjectSettings` | 完成 | 封面抽屜為自行補上（D7）；50 字只顯示計數、不截斷不擋存（D9）。 |
| A14 通用設定 | `GeneralSettings` | 完成 | 保留 Beta 開關卡（D11）；短幣別標籤 letter-spacing `.3px` 未套用（新問題 NP10）。 |

全部 11 個畫面皆完成，無「部分完成」；以上為已記錄的已知偏差，非缺漏。

## 2. 覆蓋率前後對照（% Lines）

baseline 檔：`docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`。
after：本 Task 執行 `npx vitest run --coverage`。

| 目錄 | Baseline Lines% | After Lines% | 判定（不得低於 baseline） |
|---|---|---|---|
| `components/v2`（root） | 100 | 100 | ✅ |
| `components/v2/cover` | 95.45 | 100 | ✅ |
| `components/v2/expense-form` | 89.53 | 93.72 | ✅ |
| `components/v2/expenses` | 28.33 | 96.85 | ✅（≥ 80 門檻） |
| `components/v2/layout` | 100 | 100 | ✅ |
| `components/v2/members` | 57.5 | 100 | ✅（≥ 80 門檻） |
| `components/v2/new-project` | 84.37 | 85.71 | ✅ |
| `components/v2/project` | 83.78 | 86.88 | ✅ |
| `components/v2/project-settings` | 81.81 | 83.78 | ✅ |
| `components/v2/projects` | 86.95 | 86.95 | ✅（相等，無餘裕） |
| `components/v2/quick-expense` | 81.09 | 83.72 | ✅ |
| `components/v2/settings` | 90 | 93.10 | ✅ |
| `components/v2/settle` | 81.48 | 81.81 | ✅ |
| `components/v2/stats` | 93.87 | 93.87 | ✅（相等） |
| `components/v2/ui` | —（新增目錄） | 100 | ✅（新） |
| `lib/covers.ts` | 97.14 | 97.29 | ✅ |

**新增檔案 Lines%（門檻 ≥ 90）**

| 檔案 | Lines% | 判定 |
|---|---|---|
| `components/v2/cover/cover-tile-button.tsx` | 100 | ✅ |
| `components/v2/expense-form/location-picker-v2.tsx` | 100 | ✅ |
| `components/v2/expense-form/section-card.tsx` | 100 | ✅ |
| `components/v2/expenses/filter-panels.tsx` | 94.44 | ✅ |
| `components/v2/expenses/filter-popover.tsx` | 100 | ✅ |
| `components/v2/expenses/swipe-row.tsx` | 100 | ✅ |
| `components/v2/ui/currency-field.tsx` | 100 | ✅ |
| `components/v2/cover/cover-icons.ts` | 未量測 | ⚠️ 設定限制（見 NP3） |
| `components/v2/expenses/swipe-math.ts` | 未量測 | ⚠️ 設定限制（見 NP3） |
| `components/v2/use-dismiss.ts` | 未量測 | ⚠️ 設定限制（見 NP3） |

所有量測得到的 `components/v2/<資料夾>` 皆不低於 baseline；`expenses`（96.85）與 `members`（100）皆 ≥ 80；所有可量測的新 `.tsx` 檔皆 ≥ 90。

## 3. Spec §7 問題清單（逐條保留）與執行中新發現的問題

### Spec §7 原始問題（1–26，逐條保留）

1. 基準畫布：v20261003 還是 `design/project`？（本里程碑採 v20261003，D1）
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

### 執行中新發現的問題（NEW）

- **NP1（功能/資料）**：`components/v2/expense-form/split-editor.tsx` 使用字面 `$` 前綴，TWD 預設顯示 `$1,280` 而非 `NT$1,280`（設計 mock 為 `$`；plan-mandated）。影響多幣別辨識。
- **NP2（既有 lint error）**：基準即存在 `lib/speech.ts:113` 的 `react-hooks/set-state-in-effect` error；`lib/speech.ts` 不在允許修改清單，依 ruling 未修，final lint 仍為 1 error。
- **NP3（覆蓋率設定限制）**：`vitest.config.mts` 的 coverage `include` 為 `["lib/**/*.ts", "components/**/*.tsx", "app/api/**/*.ts"]`，因此 `components/v2/**/*.ts`（`cover-icons.ts`、`swipe-math.ts`、`use-dismiss.ts`）不被量測。修正需改 `vitest.config.mts`（非允許檔案），故保留為已知限制。
- **NP4（Review Focus 文字 vs D26）**：Master Plan Review Focus #2 字面「無地點與圖片時不出現 footer」與 D26「頁尾一律渲染」衝突；D26 勝，footer 一律以 `未填寫地點` / `未附明細圖片` 呈現。
- **NP5（lint 雜訊）**：執行 `--coverage` 後產生的 gitignored `coverage/block-navigation.js` 會讓 lint 多 1 個 warning（32 而非 baseline 31）。刪除 `coverage/` 後回復 baseline；非原始碼問題。
- **NP6（baseline 陳舊）**：`coverage-baseline.txt` 對 `components/v2/expense-form` 是新增 `section-card.tsx`、`location-picker-v2.tsx` 之前的舊值，目錄比較為 apples-to-oranges（目前仍高於舊門檻）。建議日後重生 baseline。
- **NP7（測試雜訊）**：`location-picker-v2` whitespace 測試會出現 `act()` warning；不影響通過。
- **NP8（實作取捨）**：`V2TopBar` 的 `titleClassName` 為「取代」而非「合併」預設 `text-base`；`font-bold` 呼叫端依賴繼承的 16px（plan-mandated）。
- **NP9（a11y）**：滑動列左右兩顆 reveal 按鈕共用 `aria-label="刪除"`（brief-mandated），螢幕閱讀器不易區分。
- **NP10（設計落差）**：A14 短幣別標籤的 `letter-spacing .3px` 未套用。
- **NP11（tokens）**：`trip-preview-card` 的 `rgba()` 陰影無對應 token（brief-mandated；`rgba()` 為規則允許例外）。
- **NP12（設計落差）**：A6b 篩選面板「開啟中」chip 背景使用 `bg-v2-sand`（#F1EBE0）而非設計 `#F5F1E8`（2-unit 偏差，無新 token）。
- **NP13（重複程式）**：`location-picker-v2.tsx` 複製 v1 picker 邏輯（因 `components/location-picker.tsx` 受保護，D18/Master §2），接受重複而非重構。
- **NP14（baseline 可比性）**：baseline 的 `All files` 86.67% 只涵蓋 `components/v2` 與 `lib`，不含 `app/api` 及其他 component 目錄；本次完整輸出 `All files` 為 71.91%，兩者不可直接比較。per-folder v2 比較仍有效。
- **NP15（餘裕不足）**：`components/v2/projects` 覆蓋率恰等於 baseline（86.95%），無餘裕；未來動 `projects-v2.tsx` 可能觸發門檻。
- **NP16（建置網路）**：`npm run build` 對 `fonts.gstatic.com` 出網敏感，可能 transient 失敗；本次首次即成功（`✓ Compiled successfully in 5.5s`）。
- **NP17（文件用詞）**：`gap-a5-a7.md` 的 "Never touch" 清單把 `useExpenseFilters` 軟化為「additive if required」，與 spec/plan 不一致（僅措辭，未實作）。

## 4. v1 保護驗證

指令：

```bash
git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
```

輸出（應為空，實測為空；exit code 0）：

```
```

## 5. 最終驗證摘要（Task 5.1–5.3）

- **Task 5.1 v1 保護**：v1 diff 空 ✅；所有變更路徑都在 `components/v2/**`、`tests/**`、`docs/**`、`design/**` 或恰為 `app/globals.css` / `lib/covers.ts` ✅；Review Focus 6 條 grep 全數有結果 ✅。
- **Task 5.2 測試 / lint / build**：
  - `npm run test:run`：**156 passed / 1 skipped（檔案）**、**2171 passed / 6 skipped（測試）**，0 failed。6 個 skip 皆為既有 env-gated 整合測試。
  - `npm run lint`：**1 error / 32 warnings**。唯一 error 為既有 `lib/speech.ts:113`，無新增 error（32 的其中 1 個 warning 來自生成物 `coverage/`，見 NP5）。
  - `npm run build`：**成功**（首次即通過，`✓ Compiled successfully in 5.5s`），無需 retry。
- **Task 5.3 覆蓋率**：所有 `components/v2/<資料夾>` 不低於 baseline；`expenses` ≥ 80、`members` ≥ 80；可量測新檔 ≥ 90（不可量測的 `.ts` 見 NP3）。

## 6. 判定

里程碑 6 完成。所有 11 個目標畫面已對齊 v20261003 設計稿；v1 完全未受影響；測試、lint（無新增 error）、build、覆蓋率皆達 gate。已知偏差與新問題已列於 §2–§3，供後續決策。
