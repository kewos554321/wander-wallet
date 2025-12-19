# Wander Wallet - 功能清單

---

## AI 語音記帳功能

**狀態**: ✅ 已完成
**優先級**: 高
**入口**: 專案頁面右下角麥克風按鈕

### 一、功能範圍

| 功能 | 說明 |
|------|------|
| 文字輸入 | 直接輸入消費描述，如「午餐吃拉麵 280 元」 |
| 語音輸入 | 使用 Web Speech API 語音轉文字 |
| AI 解析 | 使用 Gemini Flash + LangChain 解析費用內容 |
| 結構化輸出 | 自動提取金額、描述、類別、付款人、分擔者 |
| 確認編輯 | 解析結果可編輯後再儲存 |

### 二、技術架構

```
lib/ai/
├── gemini.ts          # Gemini 模型初始化
└── expense-parser.ts  # 費用解析 Chain（Zod Schema + Prompt）

lib/
└── speech.ts          # Web Speech API Hook

components/voice/
└── voice-expense-dialog.tsx  # 語音記帳 Dialog

app/api/voice/parse/
└── route.ts           # AI 解析 API
```

### 三、使用的技術

| 技術 | 用途 |
|------|------|
| Web Speech API | 瀏覽器原生語音轉文字（免費） |
| LangChain | AI 應用框架 |
| @langchain/google-genai | Gemini 整合 |
| Zod | Schema 驗證 + 結構化輸出 |
| Gemini 2.0 Flash | AI 模型（有免費額度） |

### 四、LangChain 實作細節

```typescript
// Zod Schema 定義結構化輸出
const ParsedExpenseSchema = z.object({
  amount: z.number(),
  description: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  payerName: z.string(),
  participantNames: z.array(z.string()),
  splitMode: z.enum(["equal", "custom"]),
  confidence: z.number().min(0).max(1),
})

// 建立 Chain
const model = createGeminiModel()
const structuredModel = model.withStructuredOutput(ParsedExpenseSchema)
const chain = EXPENSE_PARSER_PROMPT.pipe(structuredModel)
```

### 五、環境變數

```env
GEMINI_API_KEY=your_api_key_here
```

### 六、未來擴展

- [ ] 加入 Memory 記住用戶消費習慣
- [ ] 加入 Tools 讓 AI 查詢即時匯率
- [ ] 加入 RAG 讀取歷史消費資料
- [ ] 支援多語言語音辨識

---

## 幣種轉換功能

**狀態**: 待實作
**優先級**: 中
**頁面**: `/projects/[id]/currency`

### 一、功能範圍

| 功能 | 說明 |
|------|------|
| 專案預設幣別 | 每個專案可設定主要結算幣別（如 TWD） |
| 支出幣別記錄 | 每筆支出可選擇不同幣別（如 JPY、USD） |
| 即時匯率查詢 | 整合匯率 API 取得當前匯率 |
| 自動換算顯示 | 將所有支出換算為專案預設幣別顯示 |
| 手動匯率輸入 | 使用者可手動輸入當時匯率 |

### 二、資料庫變更

```prisma
// Project 新增欄位
model Project {
  ...
  defaultCurrency String @default("TWD") @map("default_currency") // 預設幣別
}

// Expense 新增欄位
model Expense {
  ...
  currency        String  @default("TWD")           // 支出幣別
  exchangeRate    Decimal? @db.Decimal(12, 6)       // 匯率（轉換至專案幣別）
  originalAmount  Decimal  @db.Decimal(10, 2)       // 原始金額
  // amount 欄位改為：換算後金額（專案幣別）
}
```

### 三、API 變更

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/exchange-rate` | GET | 取得即時匯率（from, to 參數） |
| `/api/projects/[id]` | PUT | 新增 defaultCurrency 更新 |
| `/api/projects/[id]/expenses` | POST/PUT | 處理幣別、匯率、金額換算 |

### 四、前端頁面變更

#### 4.1 幣種頁面 (`/projects/[id]/currency`)
- 顯示專案預設幣別設定
- 幣別選擇器（TWD、USD、JPY、EUR、CNY 等）
- 快速匯率換算計算機
- 顯示目前匯率資訊

#### 4.2 支出表單 (`expense-form.tsx`)
- 新增幣別選擇下拉選單
- 當選擇非預設幣別時，顯示匯率輸入欄位
- 自動帶入即時匯率（可手動修改）
- 顯示換算後金額預覽

#### 4.3 支出列表 (`expenses/page.tsx`)
- 顯示原始幣別和金額
- 顯示換算後金額（專案幣別）

#### 4.4 結算頁面 (`settle/page.tsx`)
- 所有金額以專案預設幣別計算

### 五、支援幣別清單

```typescript
const CURRENCIES = [
  { code: "TWD", name: "新台幣", symbol: "NT$", flag: "🇹🇼" },
  { code: "USD", name: "美元", symbol: "$", flag: "🇺🇸" },
  { code: "JPY", name: "日圓", symbol: "¥", flag: "🇯🇵" },
  { code: "EUR", name: "歐元", symbol: "€", flag: "🇪🇺" },
  { code: "CNY", name: "人民幣", symbol: "¥", flag: "🇨🇳" },
  { code: "KRW", name: "韓元", symbol: "₩", flag: "🇰🇷" },
  { code: "HKD", name: "港幣", symbol: "HK$", flag: "🇭🇰" },
  { code: "GBP", name: "英鎊", symbol: "£", flag: "🇬🇧" },
  { code: "THB", name: "泰銖", symbol: "฿", flag: "🇹🇭" },
  { code: "SGD", name: "新加坡幣", symbol: "S$", flag: "🇸🇬" },
]
```

### 六、匯率 API 選項

| 服務 | 免費額度 | 備註 |
|------|----------|------|
| ExchangeRate-API | 1,500 次/月 | 推薦，簡單易用 |
| Open Exchange Rates | 1,000 次/月 | 需註冊 |
| Fixer.io | 100 次/月 | 額度較少 |

### 七、實作順序建議

- [ ] **Phase 1 - 資料庫與 API**
  - [ ] 更新 Prisma schema
  - [ ] 建立匯率 API route
  - [ ] 更新專案/支出 API

- [ ] **Phase 2 - 幣種設定頁面**
  - [ ] 實作幣別選擇器元件
  - [ ] 實作專案預設幣別設定
  - [ ] 匯率計算機功能

- [ ] **Phase 3 - 支出表單整合**
  - [ ] 新增幣別選擇
  - [ ] 整合即時匯率
  - [ ] 金額換算邏輯

- [ ] **Phase 4 - 顯示與結算**
  - [ ] 更新支出列表顯示
  - [ ] 更新統計與結算計算

---

## 收據圖片 AI 分析功能

**狀態**: 待實作
**優先級**: 中
**入口**: 專案頁面（與語音記帳整合或獨立按鈕）

### 一、功能範圍

| 功能 | 說明 |
|------|------|
| 拍照上傳 | 使用相機拍攝收據或從相簿選擇圖片 |
| AI 圖片解析 | 使用視覺 AI 模型分析收據內容 |
| 結構化輸出 | 自動提取金額、店家名稱、類別、日期 |
| 確認編輯 | 解析結果可編輯後再儲存 |

### 二、技術架構

```
lib/ai/
├── gemini.ts              # 修改：初始化視覺模型
├── expense-parser.ts      # 修改：新增圖片解析函數
└── image-utils.ts         # 新增：圖片處理工具（壓縮、base64 轉換）

