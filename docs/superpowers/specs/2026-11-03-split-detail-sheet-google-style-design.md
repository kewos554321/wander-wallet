# 分帳明細 Sheet 精煉（Google UX patterns + 品牌 skin）設計

日期：2026-11-03
狀態：待實作
範圍：`app/demo/expense-prototype/split-detail-sheet.tsx` 與其周邊 demo 元件

## 1. 背景與問題

平台式版本把「個人項目 / 共同分攤 / 小計」收進同一個 bottom sheet，互動已可用，但仍是 prototype 等級：

- 版面與 Material 3 清單／表單的節奏不一致（區塊高度、字級、觸控目標、state layer）。
- 兩個 editor 的 markup 都塞在 `split-detail-sheet.tsx`，檔案持續變大，驗證邏輯也重複。
- 鍵盤與螢幕閱讀器支援不足：沒有 focus trap、Escape、focus return；accordion 沒有 `aria-controls` / panel role。
- 錯誤提示與「完成」disabled 的關係只在視覺上，沒有 `aria-invalid` / live region。
- 平台列表 row 已經有 supporting text，但 sheet 內部的狀態（已固定、自動平分、個人項目）仍只靠顏色與圖示。

## 2. 目標 / 非目標

**目標**

- 借用 Google/Material 的 **UX patterns**：list row 結構、progressive disclosure、accordion、清楚的 primary/secondary 層級、supporting text、inline validation、focus 管理、48dp 觸控目標。
- 把 `PersonalItemsEditor`、`ShareAmountEditor`、`SheetSectionRow` 抽成獨立元件，主 sheet 只負責 orchestration。
- 保留既有行為：空白列忽略、touched 未完成才擋、關閉清空白列、母表單仍擋未完成項目。
- 補齊 a11y：focus trap / return、Escape、`aria-expanded` / `aria-controls`、`aria-invalid`、錯誤 live region、48dp 觸控目標。
- 390 / 320 都不溢出；支援 reduced motion。

**非目標**

- **不改視覺 theme**：品牌 serif/sans、lake/sand 色票、圓角、按鈕形狀、lucide icons 全部保留。
- 不做 Material 視覺 clone：不改成 Roboto/Noto Sans、Material color roles、28dp sheet、20dp filled buttons、Material Symbols、ripple。
- 不改 split 數學、匯率、API、資料庫、正式產品元件。
- 不改平台列表的資訊架構（一列一個總額 + chevron + supporting text）。
- 不新增套件；只用現有 Tailwind tokens、lucide icons、Vitest + Testing Library。
- 不改 ledger 版的欄位設計；只讓它共用驗證與 personal editor（若 Task 5 範圍允許）。

## 3. Google UX patterns（不是 Material 視覺 clone）

### 3.1 Bottom sheet shell

- 保留品牌 sheet 的圓角、陰影、surface、serif 標題；不改 28dp / Material type scale。
- 只借 UX：最大高度約 `92vh`、內容可捲動、footer 固定、header 有清楚的 supporting text、close 至少 48dp。
- Header 與內容用現有 divider；footer 用現有 surface 樣式。

### 3.2 Section row（accordion）

- 借 Material 的 list item **行為**，不換品牌視覺：
  - 最小高度 56dp、左右 16dp、垂直 12dp，確保可點。
  - headline 用品牌字級；supporting text 用現有 muted 色（例如「個人項目先扣」／「已固定」／「自動平分」）。
  - trailing：金額（tabular、品牌字重）＋ expand icon（lucide `ChevronDown`，展開時旋轉 180°）。
  - hover / focus 用現有 theme 的淡色背景與 focus outline；不引入 Material state layer token。
- `aria-expanded`、`aria-controls`；panel `role="region"`、`aria-labelledby`。
- 一次只開一個 panel（accordion），展開/收合 180ms；`motion-reduce` 關閉動畫。

### 3.3 Personal items editor

- 借 UX：單一新增入口、空狀態、inline error、48dp、清楚的分隔；**視覺沿用品牌**（現有輸入框、圓角、色彩、字體）。
- 外層可用現有 `bg-v2-sand` tonal container；不用虛線框。
- 空狀態：一行 supporting text「尚未新增品項」＋現有品牌風格的 text button「＋ 新增品項」。
- 有品項時：
  - 每個 item 是一列：名稱欄（2fr）、金額欄（1fr，前綴 `$`）、48dp 刪除 icon button。
  - 欄位使用現有 `rounded-xl border border-v2-line bg-v2-surface`（或同等的品牌 input class），不改成 Material filled field。
  - 欄位之間用 divider；不使用每列獨立卡片。
  - 新增動作是單一 text button（48dp、品牌 primary 色、leading plus）。
- 錯誤：品牌 error 色 + supporting text；保留可見的 focus ring。
- 行為：
  - 空白列（name 與 amount 都空）＝ placeholder，不顯示錯誤，關閉時刪除。
  - 只要 name 或 amount 有輸入，就必須完整：name 非空、amount > 0。
  - 未完成：該欄位 error 樣式 + supporting text（「請填寫名稱」／「請填寫金額」兩者皆缺時「請填寫名稱與金額」）。
  - 最多 20 項、名稱最多 30 字（沿用現有規則）。

### 3.4 Common share editor

- 外層同品牌 tonal container。
- 金額欄：沿用品牌金額輸入樣式（`$` 前綴、品牌字重、tabular、右對齊）；展開時自動 focus + select。
- supporting text：
  - 未固定：「自動平分會是 $X」
  - 已固定：「目前是固定金額；還原後會重新自動平分。」
