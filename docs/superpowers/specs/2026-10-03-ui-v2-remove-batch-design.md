# UI v2 後續調整 spec（移除批次 + 分攤明細隱藏零小計 + 旅程總覽 icon 跟隨封面 + 結算移除各人收支）

- 日期：2026-10-03
- 狀態：待使用者審閱，之後交給 opencode 執行
- 目標：
  1. **安全地**從 v2 移除「批次」功能，讓 v2 對齊 `design/project-v20261003/` 設計稿（A6b、A7b 兩頁都沒有批次），且**完全不影響 v1**。
  2. A3d `/projects/<id>/expenses/new?ui=v2` 新增一項刻意偏離設計稿的行為：**「分攤明細」中「小計為 0」的成員不顯示**（2026-10-03 追加）。
  3. A2 `/projects/<id>?ui=v2` 的「旅程總覽」卡片裝飾 icon，**改用建立專案時選擇的封面 icon**（2026-10-03 追加；只換圖、**不套封面顏色**）。
  4. A5b `/projects/<id>/settle?ui=v2` **移除「各人收支」區塊**（2026-10-03 追加）。
- 範圍決策：批次為 **A7b 成員 + A6b 全部支出，兩者都移除**（使用者已確認）。

## 0. 為什麼這樣做是安全的

| 事實 | 證據 | 結論 |
|---|---|---|
| v1 成員仍有批次，且使用同一支 hook | `components/v1/members/members-v1.tsx:26,86` 呼叫 `useProjectMembers().batchRemove` | **hook 不能刪**，只移除 v2 UI |
| v1 支出仍有批次，且使用同一支 hook | `components/v1/expenses/expenses-v1.tsx:64,106` 呼叫 `batchDeleteExpenses` | **hook 不能刪**，只移除 v2 UI |
| v2 沒有其他頁面用批次 | 全庫 grep：`批次` 只在 v2 members/expenses 與 v1 | 移除不影響別頁 |
| `useProjectMembers` / `useProjectExpenses` 由 v1+v2 共用 | `lib/hooks/useProjectMembers.ts`、`lib/hooks/useProjectExpenses.ts` | 一律**只讀不寫** |

## 1. 不可違反的原則（保護 v1）

1. **只能修改**：`components/v2/**`、`tests/components/v2/**`、`docs/**`。
2. **絕對不可修改**：`components/v1/**`、`components/ui/**`、`components/expense/**`、`app/api/**`、`prisma/**`、`lib/**`（尤其 `lib/hooks/useProjectMembers.ts`、`lib/hooks/useProjectExpenses.ts`）、`tests/components/v1/**`。
   - `batchRemove` 與 `batchDeleteExpenses` 必須留在 hook 內（v1 在用）。
3. 移除後 **必須保留**：A7b 單筆「移除<名字>」、A6b 滑動刪除（`SwipeRow`）、查看圖片、AI 快速記帳 FAB、所有篩選與統計。
4. `components/v2/**` 維持 token-only：不得新增 `#hex` class、`bg-white`、`text-white`、`bg-black`、`dark:`。
5. 每個 task 收尾跑 `npm run test:run`（全綠）與 `npm run lint`。**lint 門檻 = 不新增 error**：基準已有 1 個既有 error `lib/speech.ts:113`（不在允許修改清單），不算失敗、不要修。
6. 每次 commit 後、以及最後，跑 v1 驗證（輸出必須為空）：
   ```bash
   git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
   ```
7. 不 push、不 `--amend`、不用 `--no-verify`。commit 用 `refactor:` / `test:` / `chore:` 開頭、英文一行。
8. 純移除，不重構相近邏輯、不順手改樣式。

## 2. 決策（已替使用者選好，可再調整）

