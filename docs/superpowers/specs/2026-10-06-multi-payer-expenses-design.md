# 多人付款（Multi-payer）— 設計（spec）

- 日期：2026-10-06
- 狀態：執行中（做法 C）
- 目標：讓**一筆支出可以由多位成員共同出資**（各自指定金額，合計等於支出總額），並讓記帳、結算、統計、匯出、AI 快速記帳全部正確支援。
- 範圍：v2 與 v1 都要能新增／編輯多人付款（功能對等）；不改動既有多人分攤（`ExpenseParticipant`）語意。
- 架構決策：**做法 C** — `ExpensePayer` 關聯表為**唯一真實來源**，**移除** `expenses.paid_by_member_id` 與其 `payer` 關聯。
- 設計來源：`design/project-v20261004/AddExpense-ngs7-sections.dc.html`（付款人卡片 L109–179）、`claude-design-sync-prompts*.md`、`SettleCalcDialog-after.dc.html`。

## 1. 問題

現況「付款人」是 `expenses.paid_by_member_id` **單一欄位**：

- 一筆支出只能有一個付款人；無法表達「$60 由小雨出 $30、志明出 $30」。
- 結算 `app/api/projects/[id]/settle/route.ts` 把整筆金額加到單一 payer 的 `balance`／`totalPaid`。
- 「多人分攤」已是關聯表 `expense_participants`；付款人卻沒有對稱的表——這是唯一缺口。

## 2. 名詞定義

| 名詞 | 定義 |
|---|---|
| 付款人（payer） | 這筆支出實際出錢的成員，可多人，各有金額。存於 `ExpensePayer`。 |
| 主要付款人（primary payer） | 金額最大者；平手取付款清單中較前者（依成員順序）。**純計算值，不儲存**，供顯示／活動紀錄使用。 |
| 分攤者（participant） | 這筆支出要分帳的成員；與付款人**互相獨立**（可幫別人代墊）。 |
| 金額相符 | 付款金額合計 = 支出總額（容差 0.01）。 |

## 3. 決策摘要

| 項目 | 決策 | 理由 |
|---|---|---|
| 資料模型 | **做法 C**：新增 `ExpensePayer` 關聯表為唯一真實來源；**移除 `paid_by_member_id`** | 與 `ExpenseParticipant` 對稱；單一真實來源、無反正規化漂移；讓 v1/v2 共用同一份付款人清單 |
| 付款金額預設 | **均分為預設**，可手動調整；手動調整者視為「pin（鎖定）」 | 符合設計稿與低摩擦輸入 |
| pin 語意 | pin 住的金額在新增／移除付款人或改總額時維持不變；未 pin 者自動分配剩餘金額 | 對齊分攤編輯器既有 pin 行為 |
| 合計驗證 | 儲存時付款金額合計**必須等於**支出總額 | 設計稿「金額相符 ✓」 |
| 付款人 vs 分攤者 | **保持獨立**，不自動加入 | 支援代墊情境；與現行模型一致 |
| v1 | **與 v2 功能對等**支援多人付款（共用同一套推算邏輯） | 使用者要求 |
| 主要付款人 | 由付款人清單推導（金額最大、平手取清單較前者），不儲存、不使用者設定 | 單一真實來源 |
| 多幣別 | 付款金額一律以該筆支出的幣別為單位 | 與現行結算換算邏輯一致 |
| AI 快速記帳 | 解析「我付 800、小明 480」為多位付款人 | 設計稿範例 chips 已含此情境 |

## 4. 資料模型變更

`prisma/schema.prisma` **新增**：

```prisma
// 費用付款人（一筆費用可多人共同出資）
model ExpensePayer {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  expenseId String  @map("expense_id") @db.Uuid
  memberId  String  @map("member_id") @db.Uuid
  amount    Decimal @db.Decimal(10, 2)

  expense Expense       @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  member  ProjectMember @relation("ExpensePayerMember", fields: [memberId], references: [id], onDelete: Cascade)

  @@index([expenseId])
  @@index([memberId])
  @@unique([expenseId, memberId])
  @@map("expense_payers")
}
```

關聯：`Expense.payers ExpensePayer[]`、`ProjectMember.paidPayers ExpensePayer[] @relation("ExpensePayerMember")`。

**移除**（Phase 7 最終階段）：`Expense.paidByMemberId`、`Expense.payer` 關聯、`ProjectMember.paidExpenses` 關聯、相關索引 `@@index([paidByMemberId])`。

