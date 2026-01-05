# 資料庫結構說明

## 概覽

Wander Wallet 使用 PostgreSQL 資料庫，透過 Prisma ORM 進行資料存取。

## ER 關聯圖

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    User     │       │  ProjectMember  │       │   Project   │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │◀──────│ userId (FK)     │───────▶│ id (PK)     │
│ lineUserId  │       │ projectId (FK)  │───────▶│ name        │
│ email       │       │ displayName     │       │ description │
│ name        │       │ role            │       │ budget      │
│ image       │       │ joinedAt        │       │ currency    │
│ createdAt   │       │ claimedAt       │       │ createdBy   │──┐
│ updatedAt   │       └─────────────────┘       │ ...         │  │
└─────────────┘               │                 └─────────────┘  │
      │                       │                        │         │
      └───────────────────────┼────────────────────────┘         │
                              │                                   │
                              ▼                                   │
┌─────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│   Expense   │       │ ExpenseParticipant  │       │  ActivityLog    │
├─────────────┤       ├─────────────────────┤       ├─────────────────┤
│ id (PK)     │◀──────│ expenseId (FK)      │       │ id (PK)         │
│ projectId   │       │ memberId (FK)       │───────▶│ projectId (FK)  │
│ paidByMember│       │ shareAmount         │       │ actorMemberId   │
│ amount      │       └─────────────────────┘       │ entityType      │
│ currency    │                                     │ entityId        │
│ description │                                     │ action          │
│ category    │                                     │ changes         │
│ image       │                                     │ metadata        │
│ location    │                                     │ createdAt       │
│ expenseDate │                                     └─────────────────┘
│ deletedAt   │
│ ...         │
└─────────────┘
```

## 資料表詳細說明

### User (使用者)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵，自動產生 |
| `lineUserId` | String | LINE 使用者 ID (唯一) |
| `email` | String? | 電子郵件 (選填) |
| `name` | String? | 顯示名稱 |
| `image` | String? | 頭像 URL |
| `createdAt` | DateTime | 建立時間 |
| `updatedAt` | DateTime | 更新時間 |

**關聯:**
- `createdProjects[]` - 建立的專案
- `projectMemberships[]` - 專案成員身份

---

### Project (專案)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵，自動產生 |
| `name` | String | 專案名稱 |
| `description` | String? | 專案描述 |
| `cover` | String? | 封面圖片 (preset:1-6 或 base64) |
| `budget` | Decimal(12,2)? | 預算金額 |
| `currency` | String | 結算幣別 (預設: TWD) |
| `startDate` | DateTime? | 開始日期 |
| `endDate` | DateTime? | 結束日期 |
| `joinMode` | String | 加入模式: `create_only`, `claim_only`, `both` |
| `memo` | Text? | 共享備忘錄 |
| `mileageData` | JSON? | 里程計算資料 |
| `customRates` | JSON? | 自訂匯率 (例: `{"JPY": 0.22}`) |
| `createdBy` | UUID | 建立者 ID (FK → User) |
| `createdAt` | DateTime | 建立時間 |
| `updatedAt` | DateTime | 更新時間 |

**關聯:**
- `creator` - 建立者 (User)
- `members[]` - 專案成員 (ProjectMember)
- `expenses[]` - 支出記錄 (Expense)
- `activityLogs[]` - 活動記錄 (ActivityLog)

---

### ProjectMember (專案成員)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵，自動產生 |
| `projectId` | UUID | 所屬專案 ID (FK → Project) |
| `userId` | UUID? | 對應使用者 ID (FK → User)，佔位成員為 null |
| `displayName` | String | 顯示名稱 |
| `role` | String | 角色: `owner`, `member` |
| `joinedAt` | DateTime | 加入時間 |
| `claimedAt` | DateTime? | 認領時間 |

**索引:**
- `@@unique([projectId, userId])` - 確保使用者在專案中唯一

**關聯:**
- `project` - 所屬專案
- `user` - 對應使用者 (可為 null)
- `paidExpenses[]` - 支付的支出
- `deletedExpenses[]` - 刪除的支出
- `expenseParticipants[]` - 參與的支出
- `activityLogs[]` - 執行的活動

---

### Expense (支出)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵，自動產生 |
| `projectId` | UUID | 所屬專案 ID |
| `paidByMemberId` | UUID | 付款者成員 ID |
| `amount` | Decimal(10,2) | 金額 |
| `currency` | String | 幣別 (預設: TWD) |
| `description` | String? | 描述 |
| `category` | String? | 分類 |
| `image` | Text? | 收據圖片 (base64) |
| `location` | String? | 地點地址 |
| `latitude` | Decimal(10,7)? | 緯度 |
| `longitude` | Decimal(10,7)? | 經度 |
| `expenseDate` | DateTime | 消費日期 |
| `createdAt` | DateTime | 建立時間 |
| `updatedAt` | DateTime | 更新時間 |
| `deletedAt` | DateTime? | 軟刪除時間 |
| `deletedByMemberId` | UUID? | 刪除者成員 ID |

**支出分類:**
- `food` - 餐飲
- `transport` - 交通
- `accommodation` - 住宿
- `entertainment` - 娛樂
- `shopping` - 購物
- `other` - 其他

**關聯:**
- `project` - 所屬專案
- `payer` - 付款者 (ProjectMember)
- `deletedBy` - 刪除者 (ProjectMember)
- `participants[]` - 分攤者 (ExpenseParticipant)

---

### ExpenseParticipant (支出參與者)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵，自動產生 |
| `expenseId` | UUID | 所屬支出 ID |
| `memberId` | UUID | 參與成員 ID |
| `shareAmount` | Decimal(10,2) | 分攤金額 |

**索引:**
- `@@unique([expenseId, memberId])` - 確保成員在支出中唯一

---

### ActivityLog (活動記錄)

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵，自動產生 |
| `projectId` | UUID | 所屬專案 ID |
| `actorMemberId` | UUID? | 執行者成員 ID |
| `entityType` | String | 實體類型: `expense`, `project`, `member` |
| `entityId` | UUID | 實體 ID |
| `action` | String | 動作: `create`, `update`, `delete` |
| `changes` | JSON? | 變更前後差異 |
| `metadata` | JSON? | 實體快照資訊 |
| `createdAt` | DateTime | 建立時間 |

## 設計特點

### 軟刪除 (Soft Delete)
支出記錄使用 `deletedAt` 欄位實作軟刪除，保留歷史記錄用於審計追蹤。

### 佔位成員 (Placeholder Members)
`ProjectMember.userId` 可為 null，允許先以名稱新增成員，之後再由實際使用者認領。

### 多幣別支援
- 每筆支出可獨立設定幣別
- 專案可設定結算幣別
- 支援自訂匯率

### JSON 欄位
- `mileageData` - 儲存里程計算相關資料
- `customRates` - 儲存專案自訂匯率
- `changes` - 儲存活動記錄的變更差異
- `metadata` - 儲存活動記錄的實體快照

## 資料庫指令

```bash
# 產生 Prisma Client
npm run db:generate

# 執行資料庫遷移 (開發環境)
npm run db:migrate

# 重置資料庫
npm run db:reset

# 開啟 Prisma Studio GUI
npm run db:studio

# 推送結構變更 (不產生遷移檔)
npm run db:push
```
