# UI v2 測試品質提升 — 設計（spec）

- 日期：2026-10-04
- 狀態：待執行
- 目標：把 `tests/components/v2/**` 的品質從「覆蓋率導向」提升為「**行為導向、可決定、隔離良好**」，同時維持每個 `components/v2/**` 資料夾 Lines ≥ 90%。
- 依據：兩份獨立測試品質審查（評分 C 與 B）的發現。

## 1. 主要問題（審查結論）

**Critical**
1. Locale/日期相依測試：`tests/components/v2/new-project-v2.test.tsx:120-139` 用 `data-day`（隨系統 locale 變）與日曆格子索引；實測在 `LANG=C` / `en_US.UTF-8` **FAIL**（`zh_TW` 才過）。
2. class 字串斷言冒充行為測試（`category-picker`、`amount-card`、`expense-form-v2-view`、`filter-panels`、`settle-v2`、`stats-v2`、`settle-dialogs` 等）：產品邏輯壞掉仍可能過，設計 class 一改就掛 → 回歸訊號極低。
3. 過度 mock 掩蓋整合：`expenses-v2.test.tsx:18-37,278-347` 把 `ConfirmDeleteDialog`/`Dialog*`/`NotifyLineCheckbox` 全 stub，只斷言 stub 出現，容器真正職責未被驗證。

**Important**
4. 全域 mock 洩漏未還原：`quick-expense-v2`（`URL.createObjectURL`）、`settle-dialogs`（`navigator.clipboard`）、`location-picker-v2`（`fetch`/`GeolocationPositionError`）、`swipe-row`（`PointerEvent`）；`quick-input-step` module-level `emit` 有順序相依。
5. 無斷言／自我測試：`project-settings-v2.test.tsx:322-334`（post-unmount 無斷言）、`section-card.test.tsx`（常數測自己）、`m4-pages.test.tsx`（把受測元件與兩分支都 mock）。
6. 真 timer 測 debounce：`location-picker-v2.test.tsx` sleep 700ms。
7. 重複：`ResizeObserver` 可建構 stub 複製 4 份（`tests/setup.ts:28-33` 本身不可 `new`）；`project-settings-v2` routing mock 複製 9 份。
8. 脆弱查詢：`.lucide-*`、`closest("div.rounded-2xl")`、`selector:"span.font-medium"`。
9. 弱斷言：`toHaveBeenCalled()` 無參數、`not.toHaveBeenCalledWith` 意圖錯誤、prop echo、`settle-dialogs` 用 `readFileSync` 檢查原始碼（應為 lint）。

## 2. 原則

1. **行為優先**：斷言使用者可觀察的行為（DOM/ARIA、callback 參數、可見文字），而非 Tailwind class 或內部結構。
2. **可及性查詢優先**：用 role/label/`aria-*`；必要時才用穩定的 `data-testid`（放在容器上）。
3. **不衝數字**：移除只為覆蓋率、無實質斷言的測試；但替換後仍**必須維持每個 v2 資料夾 Lines ≥ 90%**。
4. **可決定性**：固定日期/locale（mock calendar 或 fake timers）；不使用真實 sleep。
5. **隔離**：所有全域/prototype stub 都要還原；module-level 可變狀態要 reset。
6. **DRY**：共用 fixture/helper（members、leaf-picker mocks、`mockRoutes`、可建構 `ResizeObserver`）。
7. **允許極小的產品程式碼調整**（僅為提升可測性且不改變行為，例如在裝飾 icon 加穩定的 `aria-label`/`data-testid`），需在 commit/報告說明。嚴格禁止改 v1/shared。

## 3. 範圍

- 只動 `tests/components/v2/**`、`tests/setup.ts`；必要時極小的 `components/v2/**`（見原則 7）。
- 不動 `components/v1/**`、`components/ui/**`、`app/api/**`、`prisma/**`、`lib/**`。

## 4. 驗收

- `npm run test:coverage`：每個 `components/v2/**` 資料夾 Lines ≥ 90%（維持）。
- `npm run test:run` 全綠（exit 0）。
- `LANG=en_US.UTF-8 npx vitest run tests/components/v2/new-project-v2.test.tsx` 需綠（修好 locale 相依）。
- v1/shared 保護 diff（相對 36633e1）不含本任務新增的路徑。
- 每個被改的測試檔都要比原版**更強或等強**（行為斷言增加、脆弱度下降）。
