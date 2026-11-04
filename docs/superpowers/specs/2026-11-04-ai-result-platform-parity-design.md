# AI 辨識結果與新增支出共用表單 — Design Spec

Date: 2026-11-04
Status: proposed

## Goal

讓 AI 快速記帳的「AI 辨識結果」畫面與正式「新增支出」表單使用同一套表單核心：同一個 draft state、同一組欄位元件、同一套驗證、同一個 payload 產生器。AI 只是資料來源的一種，不再維護第二套表單。

## Problem

目前兩邊是兩套實作：

- 新增支出：`ExpenseFormPlatformView` + `useExpenseDraft`，平台式版面（金額 → 描述必填 → 類別 → `SplitPanel` → 選填收合 → 固定 footer）。
- AI 辨識結果：`ConfirmStep` + `QuickItemCard` + `QuickItem`，另一套卡片堆疊、`PayerPicker`、`SplitEditor`、獨立日期／地點／圖片卡，以及 `useQuickSave` 自己組的 payload。

兩套 state 形狀不同（`participantIds` vs `pool`、location 扁平 vs 巢狀），付款人與分帳推導各寫一份。未來只要新增支出表單改一個欄位或 API payload，AI 流程很容易沒跟上而默默分叉。這正是本次要消除的兼容風險。

## Decision

不直接掛整頁 `ExpenseFormPlatformView`；改成「共用表單核心，各自保留外殼」。

- **共用**：`DraftState`、draft 衍生計算、actions、表單欄位、驗證、payload 產生器。
- **各自保留**：新增支出頁的單筆 topbar／footer；AI 頁的「AI 辨識結果」header、`1 / N`、左右滑動、刪除單筆、重新輸入、批次新增、批次 LINE 通知。

直接重用整頁會讓正式表單背負 AI 流程的多筆導覽與批次 footer，元件 API 會膨脹，反而更難維護。

## Non-goals

- 不改 AI prompt、`ExpenseItemResult` 的語意或解析 API。
- 不改支出 API 的 payload 欄位與資料模型。
- 不改分帳數學（`lib/split-draft`、`lib/expense-split`、`lib/expense-payers`）。
- 不改結算、匯率來源、圖片上傳流程。
- 不把 demo 的 ledger variant 放進正式產品。

## Architecture

### 1. Draft core：`lib/expense-draft.ts`

把 `components/v2/expense-form/use-expense-draft.ts` 內的表單狀態與衍生計算抽成純模組：

- `DraftState` — 目前 `useExpenseDraft` 的 `state`（amount、currency、rate、description、category、payerIds、pinnedPayerAmounts、expenseDate、location、image、notifyLine、pool、personalMode、personalItems、personalMembers、customShares）。
- `DraftActions` — 目前 actions 的完整介面。
- `Draft` — `{ state, actions, derived }`。
- `DraftDerived` — `deriveExpenseDraft` 的回傳（split、payers、rate、error 等）。
- `initialState(init: DraftInit): DraftState`
- `createDraftActions(setState, members: DraftMember[]): DraftActions`
- `deriveExpenseDraft({ state, members, projectCurrency, participantOrder, previewRateInfo }): DraftDerived`

`useExpenseDraft` 變成薄 hook：`useState(initialState(init))` + `createDraftActions` + `deriveExpenseDraft`。既有介面與行為不變。

`createDraftActions` 以「functional updater」更新 state，讓外部 state（AI 多筆清單）也能安全套用連續操作。

### 2. 共用欄位：`components/v2/expense-form/expense-form-fields.tsx`

從 `ExpenseFormPlatformView` 抽出 body：

`AmountCard`（含 rate sheet、金額防呆）→ 描述（必填）→ `CategoryPicker` → `SplitPanel` → 選填收合（日期／地點／收據）→ LINE 通知。

Props 以 `Draft`、`members`、匯率 context 為主；`showNotifyLine` 控制是否顯示 LINE checkbox（AI 批次流程由 footer 統一控制）。

`ExpenseFormPlatformView` 只留 topbar、footer、footer 高度量測與單筆 submit。畫面與行為維持不變。

### 3. AI state 改成 `DraftState`

`lib/quick-expense/draft.ts`：

```ts
export type QuickItem = DraftState & { id: string }
```

- `parsedToQuickItems(results, ctx): QuickItem[]` — 將 `ExpenseItemResult[]` 映射成 `QuickItem[]`。
- `receiptToQuickItem(result, ctx): QuickItem` — 收據結果映射。
- `itemTotals`、`validateItems` 改用它。`validateItems` 逐筆套用 `deriveExpenseDraft` 與共用 guardrails，訊息只額外加「第 N 筆」。
- 不再保留 `participantIds`、扁平 location、`itemDerivedPayers` 等重複欄位。

`QuickItemCard` 改成 `QuickItemEditor`：用 `createDraftActions` + `deriveExpenseDraft` 為單筆組出 `Draft`，再渲染 `ExpenseFormFields`。多筆切換、刪除、滑動仍由 `ConfirmStep` 負責。

