# 技術規範 (Coding Standards)

## Tech Stack

- **Frontend**: Next.js 16, React 19.2, TypeScript 5, Tailwind CSS v4, Radix UI
- **Backend**: Next.js API Routes, Prisma 6.18 ORM, PostgreSQL (Neon)
- **Auth**: LINE LIFF SDK, JWT strategy
- **AI**: LangChain + DeepSeek V3 (語音解析), Gemini 2.0 Flash (發票辨識)
- **Storage**: Cloudflare R2 (圖片上傳)
- **Maps**: Leaflet + React Leaflet
- **Charts**: Recharts
- **PDF**: jsPDF + jspdf-autotable

## 常用指令

```bash
# 開發
npm run dev              # Start development server
npm run dev:dev          # Use .env.dev
npm run dev:main         # Use .env.main

# 建置
npm run build            # Build for production
npm run build:dev        # Build with .env.dev
npm run build:main       # Build with .env.main

# 品質
npm run lint             # Run ESLint
npm run test:run         # Run all tests
npm run test:coverage    # Run tests with coverage

# 資料庫
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database
npm run db:studio        # Open Prisma Studio GUI
npm run db:push          # Push schema to database
```

## 目錄結構

```
/app                    # Next.js App Router
  /admin               # 後台管理頁面
  /api                 # API Routes
  /projects            # 專案相關頁面
  /settings            # 設定頁面
/components
  /ads                 # 廣告元件
  /auth                # 認證元件
  /dashboard           # 儀表板元件
  /expense             # 支出相關元件
  /layout              # 佈局元件
  /map                 # 地圖元件
  /ui                  # 通用 UI 元件 (Radix-based)
  /voice               # 語音輸入元件
/lib
  /ai                  # AI 整合 (expense-parser, receipt-parser)
  /hooks               # Custom React hooks
  /services            # Business logic services
  /constants           # 常數定義
  /export              # PDF 匯出邏輯
/prisma                # Database schema
/types                 # TypeScript type definitions
/tests                 # Test files
/docs                  # Documentation
/scripts               # Utility scripts
```

## 路徑別名

- `@/*` maps to project root

## 測試

```bash
npm run test:run              # Run all tests
npm run test:coverage         # Run tests with coverage report
```

測試檔案位置：
- `/tests/components/` - Component tests
- `/tests/api/` - API route tests
- `/tests/lib/` - Utility function tests
- `/tests/unit/` - Unit tests

## 開發環境

- Mobile-first responsive design with bottom navigation
- PWA support with service worker and install prompt
- Dark mode with system detection and manual toggle
