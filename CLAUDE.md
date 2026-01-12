# Wander Wallet - Claude Code Instructions

## 自動載入規則

開始工作前，依據任務內容自動讀取對應文件，無需向用戶確認：

### 必讀 (每次對話)
`.claude/00_Manifesto.md` - 核心憲法、溝通規則、底線原則

### 關鍵字觸發

| 觸發條件 | 載入文件 |
|----------|----------|
| 寫程式、修改、新增、重構、測試、lint、build、目錄結構 | `01_Coding_Standards.md` |
| API、資料庫、Prisma、認證、LINE、AI、功能設計、資料模型 | `02_Business_Logic.md` |
| 元件用法、範例、Dialog、Interface、參考寫法 | `99_Reference_Styles.md` |

### 複合任務
當任務涉及多個領域時，同時載入所有相關文件。例如：
- 「新增 API 功能」→ 載入 `01` + `02`
- 「修改 Dialog 元件」→ 載入 `01` + `99`

## 運作原則

1. **靜默載入**: 讀取文件後直接執行，不重複引用原文
2. **先讀再改**: 修改檔案前必須先讀取了解現有程式碼
3. **不猜測**: 不確定的事情要詢問

## 快速參考

**Tech Stack**: Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS v4 + Prisma 6.18 + PostgreSQL + LINE LIFF

**常用指令**:
```bash
npm run dev       # 開發伺服器
npm run build     # 建置
npm run lint      # 檢查
npm run test:run  # 測試
npm run db:studio # Prisma GUI
```
