import { ChatOpenAI } from "@langchain/openai"

/**
 * 建立 Qwen Chat Model
 * 使用 Qwen3.7-Flash 模型透過 DashScope OpenAI-compatible API
 *
 * 價格: $0.030/1M input tokens, $0.130/1M output tokens (≤32K, 新加坡)
 * 原生支援圖片輸入，適合大量發票辨識場景
 */
export function createQwenModel(options?: {
  temperature?: number
  maxOutputTokens?: number
}) {
  const apiKey = process.env.QWEN_API_KEY

  if (!apiKey) {
    throw new Error("QWEN_API_KEY 環境變數未設定")
  }

  return new ChatOpenAI({
    apiKey,
    configuration: {
      baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    },
    model: "qwen3.7-flash",
    temperature: options?.temperature ?? 0.1,
    maxTokens: options?.maxOutputTokens ?? 1024,
    // 收據解析不需要思考過程，關閉 thinking 可降低延遲與 output token 成本
    modelKwargs: { enable_thinking: false },
  })
}