- 已固定時顯示 pin 與「還原自動平分」text button；未固定時不顯示。
- 錯誤（例如超過上限）用品牌 error 色 + supporting text，並保留 `aria-live`。

### 3.5 Summary / footer

- 小計列：沿用品牌字級與 tabular 金額；與上方 divider 分隔。
- Footer：
  - 左側 error summary（只有 touched 未完成時顯示，品牌 error 色）。
  - 右側品牌 primary button「完成」，至少 48dp；invalid 時 disabled（`aria-disabled` 由 disabled 屬性帶出）。
  - 關閉（X / backdrop / Escape）時清掉空白列；touched 未完成列保留，母表單仍擋。

### 3.6 平台列表 row 的狀態提示

- 已知需求：使用者要看出某一列改過個人項目或固定共同分攤。
- 以 list row 的 supporting text 表達（已實作，沿用品牌樣式）：
  - `個人 N 項 · $X`
  - `共同分攤已固定`
  - 兩者以 ` · ` 串接；沒有改動就不顯示第二行。

### 3.7 Brand skin invariants（不可改）

- 字體：品牌 serif 標題 + 現有 sans；不改 Material type scale。
- 色票：lake / sand / coral / danger 等現有 `v2-*` tokens；不改 Material color roles。
- 圓角、陰影、按鈕形狀、icon 家族：沿用現有 theme（含 pill button 若原本就是）。
- 不改成 Material filled field、Material Symbols、ripple、28dp sheet。
- 可以改的只有：層級、spacing、hit area、狀態回饋、focus、validation、motion、aria。

## 4. 元件結構

| 檔案 | 責任 |
|---|---|
| `app/demo/expense-prototype/split-detail-sheet.tsx` | bottom sheet shell、accordion state、close cleanup、footer、focus management |
| `app/demo/expense-prototype/split-detail/sheet-section-row.tsx` | Material list row + expandable panel + aria |
| `app/demo/expense-prototype/split-detail/personal-items-editor.tsx` | 個人項目 list、空白狀態、filled fields、per-field errors |
| `app/demo/expense-prototype/split-detail/share-amount-editor.tsx` | 共同分攤 amount field、auto/pinned helper、reset |
| `app/demo/expense-prototype/personal-item-state.ts` | `isTouchedItem` / `isCompleteItem` / `isIncompleteItem` / `countIncompleteItems` |
| `app/demo/expense-prototype/guardrails.ts` | 使用 state helpers；touched 未完成才產生表單錯誤 |
| `app/demo/expense-prototype/personal-items-sheet.tsx` | 重用 `PersonalItemsEditor`，關閉清空白列 |

## 5. 行為契約

| 狀態 | 完成按鈕 | 表單 save | 備註 |
|---|---|---|---|
| 沒有品項 | enabled | 可 save | 個人項目 summary `—` |
| 只有空白列 | enabled | 可 save | 關閉時刪除空白列 |
| 有 touched 但未完成 | disabled | 不可 save | 紅線 + supporting text；X 可關但母表單仍擋 |
| 全部完成 | enabled | 可 save | summary 顯示個人金額 |
| 共同分攤固定 | enabled | 可 save | pin + 「還原自動平分」 |
| 共同分攤自動 | enabled | 可 save | 「自動平分會是 $X」 |

## 6. A11y / 響應式 / 動效

- Dialog：`role="dialog"`、`aria-modal`、`aria-labelledby`；focus 進入 sheet；Tab 在 sheet 內循環；關閉後 focus 回 trigger。
- Escape 關閉；backdrop 可關；關閉路徑都要跑 cleanup。
- 錯誤訊息用 `role="alert"` 或 `aria-live="polite"`；輸入加 `aria-invalid`、`aria-describedby`。
- 所有互動至少 44×44，主要 row / button 48dp。
- 390 / 320：不 horizontal overflow；320 時名稱欄可縮，金額欄不得折行。
- 動效 180ms；`prefers-reduced-motion` 時無動畫。
- 視覺 QA 只檢查品牌 theme 是否被誤換成 Material 視覺；不追求像素級 Material clone。

## 7. 測試策略

- `tests/demo/personal-item-state.test.ts`：純函式邊界（空白、只有名稱、只有金額、0、完整、whitespace）。
- `tests/demo/personal-items-editor.test.tsx`：空狀態、新增、刪除、空白列不報錯、touched 未完成報錯、完整後清除錯誤、48dp。
- `tests/demo/share-amount-editor.test.tsx`：值、auto helper、pinned helper、reset、limit note。
- `tests/demo/split-detail-sheet.test.tsx`：collapsed summary、accordion、aria、空白列 cleanup、touched 未完成 disabled、focus return、Escape。
- 既有 `npm run test:run`、`npx tsc --noEmit`、`npm run lint` 全綠；impeccable detector 0 findings。

## 8. 風險 / 取捨

- **第二行 vs 單行**：Material 的 supporting text 會讓有狀態的列變高；沒有狀態的列維持一行。若使用者不接受，替代方案是 trailing chips，但更擠。
- **Focus trap**：sheet 是 demo 元件，focus trap 要自己寫；不要引入 dialog 套件。
- **Standalone sheet 重用**：`PersonalItemsSheet` 的 header/footer 與 inline editor 不同；只抽 body，不動外層。
- **資料不變**：所有金額、split 結果、驗證規則不得因重構改變。
