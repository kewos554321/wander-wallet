# 業務邏輯 (Business Logic)

## 專案概述

Wander Wallet 是一個旅行分帳應用程式，整合 LINE LIFF 提供團體旅行中的共享支出管理。支援多幣別支出追蹤、結算計算、成員管理、地點記錄和專案分享功能。

## 資料模型關係

```
User (LINE 用戶)
  → lineUserId (unique)
  → createdProjects (Project[])
  → projectMemberships (ProjectMember[])

Project (旅行專案)
  → creator (User)
  → members (ProjectMember[])
  → expenses (Expense[])
  → activityLogs (ActivityLog[])
  → budget, currency, customRates, exchangeRatePrecision
  → joinMode: create_only | claim_only | both

ProjectMember (專案成員)
  → project, user (optional for placeholders)
  → role: owner | member
  → displayName, claimedAt

Expense (支出記錄)
  → project, payer (ProjectMember)
  → amount, currency, category
  → location, latitude, longitude
  → image (收據圖片)
  → participants (ExpenseParticipant[])
  → deletedAt, deletedBy (軟刪除)

ExpenseParticipant (分帳參與者)
  → expense, member, shareAmount

ActivityLog (操作歷史)
  → project, actor (ProjectMember)
  → entityType: expense | project | member
  → action: create | update | delete
  → changes, metadata
```

## 廣告系統

```
Admin → advertisements (Advertisement[])
Advertisement → placements (AdPlacement[]), analytics (AdAnalytics[])
AdPlacement → placement: home | project-list | expense-list | settle
AdProvider → 第三方廣告配置 (LINE Ads, AdMob)
```

## API 路由模式

- All routes verify session via LINE LIFF token
- Member access check: Verify user is project member before allowing access
- Creator-only actions: DELETE project, remove members
- Return JSON with appropriate HTTP status codes
- Soft delete for expenses (deletedAt, deletedByMemberId)

## 核心實作細節

- **Auth**: LINE LIFF SDK integration, JWT-based session
- **Share codes**: 12-character Base64URL encoded random bytes
- **Member placeholders**: Members can be added by name before claiming via LINE
- **Settlement algorithm**: Greedy approach matching highest debtor with highest creditor
- **Currency**: 支援多幣別，可設定自訂匯率 (customRates)
- **Currency display**: Uses zh-TW locale formatting

## 認證流程

1. LINE LIFF 登入
2. 首次登入自動建立 User (透過 lineUserId)
3. Session provider wraps app with automatic refresh
4. API routes validate LINE token and return 401 for invalid tokens

## AI 功能

### 語音支出解析
使用 LangChain + DeepSeek V3 將口說/輸入的支出描述解析為結構化資料。

**相關檔案:**
- `lib/ai/expense-parser.ts` - Parsing logic and schema
- `app/api/voice/parse/route.ts` - API endpoint
- `components/voice/voice-expense-dialog.tsx` - UI component

### 發票圖片解析
使用 LangChain + Gemini 2.0 Flash Vision 從發票圖片中提取支出資料。

**相關檔案:**
- `lib/ai/receipt-parser.ts` - Vision parsing logic
- `app/api/receipt/parse/route.ts` - API endpoint

**使用流程:**
1. User uploads receipt image
2. Click "AI 辨識發票" button
3. Image uploaded to R2, then sent to Gemini Vision
4. Auto-fills: amount, description, category, date
