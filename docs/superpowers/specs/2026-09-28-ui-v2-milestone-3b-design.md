# UI v2 里程碑 3b 設計：A10 拍照、A11／A12 AI 快速記帳

- 日期：2026-09-28
- 狀態：設計已口頭確認，待審閱本文件
- 上層設計：`docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`；前一里程碑：`docs/superpowers/specs/2026-09-28-ui-v2-milestone-3a-design.md`
- 設計來源：`design/project/VoiceExpenseInput.dc.html`（A11）、`design/project/Camera.dc.html`（A10）、`design/project/VoiceExpense.dc.html`（A12）
- 基底分支：`feat/ui-v2-m3a`；本里程碑分支：`feat/ui-v2-m3b`

## 1. 目標與決策

**目標**：v2 頁面的「AI 快速記帳」改用 v2 畫面（輸入 → 拍照 → 確認 → 儲存），取代目前在 v2 頁面借用的 v1 `VoiceExpenseDialog`。v1 完全不變。

| 項目 | 決策 |
|---|---|
| 單筆結果去向 | 不論 1 筆或多筆，一律進 A12 確認頁 |
| 開啟方式 | 全螢幕覆蓋層，不新增網址（維持 v1／v2 共用 URL） |
| 拍照 | 即時取景框（`getUserMedia`）；iOS LIFF 或無鏡頭權限時退回系統相機（`capture`）；皆可從相簿選圖 |
| 程式組織 | `lib/quick-expense/` 新寫純函式與 hook 供 v2 使用；v1 對話框與 `ImagePicker` 不修改，v1 下架時一併移除重複邏輯 |
| 分攤 | 只做均分（金額以 `computeShares` 計算）；不做個人項目、自訂金額、多人付款；存檔 `splitDetail` 為 `null` |
| 後端 | 不修改。沿用 `/api/voice/transcribe`、`/api/voice/parse`、`/api/receipt/parse`、`POST /api/projects/[id]/expenses` |
| 資料庫 | 無變更 |

## 2. 流程

`QuickExpenseV2` 為全螢幕覆蓋層（`fixed inset-0`，套用 `data-ui="v2"` 範圍內的 token），步驟：

```
input ──AI 解析──▶ parsing ──成功──▶ confirm ──新增 N 筆──▶ saving ──全部成功──▶ 關閉 + onSuccess()
  │  ▲                │失敗                ▲  │重新輸入                │部分失敗
  ▼  │改用手動輸入     ▼                    │  ▼                        ▼
camera ──拍照/選圖──▶ parsing           回原步驟＋錯誤   input          confirm（只留未儲存的）＋錯誤
```

### 2.1 輸入（A11）

- 頂部列：「AI 快速記帳」與關閉鈕。
- 標題「說出或輸入消費內容」；多行文字框，placeholder「例如：早餐 100 我付、晚餐 600 大家分……」；說明「支援一次多筆、不同付款人 · 點麥克風可語音輸入」。
- 麥克風鈕：語音引擎不支援時隱藏。錄音中顯示錄音狀態；辨識文字附加到文字框（以空白分隔）。
- 範例 chip：「早餐 100 我付」「晚餐 600 大家分」「計程車 250 小明付」，點擊附加到文字框。
- 「拍照或掃描收據 · AI 自動辨識金額與品項」卡片 → camera。
- 「AI 解析」主按鈕：文字去空白後為空、錄音中、轉文字中時停用。

### 2.2 拍照（A10）

- 深色全螢幕，中央對準框，文字「將發票或收據置於框內」「AI 會自動辨識金額與商家」，底部「改用手動輸入」回 input。
- 支援即時鏡頭時：顯示取景、快門鈕、相簿鈕；拍下後擷取成 JPEG `File`。
- iOS LIFF 或 `getUserMedia` 失敗／被拒：畫面顯示「開啟相機」與「從相簿選擇」兩個按鈕（`<input type="file" accept="image/*" capture="environment">` 與不含 `capture` 的 input）。
- 取得圖片後立刻進 parsing；離開 camera 步驟或關閉覆蓋層時必須停止所有 media track。

### 2.3 解析中

- 顯示 loading 與「AI 解析中…」。
- 文字：`parseText` → 回傳多筆；收據：`parseReceipt` → `receiptToItem` 轉成 1 筆，並把照片放進該筆的 `pendingFile`／`preview`、日期用辨識結果（無則今天）。
- 失敗：回到來源步驟（input 或 camera），顯示錯誤；input 的文字保留。
- 解析結果 0 筆：視為失敗，錯誤「沒有辨識到支出，請換個說法再試一次」。

### 2.4 確認（A12）

- 一次顯示一張卡片；頂部「支出明細」與「i / N」，左右箭頭與左右滑動切換。
- 卡片欄位：金額（數字輸入，規則同 M3a `toMoneyInput`）、幣別（v1 `CurrencySelect`）、描述、類別（v2 `CategoryPicker`）、付款成員（單選 pill，共用 `memberPillClass`）、分攤成員（多選 pill，含全選；標題「幫誰付？（N 人均分 · 每人 X）」）、支出日期、消費地點、收據圖片（日期／地點／圖片沿用 v1 元件，與 M3a 相同）、刪除此筆。
- 底部：「共 N 筆」與總額（多幣別時各幣別分開列出）、「通知 LINE 群組」開關（僅 `canSendMessages && !isDevMode` 時顯示，預設開）、「重新輸入」（回 input，清空結果，文字保留）、「新增 N 筆」主按鈕。
- 刪到 0 筆時回 input。
- 按「新增 N 筆」先跑 `validateItems`；有錯時跳到第一筆有錯的卡片並顯示錯誤，不送出。

