# Wander Wallet 專案架構說明

## 目錄結構

```
wander-wallet/
├── app/                    # Next.js App Router (頁面與 API 路由)
│   ├── api/               # API 路由
│   ├── projects/          # 專案相關頁面
│   ├── settings/          # 使用者設定頁面
│   └── debug/             # 開發除錯頁面
├── components/            # React 元件
│   ├── auth/              # 認證相關元件
│   ├── dashboard/         # 儀表板圖表與卡片
│   ├── expense/           # 支出管理元件
│   ├── export/            # 資料匯出元件
│   ├── layout/            # 版面配置元件
│   ├── system/            # 系統工具元件 (PWA、主題)
│   ├── ui/                # Radix UI 基礎元件
│   └── voice/             # 語音輸入元件
├── lib/                   # 工具函式與服務
│   ├── ai/                # AI 模組 (DeepSeek、Gemini)
│   ├── constants/         # 常數定義
│   ├── export/            # 匯出功能
│   ├── services/          # 業務邏輯服務
│   └── generated/         # Prisma 自動產生的型別
├── prisma/                # 資料庫結構定義
├── public/                # 靜態資源
├── tests/                 # 測試檔案
│   ├── components/        # 元件測試
│   ├── api/               # API 路由測試
│   ├── lib/               # 工具函式測試
│   └── unit/              # 單元測試
└── docs/                  # 專案文件
```

## 技術棧

### 前端
- **Next.js 16** - React 全端框架
- **React 19** - UI 函式庫
- **TypeScript 5** - 型別安全
- **Tailwind CSS v4** - 樣式框架
- **Radix UI** - 無障礙 UI 元件庫
- **Recharts** - 圖表視覺化
- **Lucide React** - 圖示庫

### 後端
- **Next.js API Routes** - 伺服器端 API
- **Prisma 6.18** - ORM 資料庫存取
- **PostgreSQL (Neon)** - 雲端資料庫

### 認證與安全
- **Jose** - JWT 處理
- **LINE LIFF** - LINE 前端框架整合

### AI 功能
- **LangChain** - AI 應用框架
- **DeepSeek V3** - 語音支出解析
- **Google Gemini 2.0 Flash** - 發票圖片辨識

### 雲端服務
- **Cloudflare R2** - 圖片儲存
- **Vercel** - 部署平台

## 核心功能模組

### 1. 專案管理 (`/app/projects/`)
- 建立、編輯、刪除專案
- 專案封面與預算設定
- 成員邀請與管理
- 分享碼機制

### 2. 支出管理 (`/app/projects/[id]/expenses/`)
- 新增、編輯、刪除支出
- 支援多幣別
- 圖片上傳 (收據)
- 地點標記
- AI 語音輸入
- AI 發票辨識

### 3. 結算功能 (`/app/projects/[id]/settle/`)
- 計算成員間債務關係
- 使用貪婪演算法最佳化結算筆數
- 支援匯率轉換

### 4. 資料匯出 (`/app/projects/[id]/export/`)
- CSV 格式匯出
- PDF 報表產生

### 5. 統計分析 (`/app/projects/[id]/stats/`)
- 支出分類圓餅圖
- 趨勢折線圖
- 成員餘額長條圖

### 6. 活動記錄 (`/app/projects/[id]/activity-logs/`)
- 完整操作歷史
- 變更追蹤
- 篩選與搜尋

## 認證流程

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   LINE LIFF     │────▶│  /api/auth   │────▶│   JWT Token │
│   Access Token  │     │    /liff     │     │   (7 days)  │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   Database   │
                        │ User Upsert  │
                        └──────────────┘
```

1. 使用者透過 LINE LIFF 取得 Access Token
2. 前端呼叫 `/api/auth/liff` 驗證 Token
3. 後端向 LINE API 驗證 Token 並取得使用者資料
4. 建立或更新使用者資料
5. 回傳 JWT Session Token (有效期 7 天)
6. 後續 API 請求使用 `Authorization: Bearer <token>` 標頭

### 開發環境
在開發環境中可使用 `dev-session-token` 作為測試用 Token。

## API 中介層模式

所有 API 路由遵循以下模式：

```typescript
import { getAuthUser } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  // 1. 驗證使用者
  const user = await getAuthUser(req)
  if (!user) {
    return errorResponse('Unauthorized', 401)
  }

  // 2. 業務邏輯處理
  // ...

  // 3. 回傳標準化回應
  return successResponse(data)
}
```

## 元件設計原則

### UI 元件 (`/components/ui/`)
- 基於 Radix UI Primitives
- 支援深色模式
- 無障礙設計
- 使用 `cn()` 工具合併 Tailwind 類別

### 業務元件
- 遵循 Mobile-first 響應式設計
- 使用 `use client` 指令標記客戶端元件
- 統一錯誤處理與載入狀態

## 路徑別名

專案使用 `@/*` 作為根目錄的路徑別名：

```typescript
// 使用別名
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'

// 而非相對路徑
import { Button } from '../../../components/ui/button'
```

## 環境變數

| 變數名稱 | 說明 |
|---------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `JWT_SECRET` | JWT 簽署金鑰 |
| `LIFF_ID` | LINE LIFF 應用程式 ID |
| `LINE_CHANNEL_ID` | LINE Channel ID |
| `DEEPSEEK_API_KEY` | DeepSeek API 金鑰 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API 金鑰 |
| `R2_ACCOUNT_ID` | Cloudflare R2 帳戶 ID |
| `R2_ACCESS_KEY_ID` | R2 存取金鑰 ID |
| `R2_SECRET_ACCESS_KEY` | R2 密鑰 |
| `R2_BUCKET_NAME` | R2 儲存桶名稱 |
| `R2_PUBLIC_URL` | R2 公開 URL |
