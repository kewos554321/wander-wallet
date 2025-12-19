import { ChatDeepSeek } from "@langchain/deepseek"

/**
 * 建立 DeepSeek Chat Model
 * 使用 DeepSeek V3 模型（性價比最高）
 */
export function createDeepSeekModel(options?: {
  temperature?: number
  maxTokens?: number
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 環境變數未設定")
  }

  return new ChatDeepSeek({
    apiKey,
    model: "deepseek-chat", // DeepSeek V3
    temperature: options?.temperature ?? 0.1,
    maxTokens: options?.maxTokens ?? 1024,
  })
}
