# 新增／編輯支出移植平台式版面 — Design Spec

Date: 2026-11-04
Status: proposed

## Goal

把 `/demo/expense-prototype` 已定案、可操作的「平台式」新增支出版面移植到正式產品，套用到真實的新增支出與編輯支出頁。正式頁面與 demo 共用同一套元件，之後只維護一份。

## Non-goals

- 不把 demo 的「改後」ledger（置中表格）版面放進正式產品。
- 不改資料模型、API payload、結算邏輯或既有 `useExpenseDraft` 介面。
- 不改快速記帳（quick expense）流程。
- 不重新設計金額卡、類別、匯率 sheet、付款人選擇器；沿用現有 prod 元件。

## Current state

- 正式表單：`components/v2/expense-form/expense-form-v2-view.tsx`，使用 `PayerPicker` + `SplitEditor`，日期／地點／收據是三張獨立卡片，描述選填。
- 正式 wrapper：`components/v2/expense-form/expense-form-v2.tsx`，負責載入、儲存、圖片上傳、LINE 通知、刪除確認。`ExpenseFormV2View` 只用於這裡（以及 demo、測試）。
- Demo：`app/demo/expense-prototype/expense-form-after-view.tsx` 以同一份 `useExpenseDraft` 實作平台式與 ledger 兩種 variant，並含 `split-panel`、`split-detail-sheet`、`split-detail/*`、`guardrails`、`personal-item-state`、`amount-sheet`、`personal-items-sheet`。
- 平台式已包含：描述必填、金額防呆、個人項目未完成阻擋儲存、fixed 金額不吸收零頭、detail sheet focus trap、footer 錯誤不重複、footer 高度量測。

## Approaches considered

1. **Single source of truth（採用）** — 把 demo 元件搬進 `components/v2/expense-form/`，`ExpenseFormV2View` 改成平台式；舊版表單凍結在 demo 給「改前」。
2. Parallel view — 保留舊 `ExpenseFormV2View`，新增 `ExpenseFormV2PlatformView`，real wrapper 切過去。可回滾，但 prod 會有兩套可用表單。
3. Copy demo files into prod — 最快，但會與 demo 分叉。

採用 1，理由是正式頁與 demo 共用同一份實作，測試與修正只需一處。

## Architecture

### Shared components（搬到 `components/v2/expense-form/`）

- `split-panel.tsx` — 誰付這筆／誰一起分；保留 `variant: "ledger" | "platform"`，正式頁固定 `platform`。
- `split-detail-sheet.tsx` — 平台式成員明細 sheet。
- `split-detail/personal-items-editor.tsx`
- `split-detail/share-amount-editor.tsx`
- `split-detail/sheet-section-row.tsx`
- `split-guardrails.ts` — 由 demo `guardrails.ts` 改名，避免與其他 guardrail 混淆。
- `personal-item-state.ts`
- `amount-sheet.tsx`、`personal-items-sheet.tsx` — 只供 ledger demo 使用，但跟著 split panel 搬移以維持單一來源。
- `expense-form-platform-view.tsx` — 由 demo `expense-form-after-view.tsx` 搬移並補上正式產品行為；保留 `variant` prop 供 demo 使用。

### 正式表單

`expense-form-v2-view.tsx` 改成薄 wrapper，轉呼叫 `ExpenseFormPlatformView` 並固定 `variant="platform"`。保留現有 props 介面，`expense-form-v2.tsx` 不需改動。

正式頁需補回 demo 目前沒有的行為：

- `canNotifyLine` 的「通知 LINE 群組」checkbox（位置在選填區塊之後、footer 之前）。
- 圖片更換／移除時 `URL.revokeObjectURL` 舊 preview。
- 編輯模式的刪除按鈕（沿用正式頁 `Trash2` 圖示）。
- 既有 `previewRateInfo`、`rateContext`、`recentRates`、`RateSheet` 流程不變。
- Submit payload、`primaryPayerId`、通知內容、圖片上傳流程不變。

### Demo

- `改前`：使用凍結的舊版表單快照（放在 `app/demo/expense-prototype/expense-form-legacy-view.tsx`），避免正式頁換版後失去比較基準。
- `改後`：共用 `ExpenseFormPlatformView`，`variant="ledger"`。
- `平台式`：共用 `ExpenseFormPlatformView`，`variant="platform"`。
- 刪除 demo 內已被搬走的重複檔案。

## Data flow

不變：

1. `expense-form-v2.tsx` 建立 `useExpenseDraft`。
2. `ExpenseFormV2View` 只讀 `state` / `actions` / `derived`，不新增本地分帳狀態（sheet 開關、footer 高度、可選區塊展開狀態除外）。
3. Submit 仍由 wrapper 的 `handleSubmit` 產生 payload；view 只負責在 `error` 或描述空白時阻擋。

## Validation and error handling

平台式既定規則全部進正式頁：

- 描述必填：空白時顯示「請填寫描述，讓大家知道這筆是什麼」，footer submit disabled。
- 金額防呆：`sanitizeAmountInput`、`normalizeAmountForCurrency`、`maxAmountFor`、`amountLimitNote`。
- 分帳問題：`describeSplitIssue` 顯示在分帳卡片內；footer 只顯示 `amountIssue` 與 `submitError`，不重複分帳錯誤。
- Footer 高度以 `ResizeObserver` 量測，內容不會被固定 footer 蓋住。
- 個人項目空白列視為 placeholder；touched 但未完成才擋。
- 固定金額不吸收零頭（已於 `d7614ef` 完成，本次不改）。

## Testing

- 搬移既有 demo 元件測試到 `tests/components/v2/`，更新 import：
  - `split-detail-sheet.test.tsx`
  - `personal-items-editor.test.tsx`
  - `share-amount-editor.test.tsx`
  - `split-guardrails.test.ts`
  - `personal-item-state.test.ts`
  - `personal-items-sheet.test.tsx`
- 改寫 `tests/components/v2/expense-form-v2-view.test.tsx`，覆蓋新 UI：
  - 金額、類別、付款人列、分攤列、平台式 detail sheet。
  - 描述必填與 submit disabled。
  - 金額防呆與錯誤訊息。
  - 個人項目、固定金額、零頭規則。
  - 換幣預覽、rate sheet、市場/custom rate。
  - LINE 通知 checkbox（create/edit 文案）。
  - edit 刪除按鈕、submitting 狀態、server error。
  - submit payload 與 `splitDetail` 正確。
- 刪除只針對舊 UI 的測試（個人項目開關、ledger 表格、pin 按鈕），以平台式等價測試取代。
- 驗證指令：完整 `npm run test:run`、`npx tsc --noEmit`、ESLint、`impeccable detect`。
- 手動：demo 的「平台式」與正式新增／編輯頁各跑一次建立、編輯、幣別切換、個人項目、收據。

## Risks

- `expense-form-v2-view.test.tsx` 有 67 個與舊 DOM 綁定的測試，改寫是本任務最大成本；需保留行為覆蓋而不是逐條硬改。
- 描述由選填改必填是產品行為變更，已由使用者確認。
- 搬移檔案會產生大量 import 變更；用 TypeScript 與完整測試確認沒有漏改。
- Demo 的 ledger variant 仍依賴 `PersonalItemsSheet` / `AmountSheet`，搬移時不可刪。
- 舊版表單快照只供 demo；不得被正式頁 import。

## Rollout

單一 commit（或少量 commit）直接切換，不用 feature flag。若上線後要回滾，revert 該 commit 即可；舊版程式仍存在於 git 歷史與 demo 快照。
