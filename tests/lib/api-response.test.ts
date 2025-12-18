import { describe, it, expect } from "vitest"
import { ApiResponse } from "@/lib/api-response"

describe("ApiResponse", () => {
  describe("success", () => {
    it("should return success response with default status 200", async () => {
      const data = { id: "123", name: "Test" }
      const response = ApiResponse.success(data)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
    })

    it("should return success response with custom status", async () => {
      const data = { id: "123" }
      const response = ApiResponse.success(data, 201)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
    })

    it("should handle null data", async () => {
      const response = ApiResponse.success(null)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBe(null)
    })

    it("should handle array data", async () => {
      const data = [{ id: "1" }, { id: "2" }]
      const response = ApiResponse.success(data)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
      expect(json.data).toHaveLength(2)
    })

    it("should handle nested object data", async () => {
      const data = {
        user: {
          id: "123",
          profile: {
            name: "Test",
            settings: { theme: "dark" },
          },
        },
      }
      const response = ApiResponse.success(data)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data.user.profile.settings.theme).toBe("dark")
    })
  })

  describe("error", () => {
    it("should return error response with message and status", async () => {
      const response = ApiResponse.error("發生錯誤", 400)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe("發生錯誤")
    })

    it("should include optional code", async () => {
      const response = ApiResponse.error("發生錯誤", 400, { code: "ERR001" })
      const json = await response.json()

      expect(json.error.code).toBe("ERR001")
    })

    it("should include optional details", async () => {
      const details = { field: "email", issue: "格式錯誤" }
      const response = ApiResponse.error("驗證失敗", 400, { details })
      const json = await response.json()

      expect(json.error.details).toEqual(details)
    })

    it("should include requiresLogout flag when provided", async () => {
      const response = ApiResponse.error("需要重新登入", 401, { requiresLogout: true })
      const json = await response.json()

      expect(json.error.requiresLogout).toBe(true)
    })

    it("should not include undefined optional fields", async () => {
      const response = ApiResponse.error("發生錯誤", 400)
      const json = await response.json()

      expect(json.error).not.toHaveProperty("code")
      expect(json.error).not.toHaveProperty("details")
      expect(json.error).not.toHaveProperty("requiresLogout")
    })
  })

  describe("unauthorized", () => {
    it("should return 401 status", async () => {
      const response = ApiResponse.unauthorized()

      expect(response.status).toBe(401)
    })

    it("should use default message when not provided", async () => {
      const response = ApiResponse.unauthorized()
      const json = await response.json()

      expect(json.error.message).toBe("未授權")
    })

    it("should use custom message when provided", async () => {
      const response = ApiResponse.unauthorized("Token 已過期")
      const json = await response.json()

      expect(json.error.message).toBe("Token 已過期")
    })

    it("should include requiresLogout when true", async () => {
      const response = ApiResponse.unauthorized("用戶不存在", true)
      const json = await response.json()

      expect(json.error.requiresLogout).toBe(true)
    })

    it("should not include requiresLogout when false", async () => {
      const response = ApiResponse.unauthorized("未授權", false)
      const json = await response.json()

      expect(json.error).not.toHaveProperty("requiresLogout")
    })
  })

  describe("forbidden", () => {
    it("should return 403 status", async () => {
      const response = ApiResponse.forbidden()

      expect(response.status).toBe(403)
    })

    it("should use default message when not provided", async () => {
      const response = ApiResponse.forbidden()
      const json = await response.json()

      expect(json.error.message).toBe("無權限")
    })

    it("should use custom message when provided", async () => {
      const response = ApiResponse.forbidden("只有創建者可以刪除")
      const json = await response.json()

      expect(json.error.message).toBe("只有創建者可以刪除")
    })
  })

  describe("notFound", () => {
    it("should return 404 status", async () => {
      const response = ApiResponse.notFound()

      expect(response.status).toBe(404)
    })

    it("should use generic message when resource not specified", async () => {
      const response = ApiResponse.notFound()
      const json = await response.json()

      expect(json.error.message).toBe("資源不存在")
    })

    it("should include resource name in message", async () => {
      const response = ApiResponse.notFound("專案")
      const json = await response.json()

      expect(json.error.message).toBe("專案不存在")
    })
  })

  describe("badRequest", () => {
    it("should return 400 status", async () => {
      const response = ApiResponse.badRequest("請求無效")

      expect(response.status).toBe(400)
    })

    it("should include message", async () => {
      const response = ApiResponse.badRequest("金額必須大於0")
      const json = await response.json()

      expect(json.error.message).toBe("金額必須大於0")
    })

    it("should include validation details when provided", async () => {
      const details = { fields: ["email", "password"] }
      const response = ApiResponse.badRequest("驗證失敗", details)
      const json = await response.json()

      expect(json.error.details).toEqual(details)
    })

    it("should not include details when not provided", async () => {
      const response = ApiResponse.badRequest("請求無效")
      const json = await response.json()

      expect(json.error).not.toHaveProperty("details")
    })
  })

  describe("conflict", () => {
    it("should return 409 status", async () => {
      const response = ApiResponse.conflict("資源衝突")

      expect(response.status).toBe(409)
    })

    it("should include message", async () => {
      const response = ApiResponse.conflict("該記錄已存在")
      const json = await response.json()

      expect(json.error.message).toBe("該記錄已存在")
    })

    it("should include code when provided", async () => {
      const response = ApiResponse.conflict("唯一約束違規", "P2002")
      const json = await response.json()

      expect(json.error.code).toBe("P2002")
    })
  })

  describe("serverError", () => {
    it("should return 500 status", async () => {
      const response = ApiResponse.serverError()

      expect(response.status).toBe(500)
    })

    it("should use default message when not provided", async () => {
      const response = ApiResponse.serverError()
      const json = await response.json()

      expect(json.error.message).toBe("伺服器錯誤")
    })

    it("should use custom message when provided", async () => {
      const response = ApiResponse.serverError("資料庫連線失敗")
      const json = await response.json()

      expect(json.error.message).toBe("資料庫連線失敗")
    })

    it("should include options when provided", async () => {
      const response = ApiResponse.serverError("操作失敗", {
        code: "DB_ERROR",
        details: "Connection timeout",
      })
      const json = await response.json()

      expect(json.error.code).toBe("DB_ERROR")
      expect(json.error.details).toBe("Connection timeout")
    })
  })
})
