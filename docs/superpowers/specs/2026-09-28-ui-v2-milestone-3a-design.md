# UI v2 里程碑 3a 設計：A3 新增／編輯支出與 splitDetail

- 日期：2026-09-28
- 狀態：已確認，待撰寫實作計畫
- 上層設計：`docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`（本文件取代其 3.1、3.2、3.4 中與支出分帳相關的規則）
- 設計來源：`design/project/AddExpense.dc.html`（A3）、`design/project/AddExpense-ngs7.dc.html`（A3c，僅參考分攤互動；多人付款不在範圍）
- 基底分支：`feat/ui-v2-m2`；本里程碑分支：`feat/ui-v2-m3a`
- 範圍：原里程碑 3 拆為 3a（本文件）與 3b（A10 拍照、A11／A12 語音，另行規劃）

## 1. 目標與決策

**目標**：v2 新增／編輯支出表單；「個人項目」與「指定金額」的明細存入資料庫，v1、v2 都能讀寫；v1 行為除「個人項目可正確還原」外不變。

| 項目 | 決策 |
|---|---|
| 里程碑範圍 | 只做 A3；拍照與語音移到 3b |
| v1 是否讀寫 splitDetail | 是。v1 存檔寫入、編輯讀回；只有 v1 無法表示的組合才唯讀 |
| 程式組織 | 分帳計算、splitDetail 轉換與驗證抽成純函式；送出流程抽成 hook；v1 保留自己的畫面狀態 |
| 付款人 | 單一付款人（多人付款另行遷移） |
| v2 內的輸入元件 | 計算機、幣別、日期、地點、圖片沿用 v1 元件，v2 樣式延到里程碑 5 |
| 資料庫變更 | 只新增選填欄位。專案沒有 migration 歷史、以 `prisma db push` 同步，因此只修改 `schema.prisma`，部署前由維護者執行 `npx prisma db push`（或等效 SQL `ALTER TABLE "expenses" ADD COLUMN "split_detail" JSONB;`）；不建立 `prisma/migrations` 檔案；開發過程中不連線任何資料庫 |

## 2. 資料、API 與相容性

### 2.1 資料庫

```prisma
model Expense {
  // ...
  splitDetail Json? @map("split_detail")
}
```

格式：

```ts
interface SplitDetail {
  version: 1
  personalItems: Record<string, { name: string; amount: number }[]> // memberId → items
  customShares: Record<string, number>                              // memberId → amount
}
```

- 只有用到個人項目或指定金額時才存；純均分存 `null`。
- 空的成員鍵不存（例如某人沒有個人項目就不出現在 `personalItems`）。
- 每人應付金額仍**只以 `ExpenseParticipant.shareAmount` 為準**；結算、統計、匯出不讀 `splitDetail`。

### 2.2 API

| API | 調整 |
|---|---|
| `POST /api/projects/[id]/expenses` | 接收選填 `splitDetail`；驗證通過才存 |
| `PUT /api/projects/[id]/expenses/[expenseId]` | 附 `splitDetail`（物件）→ 驗證後更新；附 `splitDetail: null` → 清除；**附 `participants` 但未附 `splitDetail` 欄位 → 清為 `null`**（保護仍開著舊版頁面的用戶）；兩者都未附 → 不動 |
| `GET` 單筆與列表 | 回傳 `splitDetail` |
| `POST .../expenses/batch`（語音批次） | 不變，存 `null` |

### 2.3 驗證規則（`validateSplitDetail`，前後端共用）

不通過時 API 回 400，錯誤訊息為繁體中文。

1. `version` 必須為 1。
2. 所有出現的 memberId 都必須在該筆支出的 `participants` 中。
3. 所有金額為有限數字且 ≥ 0。
4. 項目名稱為字串、去頭尾空白後 1–30 字；每人最多 20 個項目。
5. 有指定金額的成員：`shareAmount` ＝ 個人項目合計 ＋ 指定金額（誤差 ≤ 0.01）。
6. 其他成員：`shareAmount` ≥ 個人項目合計 − 0.01。
7. 既有規則不變：`shareAmount` 總和 ＝ 支出金額（誤差 ≤ 0.01）。

### 2.4 v1 相容

`getV1SplitMode(detail)`：

| splitDetail | 回傳 | v1 行為 |
|---|---|---|
| `null` | `"equal"` 或 `"custom"`（依既有分攤判斷，同現行邏輯） | 照舊 |
| 只有 `personalItems` | `"personal"` | 還原為「先扣再分」並填回項目 |
| 只有 `customShares` | `"custom"` | 還原為「指定金額」，`customShares` 的成員設為固定 |
| 兩者皆有 | `"unsupported"` | 唯讀，顯示「此支出使用新版功能建立，請切換到新版編輯」，停用儲存；刪除仍可 |

