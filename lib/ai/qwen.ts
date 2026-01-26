import { ChatOpenAI } from "@langchain/openai"

/**
 * 建立 Qwen Chat Model
 * 使用 Qwen3-VL-Flash 模型透過 DashScope OpenAI-compatible API
 *
 * 價格: $0.075/1M input tokens, $0.42/1M output tokens
 * 比 qwen-vl-plus 便宜，適合大量發票辨識場景
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
    model: "qwen3-vl-flash",
    temperature: options?.temperature ?? 0.1,
    maxTokens: options?.maxOutputTokens ?? 1024,
  })
}
