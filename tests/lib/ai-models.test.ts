import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock langchain modules
vi.mock("@langchain/deepseek", () => ({
  ChatDeepSeek: class MockChatDeepSeek {
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    constructor(config: { apiKey: string; model: string; temperature: number; maxTokens: number }) {
      this.apiKey = config.apiKey
      this.model = config.model
      this.temperature = config.temperature
      this.maxTokens = config.maxTokens
    }
  },
}))

vi.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: class MockChatGoogleGenerativeAI {
    apiKey: string
    model: string
    temperature: number
    maxOutputTokens: number
    constructor(config: { apiKey: string; model: string; temperature: number; maxOutputTokens: number }) {
      this.apiKey = config.apiKey
      this.model = config.model
      this.temperature = config.temperature
      this.maxOutputTokens = config.maxOutputTokens
    }
  },
}))

describe("lib/ai models", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key"
    process.env.GEMINI_API_KEY = "test-gemini-key"
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("createDeepSeekModel", () => {
    it("should create DeepSeek model with default options", async () => {
      const { createDeepSeekModel } = await import("@/lib/ai/deepseek")

      const model = createDeepSeekModel()

      expect(model).toBeDefined()
      expect(model.apiKey).toBe("test-deepseek-key")
      expect(model.model).toBe("deepseek-chat")
      expect(model.temperature).toBe(0.1)
      expect(model.maxTokens).toBe(1024)
    })

    it("should create DeepSeek model with custom options", async () => {
      const { createDeepSeekModel } = await import("@/lib/ai/deepseek")

      const model = createDeepSeekModel({
        temperature: 0.7,
        maxTokens: 2048,
      })

      expect(model.temperature).toBe(0.7)
      expect(model.maxTokens).toBe(2048)
    })

    it("should throw error when API key is missing", async () => {
      delete process.env.DEEPSEEK_API_KEY
      vi.resetModules()

      const { createDeepSeekModel } = await import("@/lib/ai/deepseek")

      expect(() => createDeepSeekModel()).toThrow("DEEPSEEK_API_KEY 環境變數未設定")
    })
  })

  describe("createGeminiModel", () => {
    it("should create Gemini model with default options", async () => {
      const { createGeminiModel } = await import("@/lib/ai/gemini")

      const model = createGeminiModel()

      expect(model).toBeDefined()
      expect(model.apiKey).toBe("test-gemini-key")
      expect(model.model).toBe("gemini-2.0-flash")
      expect(model.temperature).toBe(0.1)
      expect(model.maxOutputTokens).toBe(1024)
    })

    it("should create Gemini model with custom options", async () => {
      const { createGeminiModel } = await import("@/lib/ai/gemini")

      const model = createGeminiModel({
        temperature: 0.5,
        maxOutputTokens: 4096,
      })

      expect(model.temperature).toBe(0.5)
      expect(model.maxOutputTokens).toBe(4096)
    })

    it("should throw error when API key is missing", async () => {
      delete process.env.GEMINI_API_KEY
      vi.resetModules()

      const { createGeminiModel } = await import("@/lib/ai/gemini")

      expect(() => createGeminiModel()).toThrow("GEMINI_API_KEY 環境變數未設定")
    })
  })
})