### 4. 共用 payload：`lib/expense-payload.ts`

- `ExpensePayload` 型別搬到這裡。
- `buildExpensePayload(draft: Draft): ExpensePayload` 產生目前 `expense-form-v2.tsx` 的 payload。
- `expense-form-v2.tsx` 與 `lib/quick-expense/use-quick-save.ts` 都改用這個函式；圖片仍由各自的儲存流程上傳後附加。

### 5. 共用驗證

在 `split-guardrails.ts` 增加：

- `amountIssueFor(amount: string, currency: string): string | null`
- `expenseFormIssues(draft: Draft, members: DraftMember[]): { amountIssue, splitIssue, blockingError, descMissing }`

正式表單 footer 與 AI footer 都使用同一組判斷；分帳問題仍只顯示在 `SplitPanel` 內，footer 不重複。

## Data flow

```
AI text/receipt
  → parsedToQuickItems() / receiptToQuickItem()
  → QuickItem[] = (DraftState & { id })[]
  → ConfirmStep（1/N 外殼）
  → QuickItemEditor: createDraftActions + deriveExpenseDraft
  → ExpenseFormFields（與新增支出相同的欄位）
  → buildExpensePayload()
  → useQuickSave()
```

```
手動新增
  → useExpenseDraft()（內部使用同一組 core）
  → ExpenseFormPlatformView: topbar + ExpenseFormFields + footer
  → buildExpensePayload()
  → useSaveExpense()
```

## Behavior changes（AI 流程）

- 描述改為**必填**，與新增支出相同；blank 時 footer submit disabled 並顯示同一則提示。
- 金額改用 `sanitizeAmountInput` / `normalizeAmountForCurrency` / `maxAmountFor` 防呆。
- 分帳改用平台式 `SplitPanel`：付款人與分攤人列、明細 sheet、個人項目、固定金額規則與新增支出完全一致。
- 日期／地點／收據改成**收合選填區**。
- 外幣改用 `RateSheet`，顯示市場／自訂匯率來源。
- 以下 AI 專屬行為保留：`AI 辨識結果` 標題、`1 / N`、左右滑動、刪除單筆、重新輸入、批次新增、批次 LINE 通知、收據圖片自動帶入。

## Validation and error handling

- 描述必填：`請填寫描述，讓大家知道這筆是什麼`。
- 金額：空白、非數字、<= 0、超過幣別上限的訊息與新增支出一致。
- 付款：未選付款人、付款金額超過或不等於支出金額。
- 分攤：未選分攤人、個人項目未填名稱、個人項目超過總額、分攤金額不符。
- 批次儲存：逐筆儲存，失敗即停；保留未儲存項目重試，不重複建立已成功的項目。
- 多筆導覽：驗證失敗時跳到第一個有問題的項目，沿用現有 `validateItems` 行為。

## Testing

- 新增 `tests/lib/expense-draft.test.ts`：`initialState`、`deriveExpenseDraft`、actions（含連續 functional update）。
- 新增 `tests/lib/expense-payload.test.ts`：payload 與目前表單送出的欄位一致。
- 新增 `tests/lib/quick-expense/draft.test.ts`：AI 結果映射、驗證訊息、多幣別 totals。
- 改寫 `tests/components/v2/quick-expense/quick-item-card.test.tsx`：改為共用欄位後仍涵蓋金額、描述、類別、付款、分攤、日期、地點、圖片、匯率。
- 更新 `tests/components/v2/quick-expense/confirm-step.test.tsx`、`quick-expense-v2.test.tsx`、`tests/demo/quick-expense-page.test.tsx`。
- 既有 `tests/components/v2/expense-form-v2-view.test.tsx` 必須維持通過（證明重構未改正式表單行為）。
- 驗證指令：`npm run test:run`、`npx tsc --noEmit`、相關 ESLint。
- 手動：一句話多筆、收據、外幣、個人項目、固定金額、刪除一筆、批次新增、LINE 通知、手機返回鍵。

## Risks

- `confirm-step.test.tsx` 與 `quick-item-card.test.tsx` 大量綁定舊 DOM；先補行為測試再改選擇器。
- `QuickItem` 形狀變更是 breaking change，`app/demo/quick-expense/page.tsx`、fixtures、`useQuickSave` 都要同步。
- `SplitPanel` 依賴 `Draft`；必須先完成 draft core 抽取，AI 流程才能共用。
- `notifyLine` 同時存在於 `DraftState` 與 AI 批次 state；AI 的 `ExpenseFormFields` 必須關閉內建 checkbox，避免兩個開關。
- 描述改必填是產品行為變更，已在討論中確認。

## Rollout

分階段 commit，每個階段可獨立測試與回滾：

1. Draft core 抽取（行為不變）。
2. `ExpenseFormFields` 抽取（畫面不變）。
3. 共用驗證 helper。
4. AI state 遷移。
5. AI 畫面接上共用欄位。
6. 共用 payload 與儲存。
7. 清理與全量驗證。

不使用 feature flag；出問題可 revert 單一階段。