### 2.5 上線順序

1. 先對資料庫執行 `npx prisma db push`（新增可為空欄位，不影響線上舊程式：Prisma 只查詢已知欄位）。
2. 再部署程式：API、v1 讀寫、v2 表單同一次上線。

## 3. 共用邏輯

| 檔案 | 內容 |
|---|---|
| `lib/expense-split.ts` | `SplitInput` 型別、`computeShares`、`buildSplitDetail`、`splitDetailToInput`、`getV1SplitMode`、`validateSplitDetail` |
| `lib/expense-changes.ts` | 由 v1 抽出的「修改前後差異」計算（LINE 更新通知使用） |
| `lib/hooks/useSaveExpense.ts` | 上傳收據圖片、POST／PUT、依用戶偏好發 LINE 新增／更新通知 |

### 3.1 分帳公式（`computeShares`）

```ts
interface SplitInput {
  amount: number
  participantIds: string[]                                         // ordered
  personalItems: Record<string, { name: string; amount: number }[]>
  customShares: Record<string, number>
}
```

- 每人分攤 ＝ 個人項目合計 ＋（有 `customShares` 用指定金額，否則自動均分額）。
- 自動均分額 ＝ （總額 − 所有個人項目 − 所有指定金額）÷ 自動均分人數，四捨五入到小數 2 位；四捨五入的零頭加給**第一位自動均分者**。
- 沒有自動均分者（全部指定金額）時不補零頭，交由驗證回報總和不符（與 v1 現行一致）。
- v1 三種模式的對應：
  - 均分 → 無個人項目、無指定金額
  - 先扣再分 → 只有個人項目
  - 指定金額 → 只有指定金額（固定成員）
- 結果必須與 v1 現行 `calculateShares` 相同（以測試鎖定）。

## 4. v1 表單改動（`components/expense/expense-form.tsx`）

1. `calculateShares` 的三種模式改呼叫 `computeShares`，畫面不變。
2. 送出時附 `buildSplitDetail(...)`，改用 `useSaveExpense`；既有欄位檢查與 `alert` 訊息保留。
3. 編輯載入時依 `getV1SplitMode` 還原模式與個人項目；`unsupported` 顯示唯讀提示並停用儲存。
4. 「是否有修改」判斷加入 `splitDetail` 比對。

## 5. v2 表單（A3）

- 路由：`/projects/[id]/expenses/new` 與 `/projects/[id]/expenses/[expenseId]/edit`，皆以 `UiVersionSwitch` 分流；兩者共用同一個 v2 表單元件。
- 由上到下：
  1. 金額卡：大字金額、幣別選單、計算機按鈕
  2. 描述
  3. 類別 chip（8 類）
  4. 付款人：單選
  5. 分攤：「先扣個人項目」開關（開啟後可為每人加項目）；「共同分攤」選成員、可為個人指定金額、其餘自動均分；底部核對列「個人項目 $x ＋ 共同分攤 $y ＝ $總額」與「金額相符」狀態
  6. 支出日期
  7. 消費地點
  8. 收據圖片
  9. 「通知 LINE 群組」開關（僅能發送時顯示）
  10. 底部按鈕：新增為「新增支出 · {金額}」，編輯為「儲存變更」
- 編輯模式提供刪除（同 v1）。
- 版面數值以 A3 設計稿為準；v2 元件不得使用 `dark:` variant。

## 6. 測試

- `lib/expense-split.ts`：
  - 三種 v1 模式與 v1 現行 `calculateShares` 結果相同（含零頭分配）
  - 個人項目＋指定金額組合
  - 個人項目合計超過總額 → 驗證失敗
  - `buildSplitDetail` ↔ `splitDetailToInput` 往返一致
  - `getV1SplitMode` 四種情況
- API：`splitDetail` 存取；驗證失敗回 400；PUT 附 `participants` 未附 `splitDetail` → 清為 `null`；只改描述 → 不動。
- `useSaveExpense`：新增、更新、圖片上傳、LINE 通知條件。
- v1 表單：個人項目存檔後編輯可還原；`unsupported` 唯讀；既有測試全數通過。
- v2 表單：金額、類別、付款人、分攤核對、送出內容。

## 7. 任務切分

1. `splitDetail` 欄位（schema.prisma）、`lib/expense-split.ts`
2. API 支援 `splitDetail`（含驗證與舊版相容）
3. `lib/expense-changes.ts` 與 `useSaveExpense`
4. v1 表單改用共用邏輯、讀寫 `splitDetail`、唯讀保護
5. v2 表單畫面
6. v2 新增／編輯頁容器與分流
7. 整體驗證

## 8. 不在範圍

- A10 拍照、A11／A12 語音（里程碑 3b）
- 多位付款人
- 輸入元件與對話框的 v2 樣式（里程碑 5）