| # | 決策 |
|---|---|
| R1 | 只移除 v2 的批次 UI 與其 container 狀態；hook 與 v1 不動。 |
| R2 | 保留單筆刪除/移除與滑動刪除（D21 行為不變）。 |
| R3 | `components/v2/expenses/swipe-row.tsx` **不改**：`disabled` prop 保留（只是不再由 `expense-card` 傳入）。如此 `swipe-row.test.tsx` 不需改動，blast radius 最小。 |
| R4 | A6b 移除批次後，AI 快速記帳 FAB **永遠顯示**（原本在 selectMode 時被批次列取代）。 |
| R5 | `components/v2/expenses/expense-card.tsx` 移除 select-mode 分支後，footer 圖片格邏輯簡化（見 §4 Task 2），`查看圖片` 仍為 `<Link>` 的 sibling（維持最終審查修正）。 |
| R6 | 移除後 `components/v2/members`、`components/v2/expenses` 的 Lines% 不得低於 `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`（members 57.5、expenses 28.33）。 |
| R7 | 分攤明細隱藏「小計（`r.total`）為 0」的成員；若過濾後沒有任何成員，整張表不顯示（刻意偏離 A3d 設計稿「所有人含 0/0 列」）。 |
| R8 | A2 旅程總覽裝飾 icon 改用專案封面 icon；只有 `icon:` 封面才換圖，`custom`／舊 `preset`／`null` 一律 fallback `Sparkles`；**只換圖形、不套封面顏色**（維持 lake 卡上的 `currentColor` 浮水印樣子）。刻意偏離 A2 設計稿（固定 Sparkle）。使用者已確認「只有換 icon」。 |
| R9 | A5b 移除「各人收支」區塊並刪除 `member-balances.tsx`；`data.balances` 仍用於 perPerson 與轉帳成員 id，故 `useSettlement` 不動。 |

---

## Task 1 — 移除 A7b 成員批次

**Files（同一 commit）：**
- Modify: `components/v2/members/members-v2-view.tsx`
- Modify: `components/v2/members/members-v2.tsx`
- Modify: `tests/components/v2/members-v2.test.tsx`

### 3.1 `members-v2-view.tsx`
- `MembersV2ViewProps` 移除：`batchMode`、`selected`、`onToggleBatch`、`onToggleSelect`、`onRequestBatchRemove`。保留：`removing`。
- Header 區移除 owner 的「批次／取消」按鈕（現 L43-47）。保留「分享」「增加成員」兩顆 pill。
- 成員列移除批次 checkbox 區塊（現 L76-84）。
- 移除列的 `!props.batchMode &&` 條件（現 L104），讓 `canManage` 時**一律**顯示「移除<名字>」按鈕。
- 移除底部固定「移除 N 位」bar（現 L120-131）。
- import（`Share2`/`UserMinus`/`UserPlus`/`User`）皆仍使用，保留。

### 3.2 `members-v2.tsx`
- 移除 state：`batchMode`、`selected`、`showBatchConfirm`（現 L16-18）。
- 移除函式：`toggleSelect`、`confirmBatch`（現 L20-27、L34-39）。
- `<MembersV2View>` 移除 props：`batchMode`、`selected`、`onToggleBatch`、`onToggleSelect`、`onRequestBatchRemove`（現 L66-76）。
- 移除批次用 `<ConfirmDeleteDialog>`（現 L80-88）與其 import（現 L6）；`removeOne` 走原生 `confirm()`，單筆刪除不受影響。
- 保留：`showInvite`/`showAdd`、`InviteDialog`、`AddMemberDialog`、`removeOne`、loading / not-found TopBar、`UiV2Scope`。

### 3.3 `tests/components/v2/members-v2.test.tsx`
- 移除 `it("uses checkboxes in batch mode, never for yourself")`（現 L103-111）。
- 移除 `it("batch removes selected members")`（現 L210-229）。
- `it("renders the member list and toggles batch mode")`（現 L156-172）→ 改名 `renders the member list`，只保留 `成員組成 · 3 位旅伴` 斷言；刪除批次點擊與「移除 0 位」斷言。
- `it("hides remove and batch for non-owners")`（現 L89-93）→ 改名 `hides remove for non-owners`，保留非 owner 無「移除」鈕斷言，刪除批次斷言。
- `it("deselects a member and skips removal when cancelled")`（現 L231-256）→ 移除批次互動，保留「`confirm` 回 false 時不呼叫 `removeMember`」的單筆版本。
- mock hook 回傳中的 `batchRemove: vi.fn()` **保留**（hook 仍提供，避免型別/介面變動）。
- 其餘（heading/badges、labelled buttons、single remove、invite/add、loading、not-found）保留。

**驗收：** `npx vitest run tests/components/v2/members-v2.test.tsx` 全綠；App 手動確認 `/projects/<id>/members?ui=v2` 標題列沒有「批次」、每列只有單筆移除、無底部批次列。

---

## Task 2 — 移除 A6b 全部支出批次

**Files（同一 commit）：**
- Modify: `components/v2/expenses/expenses-v2-view.tsx`
- Modify: `components/v2/expenses/expense-card.tsx`
- Modify: `components/v2/expenses/expenses-v2.tsx`
- Modify: `tests/components/v2/expenses-v2.test.tsx`

