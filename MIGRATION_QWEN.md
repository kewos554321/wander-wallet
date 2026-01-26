# Gemini → Qwen Vision 遷移完成

## 🎉 遷移成功

已成功將發票辨識功能從 **Gemini 2.0 Flash** 遷移到 **Qwen3-VL-Flash**（最便宜的 vision 模型）

## 📊 成本節省

| 項目 | Gemini 2.0 Flash | Qwen3-VL-Flash | 節省 |
|------|-----------------|----------------|------|
| **Input** | $0.10/1M tokens | $0.075/1M tokens | **25%** |
| **Output** | $0.40/1M tokens | $0.42/1M tokens | -5% |
| **整體預估** | - | - | **~20-24%** |

**選擇理由：**
- Qwen3-VL-Flash 是 Qwen 系列中最便宜的 vision 模型
- 對於發票辨識這個主要消耗 input tokens 的場景，預估可節省 **20-24%** 成本
- 速度更快，適合大量發票處理

## ✅ 完成項目

### 1. 新增 Qwen 整合
- ✅ `lib/ai/qwen.ts` - Qwen model factory
- ✅ 配置國際版 endpoint: `dashscope-intl.aliyuncs.com`
- ✅ 使用 `qwen3-vl-flash` 模型（最便宜的 vision 模型）

### 2. 更新發票解析器
- ✅ `lib/ai/receipt-parser.ts` - 從 Gemini 切換到 Qwen
- ✅ `app/api/receipt/parse/route.ts` - 更新註解

### 3. 更新測試
- ✅ `tests/lib/receipt-parser.test.ts` - 更新 mock
- ✅ `tests/lib/receipt-parser.integration.test.ts` - 切換到 Qwen
- ✅ **所有測試通過** (25/25)

### 4. 移除 Gemini
- ✅ 刪除 `lib/ai/gemini.ts`
- ✅ 刪除 `tests/lib/gemini-api.test.ts`
- ✅ 移除 `@langchain/google-genai` 依賴
- ✅ 更新 `.env.example`

### 5. 更新文檔
- ✅ `.claude/docs/business/ai-features.md`
- ✅ 更新 API 註解

## 🧪 測試驗證

### 單元測試
```bash
npm run test:run -- tests/lib/receipt-parser.test.ts
```
**結果**: ✅ 20/20 passed

### 整合測試
```bash
npm run test:run -- tests/lib/receipt-parser.integration.test.ts
```
**結果**: ✅ 5/5 passed

### 實際解析結果
Qwen 成功解析測試收據：
```json
{
  "amount": 150,
  "description": "全家便利商店",
  "category": "shopping",
  "date": "2023-05-15",
  "confidence": 0.9
}
```

## 🔑 環境變數設定

確保 `.env` 檔案包含：

```bash
# Qwen API Key (國際版)
QWEN_API_KEY=sk-你的API密鑰

# 不再需要
# GEMINI_API_KEY=...
```

### 取得 Qwen API Key
1. 訪問：https://dashscope.console.aliyun.com/apiKey
2. 創建新的 API Key
3. 確保使用**國際版**（非中國站）
4. 複製 API Key（以 `sk-` 開頭）

## 📝 技術細節

### Qwen 配置
- **Base URL**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- **Model**: `qwen3-vl-flash` (最便宜的 vision 模型)
- **溫度**: 0.1
- **Max Tokens**: 512
- **最小圖片尺寸**: 10x10 pixels
- **定價**: $0.075/1M input, $0.42/1M output

### API 相容性
Qwen 使用 OpenAI-compatible API，透過 `@langchain/openai` 的 `ChatOpenAI` 整合。

## 🚀 部署注意事項

1. **更新環境變數**：在生產環境設定 `QWEN_API_KEY`
2. **測試發票辨識**：上傳真實發票測試功能
3. **監控成本**：追蹤 Qwen API 使用量
4. **錯誤處理**：Qwen 錯誤訊息格式與 Gemini 相同

## 📚 相關文件

- [Qwen API 文檔](https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/)
- [OpenAI 相容模式](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope)
- [LangChain OpenAI 整合](https://docs.langchain.com/oss/javascript/integrations/chat/openai)

## 🎯 下一步

1. ✅ 遷移完成
2. ✅ 測試通過
3. 🔄 監控生產環境表現
4. 📊 追蹤實際成本節省

---

**遷移日期**: 2026-01-26
**測試狀態**: ✅ 全部通過
**功能狀態**: ✅ 正常運作