components/
├── voice/
│   └── voice-expense-dialog.tsx  # 修改：加入拍照/上傳按鈕
└── camera/
    └── camera-capture.tsx        # 新增：相機拍照組件

app/api/receipt/parse/
└── route.ts               # 新增：收據解析 API
```

### 三、視覺模型選擇

**推薦方案：Gemini 2.0 Flash**

| 選項 | 優點 | 缺點 |
|------|------|------|
| **Gemini 2.0 Flash** (推薦) | 已有整合、免費額度高、支援視覺 | 需設定 API Key |
| OpenAI GPT-4o | 視覺能力強 | 需新增依賴、成本較高 |
| DeepSeek VL | 與現有模型同廠 | 需等待 LangChain 支援 |

> ⚠️ 注意：目前使用的 DeepSeek V3 **不支援視覺**，需切換到 Gemini

### 四、LangChain 視覺 API 實作

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
});

const result = await model.invoke([
  new HumanMessage({
    content: [
      { type: "text", text: "從這張收據中提取費用資訊..." },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
    ]
  })
]);
```

### 五、圖片解析 Prompt 設計

```
你是一個收據解析助手。請從這張收據/帳單圖片中提取以下資訊：

1. **總金額**：數字，忽略貨幣符號
2. **店家名稱/描述**：簡短概括，10 字以內
3. **消費類別**：從以下選項中選擇
   - food（餐飲）
   - transport（交通）
   - accommodation（住宿）
   - ticket（門票）
   - shopping（購物）
   - entertainment（娛樂）
   - gift（禮品）
   - other（其他）
4. **日期**：如果可見，格式 YYYY-MM-DD
5. **明細項目**：如果清晰可見，列出各項目和金額

如果某些資訊無法辨識，請標註為 null。
```

### 六、前端實作細節

#### 6.1 相機拍照功能

```typescript
// 方案 A：使用 input file（簡單，推薦）
<input
  type="file"
  accept="image/*"
  capture="environment"  // 使用後鏡頭
  onChange={handleImageCapture}
/>

// 方案 B：使用 MediaDevices API（自訂 UI）
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" }
});
```

#### 6.2 圖片壓縮

```typescript
// 使用 Canvas 壓縮圖片
function compressImage(file: File, maxSize: number = 1024): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 計算縮放比例
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.src = URL.createObjectURL(file);
  });
}
```

### 七、實作順序

- [ ] **Phase 1 - 基礎設施**
  - [ ] 確認 `GEMINI_API_KEY` 環境變數已設定
  - [ ] 修改 `gemini.ts` 確保視覺模型正確初始化
  - [ ] 新增 `lib/ai/image-utils.ts` 圖片處理工具

- [ ] **Phase 2 - 後端 API**
  - [ ] 新增 `lib/ai/receipt-parser.ts` 收據解析邏輯
  - [ ] 新增 `/api/receipt/parse` API route
  - [ ] 定義 Zod Schema 和結構化輸出

- [ ] **Phase 3 - 前端組件**
  - [ ] 新增相機拍照/上傳組件
  - [ ] 圖片預覽功能
  - [ ] 圖片壓縮與 base64 轉換

- [ ] **Phase 4 - 整合與測試**
  - [ ] 整合到現有 `voice-expense-dialog.tsx` 或獨立入口
  - [ ] 解析結果對接現有費用編輯流程
  - [ ] 測試不同類型收據（發票、明細、手寫）

### 八、待討論問題

- [ ] **拍照入口位置**：要放在現有語音對話框內，還是獨立的按鈕？
- [ ] **支援圖片類型**：只支援拍照，還是也要支援從相簿選擇？
- [ ] **多張圖片**：是否需要一次解析多張收據？
- [ ] **雲端存儲**：圖片是否需要保存？還是只解析後丟棄？

---
