# API 路由說明

## 基礎資訊

- **Base URL**: `/api`
- **認證方式**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`

## 回應格式

### 成功回應
```json
{
  "success": true,
  "data": { ... }
}
```

### 錯誤回應
```json
{
  "success": false,
  "error": "錯誤訊息"
}
```

## API 端點總覽

### 認證 (Authentication)

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/liff` | LINE LIFF 登入 |

---

### 專案 (Projects)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects` | 取得使用者的專案列表 |
| POST | `/api/projects` | 建立新專案 |
| GET | `/api/projects/[id]` | 取得專案詳情 |
| PATCH | `/api/projects/[id]` | 更新專案 |
| DELETE | `/api/projects/[id]` | 刪除專案 (僅建立者) |
| POST | `/api/projects/join` | 透過分享碼加入專案 |

---

### 專案成員 (Members)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/[id]/members` | 取得專案成員列表 |
| POST | `/api/projects/[id]/members` | 新增成員 |
| DELETE | `/api/projects/[id]/members` | 移除成員 |
| POST | `/api/projects/[id]/members/claim` | 認領佔位成員 |

---

### 支出 (Expenses)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/[id]/expenses` | 取得支出列表 |
| POST | `/api/projects/[id]/expenses` | 新增支出 |
| GET | `/api/projects/[id]/expenses/[expenseId]` | 取得支出詳情 |
| PATCH | `/api/projects/[id]/expenses/[expenseId]` | 更新支出 |
| DELETE | `/api/projects/[id]/expenses/[expenseId]` | 刪除支出 |
| POST | `/api/projects/[id]/expenses/batch` | 批次刪除支出 |

---

### 結算 (Settlement)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/[id]/settle` | 計算結算方案 |

---

### 活動記錄 (Activity Logs)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/[id]/activity-logs` | 取得活動記錄 |

---

### 備忘錄 (Memo)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/[id]/memo` | 取得專案備忘錄 |
| PUT | `/api/projects/[id]/memo` | 更新專案備忘錄 |

---

### 里程 (Mileage)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/[id]/mileage` | 取得里程資料 |
| PUT | `/api/projects/[id]/mileage` | 更新里程資料 |

---

### 使用者 (Users)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/users` | 取得當前使用者資訊 |
| PATCH | `/api/users` | 更新使用者資訊 |
| GET | `/api/users/profile` | 取得使用者個人資料 |
| PATCH | `/api/users/profile` | 更新使用者個人資料 |

---

### 外部服務 (External Services)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/exchange-rates` | 取得匯率資訊 |
| GET | `/api/fuel-price` | 取得油價資訊 |
| GET | `/api/geocode` | 反向地理編碼 |

---

### AI 功能 (AI Features)

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/voice/parse` | 語音支出解析 |
| POST | `/api/receipt/parse` | 發票圖片辨識 |

---

### 檔案上傳 (Upload)

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/upload` | 上傳檔案至 R2 |
| POST | `/api/upload/direct` | 取得 R2 預簽署 URL |

---

## 詳細說明

### POST /api/auth/liff

LINE LIFF 登入認證。

**Request Body:**
```json
{
  "accessToken": "LINE LIFF Access Token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "JWT Session Token",
    "user": {
      "id": "uuid",
      "name": "使用者名稱",
      "image": "頭像 URL"
    }
  }
}
```

---

### POST /api/projects

建立新專案。

**Request Body:**
```json
{
  "name": "專案名稱",
  "description": "專案描述",
  "cover": "preset:1",
  "budget": 50000,
  "currency": "TWD",
  "startDate": "2025-01-01",
  "endDate": "2025-01-07"
}
```

---

### POST /api/projects/[id]/expenses

新增支出。

**Request Body:**
```json
{
  "amount": 1000,
  "currency": "TWD",
  "description": "午餐",
  "category": "food",
  "paidByMemberId": "uuid",
  "participantIds": ["uuid1", "uuid2"],
  "expenseDate": "2025-01-01T12:00:00Z",
  "location": "台北市信義區",
  "latitude": 25.0330,
  "longitude": 121.5654,
  "image": "data:image/jpeg;base64,..."
}
```

---

### GET /api/projects/[id]/settle

計算結算方案，回傳最佳化的還款建議。

**Response:**
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "from": {
          "id": "uuid",
          "displayName": "成員 A"
        },
        "to": {
          "id": "uuid",
          "displayName": "成員 B"
        },
        "amount": 500,
        "currency": "TWD"
      }
    ],
    "balances": [
      {
        "member": { "id": "uuid", "displayName": "成員 A" },
        "balance": -500
      },
      {
        "member": { "id": "uuid", "displayName": "成員 B" },
        "balance": 500
      }
    ]
  }
}
```

---

### POST /api/voice/parse

使用 AI 解析語音/文字輸入的支出描述。

**Request Body:**
```json
{
  "text": "昨天午餐吃了拉麵 280 元",
  "memberNames": ["小明", "小華", "小美"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amount": 280,
    "description": "拉麵",
    "category": "food",
    "date": "2025-01-04",
    "payer": "小明",
    "participants": ["小明", "小華", "小美"]
  }
}
```

---

### POST /api/receipt/parse

使用 AI 辨識發票/收據圖片。

**Request Body:**
```json
{
  "imageUrl": "https://r2.example.com/receipts/xxx.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amount": 1280,
    "description": "全聯福利中心",
    "category": "shopping",
    "date": "2025-01-05",
    "confidence": 0.95
  }
}
```

## 錯誤代碼

| HTTP Status | 說明 |
|-------------|------|
| 400 | 請求參數錯誤 |
| 401 | 未認證或 Token 無效 |
| 403 | 權限不足 |
| 404 | 資源不存在 |
| 500 | 伺服器內部錯誤 |

## 權限說明

### 專案存取
- 只有專案成員可以存取專案資源
- 專案建立者 (owner) 擁有完整管理權限

### Owner 專屬操作
- 刪除專案
- 移除成員
- 變更專案設定

### Member 權限
- 檢視專案資訊
- 新增/編輯/刪除自己的支出
- 認領佔位成員