付款人順序依成員順序決定（與分攤者一致），**不另存排序欄位**（比照 `ExpenseParticipant`）。

### 4.1 既有資料補齊（backfill）

`ExpensePayer` 為新表，採 schema-first（`prisma db push`）：

1. `prisma db push` 建立 `expense_payers` 表。
2. `scripts/backfill-expense-payers.mjs`：為每筆無付款列的支出插入 `{ expenseId, memberId: paidByMemberId, amount }`，**idempotent**。
3. `package.json`：`db:backfill-expense-payers`（`.env`）、`:dev`（`.env.dev`）、`:main`（`.env.main`）。

> 已於 dev 執行：97 筆支出 → 97 列，金額合計零誤差。

### 4.2 不變式（invariant）

- 每筆支出至少一個 `ExpensePayer` 列。
- 同一支出的付款人金額合計 = `expense.amount`（容差 0.01）。

## 5. 共用邏輯（純函式）

新增 `lib/expense-payers.ts`（前端與後端共用，無副作用）：

```ts
export interface PayerShare { memberId: string; amount: number }
export interface PayerInput { memberId: string; amount: number | string }

// 依支出金額、已選付款人與「已 pin（自訂）」金額推算每人金額
// - auto = 總額 - pin 合計，均分給未 pin 者；餘數給第一個未 pin 者
// - pin 合計 > 總額 → ok:false
export function derivePayerShares(input: {
  amount: number
  payerIds: string[]
  pinned: Record<string, number>
}): { shares: PayerShare[]; pinnedTotal: number; autoIds: string[]; ok: boolean }

// 驗證伺服器送來的 payers（成員、去重、非負、合計 = 金額）
export function validatePayers(
  payers: unknown,
  amount: number,
  memberIds: Set<string>
): { ok: true; payers: PayerShare[] } | { ok: false; error: string }

// 主要付款人：金額最大，平手取陣列較前者（依成員順序）
export function primaryPayerId(payers: PayerShare[]): string
```

錯誤訊息（前後端共用）：

- 無付款人：`請選擇付款成員`
- pin 合計超過總額：`付款金額合計超過支出金額`
- 合計不符：`付款金額與支出金額不符`
- 伺服器驗證：`至少需要一位付款人`、`付款人必須是專案成員`、`付款人不可重複`、`付款金額合計必須等於費用總額`

> 結算換算採**各付款人原始金額**逐一換算，而非比例分攤，確保與輸入一致、無殘差。

## 6. 寫入 API 契約

`app/api/projects/[id]/expenses/route.ts`（POST）與 `.../expenses/[expenseId]/route.ts`（PUT）**以 `payers` 取代 `paidByMemberId`**：

```jsonc
{
  // ...既有欄位
  "payers": [ { "memberId": "uuid", "amount": 300 }, { "memberId": "uuid", "amount": 980 } ]
}
```

- 驗證：陣列、長度 ≥ 1、`memberId` 皆為專案成員、不重複、`amount` 有限且 ≥ 0、合計 = `amount`（±0.01）。失敗回 400 與對應訊息。
- 交易內：刪除舊付款列 → 依陣列順序建立新列（`sortOrder` = index）。

### 6.1 回應

- 移除 `payer`（單一）。
- `payers: [{ memberId, amount, member: { id, displayName, userId, user } }]`（與 `participants` 同形狀）。
- GET（列表／單筆）皆 include `payers`。

## 7. 讀取與結算

### 7.1 結算 `app/api/projects/[id]/settle/route.ts`

- `expenses` 查詢 include `payers`（含 member）。
- 逐筆：對每個付款人以其 `amount * rate` 加到該成員 `balance` 與 `totalPaid`。
- `expenseDetails`：移除 `payer`，改為 `payers: [{ memberId, displayName, userImage, amount, convertedAmount }]`。
- `summary` 不變（因付款合計 = 支出金額）。

### 7.2 統計 `lib/project-stats.ts`

- `StatsInput.expenses[i].payers: { memberId: string; amount: number }[]`；`paid` 累加 `convert(payer.amount, currency)`。

### 7.3 匯出 `lib/export/*`、`components/v1/export/export-v1.tsx`

- 支出列「付款人」為以「、」串接的名稱（例：「小雨、志明」）。
- v1 匯出逐付款人累計付款金額。

### 7.4 其他伺服器讀取

