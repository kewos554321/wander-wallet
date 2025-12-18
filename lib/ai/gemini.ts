import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

/**
 * 建立 Gemini Chat Model
 * 使用 Gemini 2.0 Flash 模型
 */
export function createGeminiModel(options?: {
  temperature?: number
  maxOutputTokens?: number
}) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 環境變數未設定")
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.0-flash",
    temperature: options?.temperature ?? 0.1,
    maxOutputTokens: options?.maxOutputTokens ?? 1024,
  })
}
