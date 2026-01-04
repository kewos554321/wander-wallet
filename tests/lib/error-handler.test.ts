import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"
import {
  isPrismaError,
  handlePrismaError,
  extractPrismaErrorInfo,
  withErrorHandler,
  PrismaErrorCodes,
} from "@/lib/error-handler"
import { Prisma } from "@prisma/client"

// 創建模擬 Prisma 錯誤
function createPrismaError(
  code: string,
  message: string = "Prisma error",
  meta?: Record<string, unknown>
): Prisma.PrismaClientKnownRequestError {
  const error = new Error(message) as Prisma.PrismaClientKnownRequestError
  Object.assign(error, {
    code,
    clientVersion: "5.0.0",
    meta,
    name: "PrismaClientKnownRequestError",
  })
  return error
}

describe("isPrismaError", () => {
  it("should return true for PrismaClientKnownRequestError", () => {
    const error = createPrismaError("P2002")

    expect(isPrismaError(error)).toBe(true)
  })

  it("should return false for regular Error", () => {
    const error = new Error("Regular error")

    expect(isPrismaError(error)).toBe(false)
  })

  it("should return false for null", () => {
    expect(isPrismaError(null)).toBe(false)
  })

  it("should return false for undefined", () => {
    expect(isPrismaError(undefined)).toBe(false)
  })

  it("should return false for non-error objects", () => {
    expect(isPrismaError({ message: "error" })).toBe(false)
    expect(isPrismaError("string error")).toBe(false)
    expect(isPrismaError(123)).toBe(false)
  })

  it("should return false for objects with only code (missing clientVersion)", () => {
    const fakeError = { code: "P2002" }

    expect(isPrismaError(fakeError)).toBe(false)
  })
})

describe("extractPrismaErrorInfo", () => {
  it("should extract code, message, and meta from Prisma error", () => {
    const error = createPrismaError("P2002", "Unique constraint failed", {
      target: ["email"],
    })
    const info = extractPrismaErrorInfo(error)

    expect(info).toEqual({
      code: "P2002",
      message: "Unique constraint failed",
      meta: { target: ["email"] },
    })
  })

  it("should return null for non-Prisma errors", () => {
    const error = new Error("Regular error")

    expect(extractPrismaErrorInfo(error)).toBe(null)
  })

  it("should return null for null input", () => {
    expect(extractPrismaErrorInfo(null)).toBe(null)
  })
})

