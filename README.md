# Wander Wallet

旅行分帳錢包 - 群組旅遊共享支出管理應用程式

## 功能特色

- **專案管理** - 建立旅行專案，邀請成員共同管理
- **支出追蹤** - 記錄每筆消費，支援多種分類與多幣別
- **智慧結算** - 自動計算誰欠誰多少錢，最佳化結算筆數
- **AI 語音輸入** - 用說的就能記帳 (DeepSeek V3)
- **AI 發票辨識** - 拍照自動辨識收據資訊 (Gemini Vision)
- **統計分析** - 視覺化圖表呈現支出分布與趨勢
- **資料匯出** - 支援 CSV 與 PDF 格式匯出
- **LINE 整合** - 透過 LINE LIFF 無縫登入與分享

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | Next.js 16, React 19, TypeScript 5 |
| 樣式 | Tailwind CSS v4, Radix UI |
| 後端 | Next.js API Routes |
| 資料庫 | PostgreSQL (Neon), Prisma 6.18 |
| 認證 | JWT (Jose), LINE LIFF |
| AI | DeepSeek V3, Google Gemini 2.0 Flash |
| 儲存 | Cloudflare R2 |
| 部署 | Vercel |

## 開始使用

### 環境需求

- Node.js 20+
- PostgreSQL 資料庫
- LINE LIFF 應用程式 (選用)

### 安裝

```bash
# 複製專案
git clone https://github.com/your-username/wander-wallet.git
cd wander-wallet

# 安裝依賴
npm install

# 複製環境變數範本
cp .env.example .env

# 設定資料庫連線與其他環境變數
# 編輯 .env 檔案

# 產生 Prisma Client
npm run db:generate

# 執行資料庫遷移
npm run db:migrate

# 啟動開發伺服器
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看結果。

### 環境變數

```env
# 資料庫
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"

# LINE LIFF
LIFF_ID="your-liff-id"
LINE_CHANNEL_ID="your-channel-id"

# AI 服務 (選用)
DEEPSEEK_API_KEY="your-deepseek-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-key"

# Cloudflare R2 (選用)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket"
R2_PUBLIC_URL="https://your-r2-url"
```

## 開發指令

```bash
npm run dev          # 啟動開發伺服器
npm run build        # 建置生產版本
npm run lint         # 執行 ESLint 檢查
npm run test:run     # 執行測試
npm run test:coverage # 執行測試並產生覆蓋率報告

# 資料庫
npm run db:generate  # 產生 Prisma Client
npm run db:migrate   # 執行資料庫遷移
npm run db:reset     # 重置資料庫
npm run db:studio    # 開啟 Prisma Studio
```

## 專案結構

```
wander-wallet/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   └── projects/          # 專案頁面
├── components/            # React 元件
│   ├── ui/                # 基礎 UI 元件
│   └── ...                # 業務元件
├── lib/                   # 工具函式與服務
│   ├── ai/                # AI 模組
│   └── ...
├── prisma/                # 資料庫結構
├── tests/                 # 測試檔案
└── docs/                  # 專案文件
    ├── ARCHITECTURE.md    # 架構說明
    ├── DATABASE.md        # 資料庫結構
    └── API.md             # API 文件
```

詳細架構說明請參考 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 文件

- [架構說明](./docs/ARCHITECTURE.md) - 專案整體架構與模組說明
- [資料庫結構](./docs/DATABASE.md) - 資料表定義與關聯
- [API 文件](./docs/API.md) - API 端點與使用方式

## 螢幕截圖

*待補充*

## 授權

MIT License
