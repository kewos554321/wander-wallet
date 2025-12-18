# Issue Tracking

## Requirements (需求)

| # | 描述 | 難度 | 優先級 | 狀態 | 日期 |
|---|------|------|--------|------|------|
| 4 | 支出可以增加支出日期 | 低 | P0 | 已完成 | 2025-12-17 |
| 2 | 調整傳到 LINE Group 的訊息 UI，並讓 delete、批次操作、update 可以發送群組通知 | 中 | P1 | 已完成 | 2025-12-17 |
| 6 | 調整分享連結，讓使用者直接進入 project 畫面，並統一 join project 連結 | 低 | P1 | 已完成 | 2025-12-17 |
| 3 | 支出可以增加消費清單圖片上傳功能 | 中高 | P2 | 待處理 | 2025-12-17 |
| 1 | 串接 AI 模型，讓 user 可以提供未整理的文本，自動轉換為新的支出紀錄 | 高 | P2 | 待處理 | 2025-12-17 |
| 5 | 支出可以增加地點，地點可以透過 Google Maps/Places 點選 | 中高 | P3 | 待處理 | 2025-12-17 |
| 7 | 讓 user 點擊 project 頁面上的最近支出，可以直接到該筆明細編輯頁面 | 低 | P1 | 已完成 | 2025-12-17 |
| 8 | 系統層級 Log 系統，用於生產環境追蹤 bug | 低 | P1 | 已完成 | 2025-12-18 |

---

## 難度評估說明

### #4 支出日期 (低)
- 僅需在 Expense model 加 `expenseDate` 欄位
- UI 加 date picker
- 影響範圍小

### #2 LINE 通知擴充 (中)
- `lib/liff.ts` 已有 `sendExpenseNotificationToChat`，支援 create/update/delete
- 需要在 delete、batch、update 操作處呼叫通知
- UI 調整 Flex Message 模板

### #6 分享連結統一 (低)
- 現有 shareCode 機制完整
- 主要是 routing 調整
- 改變 join 流程的跳轉邏輯

### #7 最近支出點擊跳轉 (低)
- 加 onClick handler 跳轉到編輯頁
- 路由已存在 `/projects/[id]/expenses/[expenseId]`
- 純前端 UI 調整

### #3 圖片上傳 (中高)
- 需要檔案儲存方案 (Cloudinary/S3/Vercel Blob)
- DB schema 加 imageUrl 欄位
- 前端上傳元件

### #1 AI 文本解析 (高)
- 需串接 AI API (OpenAI/Claude)
- Prompt engineering 解析非結構化文本
- 錯誤處理和 fallback
- 額外 API 成本

### #5 Google 地點選擇 (中高)
- Google Places API 整合
- DB schema 加地點欄位
- Google API 計費考量
- 地圖 UI 元件

### #8 系統層級 Log 系統 (低)
- 建立 `lib/logger.ts` 工具
- 支援 log levels: debug/info/warn/error
- 結構化 JSON 輸出，方便 Vercel 日誌查詢
- API Route 專用 logger 附帶 requestId 追蹤

---

## 建議開發順序

1. **#4 支出日期** - 快速完成，立即提升實用性
2. **#7 最近支出點擊跳轉** - 純前端，快速完成
3. **#6 分享連結** - 改善 UX，工作量小
4. **#2 LINE 通知** - 團隊協作核心功能
5. **#3 圖片上傳** - 需先決定儲存方案
6. **#1 AI 解析** - 進階功能，可作為亮點
7. **#5 地點功能** - 非核心，可後續迭代

---

## Bug Fixes (錯誤修復)

| # | 描述 | 原因 | 狀態 | 日期 |
|---|------|------|------|------|
| | | | | |

---

### 狀態說明
- `待處理` - 尚未開始
- `進行中` - 正在處理
- `已完成` - 已修復/完成
- `擱置` - 暫時不處理

### 優先級說明
- `P0` - 最高優先，應立即處理
- `P1` - 高優先，核心功能
- `P2` - 中優先，重要但不緊急
- `P3` - 低優先，nice to have