- `app/api/projects/[id]/route.ts`（總覽）include payers。
- `.../members/route.ts` 刪除成員守門：改查 `ExpensePayer`。
- `.../expenses/batch/route.ts` 刪除 metadata `payerName`：串接名稱。

## 8. 前端：共用付款推算

`use-expense-draft.ts`（v2）與 v1 表單共用 `lib/expense-payers.ts`：

- 狀態：`payerIds: string[]`（含順序）、`pinnedPayerAmounts: Record<string, string>`（自訂／pin；不存在 = 自動）。
- actions：`togglePayer(id)`、`setPayersAll(selectAll)`、`setPayerAmount(id, value)`（設值即 pin；清空即取消 pin）。
- 衍生：`derived.payers`、`derived.payerTotal`、`derived.payerMatches`、`derived.primaryPayerId`、`derived.error`。
- 驗證順序：有效金額 → 至少一位付款人 → 至少一位分攤者 → 個人項目名稱／上限 → **付款合計**與分攤合計。
- 新增支出預設 `payerIds = [init.paidBy]`（目前使用者）。
- 編輯：`payerIds` 依成員順序；以「存檔金額 vs 均分金額」比對決定是否 seed `pinnedPayerAmounts`，確保再存檔不漂移。

## 9. UI：v2 支出表單（`AddExpense` / `EditExpense`）

改寫 `components/v2/expense-form/payer-picker.tsx`：

- 標題「付款成員」＋子標題列「付款明細」＋右側「全選／取消全選」。
- 付款人 pills **多選**（設計稿 L118–135）。
- 每位已選付款人一列（L137–167）：頭像＋姓名（可 truncate）＋可編輯金額框（`$` 前綴）＋ pin 鈕＋移除鈕。
- 摘要（L169–178）：「已選 N 人」＋「金額相符 ✓」（不符時不顯示勾勾並以錯誤樣式提示）＋「$a + $b = $S / $A」。
- 無障礙：`付款成員` group、每人金額 `aria-label="<名字>的付款金額"`。

`expense-form-v2-view.tsx`、`expense-form-v2.tsx`、`lib/hooks/useSaveExpense.ts`：payload 送 `payers`；LINE 通知的 `payerName` 用主要付款人。

## 10. UI：v1 支出表單

`components/expense/expense-form.tsx`（v1）與 v2 **功能對等**：付款人多選、逐人金額與 pin、共用驗證；payload 送 `payers`；沿用 v1 shadcn 風格。

## 11. UI：AI 快速記帳

- `lib/ai/expense-parser.ts`：
  - `ExpenseItemSchema.payerName: string` → `payers: z.array(z.object({ name: z.string(), amount: z.number().optional() }))`。
  - Prompt：「我付 800、小明 480」→ 兩位付款人 800／480；只說「我付」→ 單一付款人全額；多人但無金額 → 均分；未提及 → 目前使用者全額。
  - `ExpenseItemResult` 以 `payers: { memberId, amount }[]` 取代 `payerId`。
- `lib/quick-expense/parse.ts`（`receiptToItem`）、`draft.ts`、`use-quick-save.ts`：改用共用付款狀態並送出 `payers`；收據辨識維持單一付款人（目前使用者、全額）。
- `components/v2/quick-expense/quick-item-card.tsx`、`quick-expense-v2.tsx`：改用 Phase 4 的 `PayerPicker`。

## 12. UI：其他顯示面

- 支出卡片／近期支出（`components/v2/expenses/expense-card.tsx`、`components/v2/project/recent-expenses.tsx`）：單一付款人「我付款／XX付款」；多人「{第一位}等 N 人付款」。
- 篩選（`lib/hooks/useExpenseFilters.ts`）：`uniquePayers` 由 payers 產生；命中條件為「就任一位付款人符合」。
- 結算頁／計算過程（`components/settle/settlement-calc-dialog.tsx`、`lib/hooks/useSettlement.ts`）：顯示多位付款人（頭像＋名稱＋金額）。
- 地圖／照片牆／v1 統計與匯出皆以付款人清單顯示，不得假設單一。
- 活動紀錄（`lib/activity-log*`、`components/v2/activity-logs/format.ts`）：`payerName` metadata 存串接名稱。

## 13. 邊界情況

