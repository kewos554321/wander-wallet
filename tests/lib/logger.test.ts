import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("lib/logger", () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, "debug").mockImplementation(() => {})
    vi.spyOn(console, "info").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
  })

  describe("logger in development", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "development"
      vi.resetModules()
    })

    it("should output debug logs in development", async () => {
      const { logger } = await import("@/lib/logger")

      logger.debug("debug message")

      expect(console.debug).toHaveBeenCalled()
      const output = vi.mocked(console.debug).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.level).toBe("debug")
      expect(parsed.message).toBe("debug message")
    })

    it("should include context in logs", async () => {
      const { logger } = await import("@/lib/logger")

      logger.info("info message", { userId: "user-123", path: "/api/test" })

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.context.userId).toBe("user-123")
      expect(parsed.context.path).toBe("/api/test")
    })

    it("should include timestamp in logs", async () => {
      const { logger } = await import("@/lib/logger")

      logger.info("test message")

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.timestamp).toBeDefined()
      // Should be ISO format
      expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp)
    })

    it("should format Error objects properly", async () => {
      const { logger } = await import("@/lib/logger")

      const testError = new Error("Test error message")
      testError.name = "TestError"

      logger.error("error occurred", {}, testError)

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error.name).toBe("TestError")
      expect(parsed.error.message).toBe("Test error message")
      // Stack should be included in development
      expect(parsed.error.stack).toBeDefined()
    })

    it("should handle error objects without stack", async () => {
      const { logger } = await import("@/lib/logger")

      const errorObj = { message: "Custom error", code: "E001" }

      logger.warn("warning", {}, errorObj)

      expect(console.warn).toHaveBeenCalled()
      const output = vi.mocked(console.warn).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error.message).toBe("Custom error")
      expect(parsed.error.code).toBe("E001")
    })

    it("should handle primitive error values", async () => {
      const { logger } = await import("@/lib/logger")

      logger.error("error", {}, "string error")

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error.message).toBe("string error")
      expect(parsed.error.name).toBe("UnknownError")
    })

    it("should not include context when empty", async () => {
      const { logger } = await import("@/lib/logger")

      logger.info("simple message")

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.context).toBeUndefined()
    })
  })

  describe("logger in production", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "production"
      vi.resetModules()
    })

    it("should not output debug logs in production", async () => {
      const { logger } = await import("@/lib/logger")

      logger.debug("debug message")

      expect(console.debug).not.toHaveBeenCalled()
    })

    it("should output info logs in production", async () => {
      const { logger } = await import("@/lib/logger")

      logger.info("info message")

      expect(console.info).toHaveBeenCalled()
    })

    it("should not include stack trace in production", async () => {
      const { logger } = await import("@/lib/logger")

      const testError = new Error("Test error")

      logger.error("error", {}, testError)

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error.stack).toBeUndefined()
    })
  })

  describe("generateRequestId", () => {
    it("should generate unique request IDs", async () => {
      const { generateRequestId } = await import("@/lib/logger")

      const id1 = generateRequestId()
      const id2 = generateRequestId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/)
    })
  })

  describe("createApiLogger", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "development"
      vi.resetModules()
    })

    it("should create logger with request context", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("POST", "/api/test", "user-123")

      apiLogger.info("test message")

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.context.method).toBe("POST")
      expect(parsed.context.path).toBe("/api/test")
      expect(parsed.context.userId).toBe("user-123")
      expect(parsed.context.requestId).toBeDefined()
    })

    it("should have requestId property", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("GET", "/api/test")

      expect(apiLogger.requestId).toBeDefined()
      expect(apiLogger.requestId).toMatch(/^req_/)
    })

    it("should log start message", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("GET", "/api/users")
      apiLogger.start()

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.message).toBe("GET /api/users 開始")
    })

    it("should log success message with status code", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("POST", "/api/projects")
      apiLogger.success(201, { projectId: "proj-123" })

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.message).toBe("POST /api/projects 完成")
      expect(parsed.context.statusCode).toBe(201)
      expect(parsed.context.projectId).toBe("proj-123")
    })

    it("should log fail message with error", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("DELETE", "/api/projects/123")
      const error = new Error("Not found")
      apiLogger.fail(404, "Project not found", error)

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.message).toBe("DELETE /api/projects/123 失敗: Project not found")
      expect(parsed.context.statusCode).toBe(404)
      expect(parsed.error.message).toBe("Not found")
    })

    it("should merge extra context with base context", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("GET", "/api/test")
      apiLogger.debug("debug message", { customField: "value" })

      expect(console.debug).toHaveBeenCalled()
      const output = vi.mocked(console.debug).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.context.method).toBe("GET")
      expect(parsed.context.customField).toBe("value")
    })

    it("should support warn method with error", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("PUT", "/api/test")
      apiLogger.warn("warning message", { extra: "data" }, new Error("warn error"))

      expect(console.warn).toHaveBeenCalled()
      const output = vi.mocked(console.warn).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.message).toBe("warning message")
      expect(parsed.error).toBeDefined()
    })

    it("should work without userId", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("GET", "/api/public")
      apiLogger.info("public endpoint")

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.context.userId).toBeUndefined()
    })

    it("should default success status code to 200", async () => {
      const { createApiLogger } = await import("@/lib/logger")

      const apiLogger = createApiLogger("GET", "/api/test")
      apiLogger.success()

      expect(console.info).toHaveBeenCalled()
      const output = vi.mocked(console.info).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.context.statusCode).toBe(200)
    })
  })

  describe("error handling edge cases", () => {
    beforeEach(async () => {
      process.env.NODE_ENV = "development"
      vi.resetModules()
    })

    it("should handle null error", async () => {
      const { logger } = await import("@/lib/logger")

      logger.error("error message", {}, null)

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error).toBeUndefined()
    })

    it("should handle undefined error", async () => {
      const { logger } = await import("@/lib/logger")

      logger.error("error message", {}, undefined)

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error).toBeUndefined()
    })

    it("should handle Error with code property", async () => {
      const { logger } = await import("@/lib/logger")

      const error = new Error("Database error") as Error & { code: string }
      error.code = "P2002"

      logger.error("db error", {}, error)

      expect(console.error).toHaveBeenCalled()
      const output = vi.mocked(console.error).mock.calls[0][0]
      const parsed = JSON.parse(output)
      expect(parsed.error.code).toBe("P2002")
    })
  })
})