### 4.1 `expenses-v2-view.tsx`
- `ExpensesV2ViewProps` 移除：`selectMode`、`selectedIds`、`onToggleSelectMode`、`onToggleSelect`、`onRequestBatchDelete`。
- 移除「顯示 N / M 筆」右側的「批次／取消」按鈕（現 L41-48）。
- `<ExpenseCard>` 不再傳 `selectMode` / `selected` / `onToggleSelect`（現 L66-68）。
- 移除 selectMode 的底部批次刪除 bar（現 L78-89）；**永遠**渲染原本 `else` 的 AI 快速記帳 FAB（現 L90-101）。
- import 移除未使用的 `CheckSquare`、`X`（保留 `Sparkles`）。

### 4.2 `expense-card.tsx`
- `ExpenseCardProps` 移除：`selectMode`、`selected`、`onToggleSelect`（現 L22-24、L33-35）。
- `footer`（現 L113-124）簡化：因 selectMode 已不存在，
  - 有 `expense.image`：顯示 32px 空白 spacer（`<span className="block h-8 w-8 shrink-0" aria-hidden="true" />`），讓 absolute 的「查看圖片」按鈕對齊、不與明細指示重疊；
  - 無 image：顯示灰色 `未附明細圖片` indicator（`bg-v2-line-soft text-v2-check`）。
- `card`（現 L128-167）移除 `selectMode ? <label…checkbox…> : <>…</>` 分支，**永遠**渲染：
  - `<Link …>`（body + footer），
  - 以及有 image 時的 sibling `<button aria-label="查看圖片">`（維持最終審查的「button 不在 `<a>` 內」修正）。
- `SwipeRow`（現 L171）移除 `disabled={selectMode}`，即 `<SwipeRow onDelete={() => onRequestDelete(expense)}>`。**不要改 `swipe-row.tsx`**（R3）。

### 4.3 `expenses-v2.tsx`
- 從 `useProjectExpenses(...)` destructure 移除 `batchDeleteExpenses`（現 L21）；hook 其他回傳不變。
- 移除 state：`selectMode`、`selectedIds`、`showBatchDelete`（現 L27-29）。
- 移除函式：`toggleSelect`、`confirmBatchDelete`（現 L37-44、L51-57）。
- `<ExpensesV2View>` 移除 props：`selectMode`、`selectedIds`、`onToggleSelectMode`、`onToggleSelect`、`onRequestBatchDelete`（現 L102-110）。
- 移除批次用 `<ConfirmDeleteDialog>`（現 L127-137）。**保留**單筆刪除的 `<ConfirmDeleteDialog>`（現 L117-125，含 `NotifyLineCheckbox`）、圖片 lightbox、`QuickExpenseV2`。
- 保留 `deleteTarget`、`confirmDelete`、`notifyLine`、`viewingImage`、`showVoice`。

### 4.4 `tests/components/v2/expenses-v2.test.tsx`
- `it("switches cards to checkboxes in select mode")`（現 L198-）→ 移除。
- `it("shows the count line and wires batch, delete, image and voice")`（現 L180-191）→ 改名 `…wires delete, image and voice`，刪除批次點擊與 `onToggleSelectMode` 斷言。
- `it("toggles select mode and batch deletes through the container")`（現 L322-）→ 移除。
- `renderView` helper 中屬於 select-mode 的 props／型別（`selectMode`、`selectedIds`、`onToggleSelect`、`onRequestBatchDelete`）移除，讓它符合新的 `ExpensesV2ViewProps`。
- 保留：summary / day grouping / fallback / footer（D26）/ image-button-outside-link / no-description / +N / count line（去批次）/ no 清除 / empty states / no-match / single delete lightbox voice / skeleton / notify 可見性 / filters 全部。

**驗收：** `npx vitest run tests/components/v2/expenses-v2.test.tsx tests/components/v2/swipe-row.test.tsx` 全綠（swipe-row 應完全不需改動）；手動確認 `/projects/<id>/expenses?ui=v2` 標題列沒有「批次」、卡片沒有勾選框、底部沒有批次列、AI FAB 恆在、滑動刪除仍可用。

---

## Task 3 — A3d 分攤明細隱藏「小計為 0」的成員（追加）

**需求（2026-10-03 追加）**：`/projects/<id>/expenses/new?ui=v2` 的「分攤明細」表格中，**小計為 0 的成員不顯示**。
目前 A3d 設計稿是所有人都顯示（含 0/0 列，見 `split-summary.tsx:9-10` 註解）；此需求**刻意偏離設計稿**。

**Files：**
- Modify: `components/v2/expense-form/split-summary.tsx`
- Modify: `tests/components/v2/expense-form-v2-view.test.tsx`