describe("handlePrismaError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  describe("P2002 - Unique constraint violation", () => {
    it("should return 409 status", async () => {
      const error = createPrismaError("P2002", "Unique constraint failed")
      const response = handlePrismaError(error)

      expect(response.status).toBe(409)
    })

    it("should use custom message when provided", async () => {
      const error = createPrismaError("P2002")
      const response = handlePrismaError(error, {
        customMessages: { P2002: "此分享碼已存在" },
      })
      const json = await response.json()

      expect(json.error.message).toBe("此分享碼已存在")
    })

    it("should use default message when not provided", async () => {
      const error = createPrismaError("P2002")
      const response = handlePrismaError(error)
      const json = await response.json()

      expect(json.error.message).toBe("記錄已存在")
    })

    it("should include resource name in message", async () => {
      const error = createPrismaError("P2002")
      const response = handlePrismaError(error, { resource: "專案" })
      const json = await response.json()

      expect(json.error.message).toBe("專案已存在")
    })

    it("should include error code in response", async () => {
      const error = createPrismaError("P2002")
      const response = handlePrismaError(error)
      const json = await response.json()

      expect(json.error.code).toBe("P2002")
    })
  })

  describe("P2003 - Foreign key constraint failure", () => {
    it("should return 400 status", async () => {
      const error = createPrismaError("P2003")
      const response = handlePrismaError(error)

      expect(response.status).toBe(400)
    })

    it("should use custom message when provided", async () => {
      const error = createPrismaError("P2003")
      const response = handlePrismaError(error, {
        customMessages: { P2003: "用戶記錄不存在" },
      })
      const json = await response.json()

      expect(json.error.message).toBe("用戶記錄不存在")
    })

    it("should indicate related record not found", async () => {
      const error = createPrismaError("P2003")
      const response = handlePrismaError(error)
      const json = await response.json()

      expect(json.error.message).toBe("關聯的記錄不存在")
    })
  })

  describe("P2022 - Column does not exist", () => {
    it("should return 500 status", async () => {
      const error = createPrismaError("P2022")
      const response = handlePrismaError(error)

      expect(response.status).toBe(500)
    })

    it("should suggest running migrations", async () => {
      const error = createPrismaError("P2022")
      const response = handlePrismaError(error)
      const json = await response.json()

      expect(json.error.message).toBe("資料庫結構不完整")
    })

    it("should include technical details in dev mode", async () => {
      vi.stubEnv("NODE_ENV", "development")

      const error = createPrismaError("P2022")
      const response = handlePrismaError(error)
      const json = await response.json()

      expect(json.error.details).toContain("npx prisma migrate dev")

      vi.unstubAllEnvs()
    })

    it("should include details when includeDetails is true", async () => {
      const error = createPrismaError("P2022")
      const response = handlePrismaError(error, { includeDetails: true })
      const json = await response.json()

      expect(json.error.details).toBeDefined()
    })
  })

  describe("P2025 - Record not found", () => {
    it("should return 404 status", async () => {
      const error = createPrismaError("P2025")
      const response = handlePrismaError(error)

      expect(response.status).toBe(404)
    })

    it("should use custom message when provided", async () => {
      const error = createPrismaError("P2025")
      const response = handlePrismaError(error, {
        customMessages: { P2025: "找不到此費用" },
      })
      const json = await response.json()

      expect(json.error.message).toBe("找不到此費用")
    })

    it("should include resource name in message", async () => {
      const error = createPrismaError("P2025")
      const response = handlePrismaError(error, { resource: "專案" })
      const json = await response.json()

      expect(json.error.message).toBe("專案不存在")
    })
  })

  describe("Unknown errors", () => {
    it("should return 500 for unknown Prisma errors", async () => {
      const error = createPrismaError("P9999", "Unknown prisma error")
      const response = handlePrismaError(error)

      expect(response.status).toBe(500)
    })

    it("should return 500 for non-Prisma errors", async () => {
      const error = new Error("Regular error")
      const response = handlePrismaError(error)

      expect(response.status).toBe(500)
    })

    it("should log error details", () => {
      const consoleSpy = vi.spyOn(console, "error")
      const error = new Error("Test error")
      handlePrismaError(error)

      expect(consoleSpy).toHaveBeenCalled()
    })

    it("should not expose internal details in production", async () => {
      vi.stubEnv("NODE_ENV", "production")

      const error = new Error("Internal error details")
      const response = handlePrismaError(error)
      const json = await response.json()

      expect(json.error.details).toBeUndefined()

      vi.unstubAllEnvs()
    })

    it("should handle null error", async () => {
      const response = handlePrismaError(null)

      expect(response.status).toBe(500)
    })

    it("should handle undefined error", async () => {
      const response = handlePrismaError(undefined)

      expect(response.status).toBe(500)
    })
  })
})

describe("withErrorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("should pass through successful responses", async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    )
    const wrappedHandler = withErrorHandler(handler)
    const response = await wrappedHandler()

    expect(response.status).toBe(200)
  })

  it("should catch and handle Prisma errors", async () => {
    const error = createPrismaError("P2002")
    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = withErrorHandler(handler)
    const response = await wrappedHandler()

    expect(response.status).toBe(409)
  })

  it("should catch and handle generic errors", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Generic error"))
    const wrappedHandler = withErrorHandler(handler)
    const response = await wrappedHandler()

    expect(response.status).toBe(500)
  })

  it("should preserve handler function signature", async () => {
    const handler = vi.fn(async (a: number, b: string) => {
      return NextResponse.json({ a, b }, { status: 200 })
    })
    const wrappedHandler = withErrorHandler(handler)
    const response = await wrappedHandler(42, "test")

    expect(handler).toHaveBeenCalledWith(42, "test")
    expect(response.status).toBe(200)
  })

  it("should use custom options when provided", async () => {
    const error = createPrismaError("P2002")
    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = withErrorHandler(handler, {
      customMessages: { P2002: "自訂錯誤訊息" },
    })
    const response = await wrappedHandler()
    const json = await response.json()

    expect(json.error.message).toBe("自訂錯誤訊息")
  })
})

describe("PrismaErrorCodes", () => {
  it("should have correct error codes", () => {
    expect(PrismaErrorCodes.UNIQUE_CONSTRAINT).toBe("P2002")
    expect(PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT).toBe("P2003")
    expect(PrismaErrorCodes.COLUMN_NOT_FOUND).toBe("P2022")
    expect(PrismaErrorCodes.RECORD_NOT_FOUND).toBe("P2025")
  })
})