- 支出金額為 0 或未填：付款人金額皆 0，允許單一付款人。
- pin 合計 > 總額：即時錯誤、不可儲存。
- 移除付款人：連帶移除其 pin；未 pin 者重算。
- 新增付款人：未 pin 者重算；已 pin 者不動。
- 多幣別：付款金額與支出同幣別；換算於結算端。

## 14. 分階段執行（每階段可獨立部署、可回退）

**Phase 1 — 資料層基礎（完成）**
- `ExpensePayer` model + 關聯；`db push`；backfill 腳本 + 補齊（dev：97/97）。
- 驗收：每筆支出有 ≥1 付款列、金額合計零誤差。

**Phase 2 — 伺服器讀取路徑與結算（C：以 payers 為源）**
- 新增 `lib/expense-payers.ts`；結算、統計、匯出、列表／單筆 GET、總覽、members 守門、batch metadata 改讀 payers。
- 過渡期：POST/PUT 仍接受單一付款人輸入，但改寫成單列 `ExpensePayer`（維持資料一致），回應同時提供 `payers`。
- 驗收：server 測試全綠；結算數字正確。

**Phase 3 — 寫入 API（多付款人）**
- POST/PUT 接受 `payers[]`；`validatePayers`；交易內重建付款列。
- 驗收：API 測試（多人、驗證錯誤）。

**Phase 4 — v2 表單 UI**
- `use-expense-draft`（payerIds + pinned）、`payer-picker`（多選／pin／全選／摘要）、payload 送 `payers`。
- 驗收：payer 推算單元、payer-picker、表單測試。**首個使用者可見變化。**

**Phase 5 — AI 快速記帳**
- parser schema／prompt／resolution；quick-expense draft／save／元件。
- 驗收：parser、draft、quick-save、元件測試。

**Phase 6 — v1 表單與全部顯示面（功能對等）**
- v1 支出表單多人付款；v1/v2 列表、篩選、結算、地圖、照片、匯出、活動紀錄。
- 驗收：v1/v2 對應測試；v1 手動 smoke（新增／編輯／結算／匯出）。

**Phase 7 — C 收斂：移除 `paid_by_member_id`**
- schema 移除欄位與 `payer`／`paidExpenses` 關聯；API 移除 `payer`；清除所有殘餘引用與測試。
- `db push`（dev）。
- 驗收：全域 grep 無 `paidByMemberId`／`.payer`（expense 語意）；全套測試綠。

**Phase 8 — 收尾**
- `docs/DATABASE.md`、`docs/API.md` 更新；`npm run lint`、`npm run test:run`、`npm run test:coverage`；逐階段 commit。

## 15. 測試策略

- 單元：`lib/expense-payers.ts`（均分、pin、餘數、合計、主要付款人）、`lib/ai/expense-parser`（多付款人）。
- API：expenses POST/PUT（多人、驗證）、settle（多人換算）、stats、batch、members 守門。
- 元件：v2 `payer-picker`、v2 表單、v1 表單、quick-item-card、expense-card。
- 既有測試：凡以 `paidByMemberId`／`payer` 為輸入者逐一套用為 `payers`。
- 指令：`npm run lint`、`npm run test:run`；關鍵階段 `npm run test:coverage`。

## 16. 部署順序（dev 與 main 各一次）

1. Phase 1：`db push` → backfill → 確認 0 筆缺列。
2. Phase 2 → 3 部署（讀寫以 payers 為源）。
3. Phase 4（v2）→ Phase 5（AI）→ Phase 6（v1 與顯示面）。
4. Phase 7：移除欄位（先確認應用已無 `paidByMemberId` 引用）。
5. 抽驗：新增多人支出 → 結算金流正確 → 統計／匯出正確 → v1 與 v2 皆可編輯 → AI「我付 800、小明 480」正確。

## 17. 不在本次範圍（未來工作）

- 部分付款／應收應付（有人只先付一部分，其餘記為欠款）。
- 每筆支出不同付款幣別（payer 層多幣別）。
- 退款／沖銷、付款歷史。
- 付款人順序拖曳。

## 18. 驗收條件

- 一筆支出可設定多位付款人、各自金額，合計必須等於支出總額，否則不可儲存。
- 新增／編輯（v1 與 v2）、AI 快速記帳皆可產生多人付款支出。
- 結算 `balances`／`settlements`／`expenseDetails` 對多人付款正確；統計與匯出正確。
- `Expense.paidByMemberId` 與 `payer` 關聯已完全移除，全域無殘餘引用。
- `npm run test:run` 全綠；`npm run lint` 無錯誤。