### 實作
- 小計的定義 = 表格最後一欄 `小計`，即程式中的 `r.total`（`= shareAmount`）。
- `split-summary.tsx`：`rows` 產生後新增
  ```ts
  const visibleRows = rows.filter((r) => r.total !== 0)
  ```
  並把 `rowgroup` 內改為渲染 `visibleRows`（金額非負，`!== 0` 等價於 `> 0`）。
- 若 `visibleRows.length === 0`（例如金額為 0 或全員小計皆 0），**整個 `<section aria-label="分攤明細">` 回傳 `null`**，不要留下只含「合計 $0」的空表。
  （現有 `if (derived.shares.length === 0) return null` 保留。）
- 「合計」列維持加總；被隱藏列的 `total`/`personal`/`pool` 皆為 0，故合計數值不變。
- 更新檔頭註解（`split-summary.tsx:9-10`）為「小計為 0 的成員不顯示」。
- **不動** `use-expense-draft.ts`（`derived.shares` 不變）、不動任何 v1 檔。

### 測試（TDD：先寫會失敗的測試）
- 新增 `it("hides members whose subtotal is zero", ...)`：讓某成員小計為 0（例如把其分攤金額設為 0，或個人模式下該員沒有個人項目且共同分攤為 0），斷言：
  - 該成員的列 `within(table).queryByRole("row", { name: /^<該成員>/ })` 不存在；
  - 其餘非 0 成員仍在；
  - 「合計」列仍在且數值不變。
- 既有 `it("always shows the split breakdown with dollar amounts")`（測試檔 L249-265）與 `it("breaks down personal and shared amounts per member with dollar amounts")`（L267-290）金額皆非 0，應維持通過；若受影響，只更新為「過濾後」的正確斷言，**不得放寬**。
- 執行：`npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`。

**驗收：** 該測試檔全綠；手動在 `/projects/<id>/expenses/new?ui=v2` 讓某成員小計為 0，確認該列消失、「合計」不變。

---

## Task 4 — A2 旅程總覽裝飾 icon 改用專案封面 icon（追加）

**需求（2026-10-03 追加）**：`/projects/<id>?ui=v2` 的「旅程總覽」卡片右上角裝飾 icon，要參考**建立專案時選擇的封面 icon**（目前固定 `Sparkles`，A2 設計稿亦為 Sparkle）。此需求刻意偏離設計稿。

**Files：**
- Modify: `components/v2/project/trip-summary-card.tsx`
- Modify: `components/v2/project/project-overview-v2-view.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`

### 背景確認（不需改 API／lib）
- `OverviewProject.cover?: string | null` 已存在（`lib/project-overview.ts:46`）。
- GET `/api/projects/[id]` 用 `include:`（不是 `select:`），會回傳所有純量欄位，已含 `cover`（`app/api/projects/[id]/route.ts:20,95`）。**不得改 `app/api/**`、`lib/**`。**

### 實作
- `TripSummaryCard` 新增選填 prop `cover?: string | null`。
- 用 `parseCover(cover)` 判斷：`parsed.type === "icon"` 時取 `COVER_ICON_COMPONENTS[parsed.iconId]`，找不到或非 icon（`custom`／legacy `preset`／`none`）一律 fallback `Sparkles`：
  ```tsx
  import { Sparkles, type LucideIcon } from "lucide-react"
  import { parseCover } from "@/lib/covers"
  import { COVER_ICON_COMPONENTS } from "@/components/v2/cover/cover-icons"
  // ...
  const parsed = parseCover(cover ?? null)
  const Decoration: LucideIcon =
    (parsed.type === "icon" && COVER_ICON_COMPONENTS[parsed.iconId!]) || Sparkles
  ```
- 裝飾樣式完全不變（只換圖形）：`className="absolute -right-6 -top-6 h-[120px] w-[120px] opacity-[.08]"`、`strokeWidth={1.2}`、`aria-hidden="true"`。**不套封面顏色**（維持 `currentColor` 浮水印；卡片底色固定 lake）。
- `project-overview-v2-view.tsx`：`<TripSummaryCard summary={summary} currency={currency} cover={project.cover ?? null} />`。
- token-only 規則照舊。

### 測試
- fixture `project` 加入 `cover: "icon:camera;color:lake"`；把 `it("uses the sparkle decoration on the trip summary card")`（測試檔 L90-96）改名為 `uses the project cover icon on the trip summary card`，斷言 `container.querySelector(".lucide-camera")` 非 null、`.lucide-sparkles` 為 null。
- 新增 `it("falls back to the sparkle decoration without an icon cover")`：以 `cover: null`（可用 spread 覆寫 fixture）渲染，斷言 `.lucide-sparkles` 存在。
- 其餘測試不受影響（cover 不參與金額／日期／成員斷言）。
- 執行：`npx vitest run tests/components/v2/project-overview-v2.test.tsx`。

