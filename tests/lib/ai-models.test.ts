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

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class MockChatOpenAI {
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    configuration: { baseURL?: string }
    modelKwargs: Record<string, unknown>
    constructor(config: {
      apiKey: string
      model: string
      temperature: number
      maxTokens: number
      configuration?: { baseURL?: string }
      modelKwargs?: Record<string, unknown>
    }) {
      this.apiKey = config.apiKey
      this.model = config.model
      this.temperature = config.temperature
      this.maxTokens = config.maxTokens
      this.configuration = config.configuration ?? {}
      this.modelKwargs = config.modelKwargs ?? {}
    }
  },
}))

describe("lib/ai models", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key"
    process.env.QWEN_API_KEY = "test-qwen-key"
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("createQwenModel", () => {
    it("should use qwen3.7-flash model", async () => {
      const { createQwenModel } = await import("@/lib/ai/qwen")

      const model = createQwenModel()

      expect(model.model).toBe("qwen3.7-flash")
      expect(model.modelKwargs).toEqual({ enable_thinking: false })
    })
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
})