### 2.5 儲存

- 顯示進度「正在新增 i / N」。依序處理每筆：有 `pendingFile` 先上傳（`uploadImageToR2`；上傳失敗不擋儲存，該筆圖片為 `null`），再 `POST /expenses`，`participants` 由 `computeShares` 均分產生。
- 某筆失敗即停止：已成功的從清單移除，回 confirm 並停在失敗那筆，顯示伺服器錯誤；使用者可修正後再按「新增」只送剩下的，不會重複建立。
- LINE 通知：每次儲存流程結束（全部成功或中途失敗）時，若開關為開、`canSendMessages && !isDevMode`、使用者偏好 `notifications.expenseCreated` 為真，且本次有成功筆數，對「本次成功的筆數」發送：1 筆用 `sendExpenseNotificationToChat`，多筆用 `sendBatchExpenseNotificationToChat`；失敗靜默。
- 全部成功：呼叫 `onSuccess()` 並關閉覆蓋層。

## 3. 模組

### 3.1 共用邏輯 `lib/quick-expense/`

| 檔案 | 內容 |
|---|---|
| `draft.ts` | `QuickItem` 型別（`ExpenseItemResult` 欄位＋`expenseDate`、`location`、`latitude`、`longitude`、`image: ImagePickerValue`）；`fromParsed(results, defaults)`；`validateItems(items): { index, message } \| null`；`itemTotals(items): { currency, total }[]` |
| `parse.ts` | `parseText(authFetch, input)`、`parseReceipt(authFetch, file)`、`receiptToItem(result, { currency, payerId, memberIds, file, preview })` |
| `speech-input.ts` | `useSpeechInput({ onText })`：包裝 `useSpeechRecognition`／`useMediaRecorderSpeech`（引擎選擇規則同 v1），MediaRecorder 模式錄完自動呼叫 `/api/voice/transcribe`；回傳 `{ supported, recording, transcribing, error, toggle }` |
| `use-quick-save.ts` | `useQuickSave({ projectId, projectName, members })` → `{ save(items, { notifyLine }), progress }`；`save` 回傳 `{ savedIds, failed: { index, message } \| null }` |

`validateItems` 規則（依序，第一個錯誤即回傳）：金額需為有限數且 > 0 → 「第 i 筆請輸入有效金額」；需有付款成員 → 「第 i 筆請選擇付款成員」；至少一位分攤成員 → 「第 i 筆請選擇至少一位分攤成員」。

### 3.2 v2 畫面 `components/v2/quick-expense/`

| 檔案 | 內容 |
|---|---|
| `quick-expense-v2.tsx` | 覆蓋層與步驟狀態；props 與 `VoiceExpenseDialog` 相同（`open`、`onOpenChange`、`projectId`、`projectName`、`members`、`currentUserMemberId`、`onSuccess`、`currency`） |
| `quick-input-step.tsx` | A11 |
| `camera-step.tsx` | A10 |
| `use-camera.ts` | 即時鏡頭啟停、擷取成 `File`、iOS LIFF 偵測與退回判斷（規則參考 `components/ui/image-picker.tsx`，不修改該檔） |
| `confirm-step.tsx` | A12 卡片切換、底部彙總與按鈕 |
| `quick-item-card.tsx` | 單筆卡片欄位 |

### 3.3 接線

`components/v2/project/project-overview-v2.tsx`、`components/v2/expenses/expenses-v2.tsx` 以 `QuickExpenseV2` 取代 `VoiceExpenseDialog`，傳入相同 props。v1 頁面與 `components/voice/` 不變。

## 4. 限制

- v2 元件不得使用 `dark:` variant；版面數值以設計稿為準。
- 所有文案為繁體中文；程式註解為英文。
- 不修改任何 API route、`prisma/schema.prisma`、v1 元件、`components/ui/image-picker.tsx`。
- 不執行 `prisma db push`，不連線資料庫。

## 5. 測試

- 單元測試（`tests/lib/quick-expense/`）：`validateItems` 各錯誤與順序、`itemTotals` 多幣別、`fromParsed` 預設值、`receiptToItem`（付款成員、全員分攤、日期 fallback、圖片帶入）、`useQuickSave`（均分 participants、上傳失敗仍儲存、中途失敗回傳 `savedIds`／`failed`、通知條件與單筆／批次模板選擇、無成功筆數不通知）。
- 元件測試（`tests/components/v2/quick-expense/`，mock `authFetch`、語音、相機）：輸入空白時「AI 解析」停用；chip 附加文字；解析成功進確認頁並顯示「1 / N」；解析失敗保留文字並顯示錯誤；0 筆結果顯示錯誤；確認頁切換、刪除到 0 筆回輸入；驗證錯誤跳到該筆；部分失敗後只重送剩餘筆數；全部成功呼叫 `onSuccess` 並關閉；相機不支援時顯示「開啟相機／從相簿選擇」；離開相機步驟停止 track。
- 全套 `npm run test:run` 與 `npm run lint` 通過。

## 6. 不在範圍

- 個人項目、自訂分攤金額、多人付款（存好後可到 v2 編輯頁調整個人項目與自訂金額）。
- v1 `VoiceExpenseDialog`、`ImagePicker` 的重構或移除。
- 後端 AI 解析邏輯或提示詞調整。
- 計算機、幣別、日期、地點、圖片元件的 v2 樣式（里程碑 5）。