**驗收：** 該檔全綠；手動把該專案封面改成別的 icon（A13 專案設定 → 封面磚），回首頁 `/projects/<id>?ui=v2` 確認裝飾 icon 跟著變；`cover:null`／舊 preset 時顯示 Sparkles。

---

## Task 5 — A5b 結算移除「各人收支」section（追加）

**需求（2026-10-03 追加）**：`/projects/<id>/settle?ui=v2` 移除「各人收支」區塊（使用者稱「個人收支」；元件的 aria-label／標題為「各人收支」）。A5b 設計稿本來就沒有此區塊（先前 D19 保留為 extra），此需求把它移掉。

**Files：**
- Modify: `components/v2/settle/settle-v2-view.tsx`
- Delete: `components/v2/settle/member-balances.tsx`
- Modify: `tests/components/v2/settle-v2.test.tsx`

### 實作
- `settle-v2-view.tsx`：移除 `<MemberBalances ... />`（現 L86-91）與其 import（現 L9）。
- 刪除 `components/v2/settle/member-balances.tsx`（全庫唯一使用點就是上列 JSX；已 grep 確認無其他 import／測試直接引用）。
- **不要動** `lib/hooks/useSettlement.ts`：`data.balances` 仍被 `perPerson` 計算（`settle-v2-view.tsx:28`）與 `SettlementList` 的 `memberIds`（L78）使用，維持不變。只移除「各人收支」的呈現。
- 保留：計算總覽、轉帳建議、匯率說明、查看統計、贊助卡、幣別選擇、`adSlot`。

### 測試
- 移除 `it("shows per-member balances")`（`tests/components/v2/settle-v2.test.tsx:87-92`）。
- 保留 `it("shows 0 per person without balances")`（L116-119；仍驗 perPerson，不動）。
- 新增斷言：`screen.queryByRole("region", { name: "各人收支" })` 為 `null`（可放在既有測試或新增一個小測試）。
- 執行：`npx vitest run tests/components/v2/settle-v2.test.tsx`。

**驗收：** 該檔全綠；手動 `/projects/<id>/settle?ui=v2` 確認「各人收支」消失、其他區塊與「查看統計」不變；`components/v2/settle` Lines% ≥ baseline（81.48）。

---

## Task 6 — 驗證

1. `npm run test:run` → 全綠（0 fail；6 個既有 env-gated integration skip 不算失敗）。
2. `npm run lint` → 不得有**新增** error（既有 `lib/speech.ts:113` 為 out of scope）。
3. v1 保護 diff（§1.6 指令）→ **輸出為空**。
4. 只允許的檔案變更：`git diff --name-only 36633e1` 每行都要在 `components/v2/` 或 `tests/`（或既有 milestone 的 `app/globals.css`、`lib/covers.ts`、`docs/`、`design/`）。
5. 覆蓋率：`npx vitest run --coverage` 後，`components/v2/members`、`components/v2/expenses`、`components/v2/expense-form`、`components/v2/project`、`components/v2/settle` 的 Lines% ≥ `coverage-baseline.txt`（57.5 / 28.33 / 89.53 / 83.78 / 81.48）。移除程式碼通常使覆蓋率上升；若低於門檻，為未覆蓋行補測試。不符合就停並回報。

---

## 9. 回報給使用者的問題點

1. 批次變更讓 v2 對齊設計稿（設計稿 A6b/A7b 均無批次）；v1 的批次完全保留。
2. 移除後 v2 只能一次刪一筆（A6b 滑動刪除、A7b 單筆移除）；若之後要「多選」需另案。
3. 若你希望保留批次但只從 UI 隱藏（而非刪碼），請在執行前告知；本 spec 預設刪除 v2 端的實作。
4. **分攤明細隱藏零小計成員是刻意偏離 A3d 設計稿**（設計稿顯示所有成員含 0/0 列）；若之後設計稿更新為「隱藏 0 小計」，需同步移除本決策的備註。
5. **A2 旅程總覽裝飾 icon 改用專案封面 icon 是刻意偏離 A2 設計稿**（設計稿固定 Sparkle）；本 spec 只換圖形、不套封面顏色（使用者已確認）。
6. **A5b 移除「各人收支」是刻意偏離原本保留 extra 的 D19**；設計稿本來就沒有此區塊，v1 不受影響（`useSettlement` 不動）。
