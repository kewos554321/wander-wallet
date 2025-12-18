import { describe, it, expect } from "vitest"
import { validators, validateAll } from "@/lib/validators"

describe("validators", () => {
  describe("amount", () => {
    it("should accept positive integer", () => {
      const result = validators.amount(100)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(100)
    })

    it("should accept positive decimal", () => {
      const result = validators.amount(99.99)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(99.99)
    })

    it("should accept string number", () => {
      const result = validators.amount("150.50")

      expect(result.valid).toBe(true)
      expect(result.value).toBe(150.5)
    })

    it("should accept zero", () => {
      const result = validators.amount(0)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(0)
    })

    it("should reject negative numbers", () => {
      const result = validators.amount(-50)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("金額不可為負數")
    })

    it("should reject NaN", () => {
      const result = validators.amount(NaN)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("金額必須為數字")
    })

    it("should reject non-numeric strings", () => {
      const result = validators.amount("abc")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("金額必須為數字")
    })

    it("should reject null", () => {
      const result = validators.amount(null)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("金額必填")
    })

    it("should reject undefined", () => {
      const result = validators.amount(undefined)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("金額必填")
    })
  })

  describe("date", () => {
    it("should parse valid ISO date string", () => {
      const result = validators.date("2024-12-18T10:00:00.000Z")

      expect(result.valid).toBe(true)
      expect(result.value).toBeInstanceOf(Date)
    })

    it("should parse valid date-only string", () => {
      const result = validators.date("2024-12-18")

      expect(result.valid).toBe(true)
      expect(result.value).toBeInstanceOf(Date)
    })

    it("should return null for empty string", () => {
      const result = validators.date("")

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for null input", () => {
      const result = validators.date(null)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for undefined input", () => {
      const result = validators.date(undefined)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return error for invalid date string", () => {
      const result = validators.date("invalid-date")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("無效的日期")
    })

    it("should handle Date object input", () => {
      const date = new Date("2024-12-18")
      const result = validators.date(date)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(date)
    })

    it("should reject invalid Date object", () => {
      const date = new Date("invalid")
      const result = validators.date(date)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("無效的日期")
    })

    it("should reject non-string non-date types", () => {
      const result = validators.date(12345)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("日期格式無效")
    })
  })

  describe("dateRange", () => {
    it("should accept valid range where end >= start", () => {
      const start = new Date("2024-12-01")
      const end = new Date("2024-12-31")
      const result = validators.dateRange(start, end)

      expect(result.valid).toBe(true)
      expect(result.value).toEqual({ startDate: start, endDate: end })
    })

    it("should accept same start and end date", () => {
      const date = new Date("2024-12-18")
      const result = validators.dateRange(date, date)

      expect(result.valid).toBe(true)
    })

    it("should accept when only start date provided", () => {
      const start = new Date("2024-12-01")
      const result = validators.dateRange(start, null)

      expect(result.valid).toBe(true)
      expect(result.value).toEqual({ startDate: start, endDate: null })
    })

    it("should accept when only end date provided", () => {
      const end = new Date("2024-12-31")
      const result = validators.dateRange(null, end)

      expect(result.valid).toBe(true)
      expect(result.value).toEqual({ startDate: null, endDate: end })
    })

    it("should accept when both null", () => {
      const result = validators.dateRange(null, null)

      expect(result.valid).toBe(true)
      expect(result.value).toEqual({ startDate: null, endDate: null })
    })

    it("should reject when end < start", () => {
      const start = new Date("2024-12-31")
      const end = new Date("2024-12-01")
      const result = validators.dateRange(start, end)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("結束日期需晚於出發日期")
    })
  })

  describe("requiredString", () => {
    it("should accept non-empty string", () => {
      const result = validators.requiredString("Test Value", "欄位")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("Test Value")
    })

    it("should trim whitespace", () => {
      const result = validators.requiredString("  Test  ", "欄位")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("Test")
    })

    it("should reject empty string", () => {
      const result = validators.requiredString("", "專案名稱")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("專案名稱必填")
    })

    it("should reject whitespace-only string", () => {
      const result = validators.requiredString("   ", "專案名稱")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("專案名稱必填")
    })

    it("should reject null", () => {
      const result = validators.requiredString(null, "專案名稱")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("專案名稱必填")
    })

    it("should reject undefined", () => {
      const result = validators.requiredString(undefined, "專案名稱")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("專案名稱必填")
    })

    it("should reject non-string types", () => {
      const result = validators.requiredString(123, "專案名稱")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("專案名稱必須為字串")
    })

    it("should include field name in error message", () => {
      const result = validators.requiredString("", "用戶名稱")

      expect(result.error).toContain("用戶名稱")
    })
  })

  describe("optionalString", () => {
    it("should accept string and trim it", () => {
      const result = validators.optionalString("  Test  ")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("Test")
    })

    it("should return null for empty string", () => {
      const result = validators.optionalString("")

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for whitespace-only string", () => {
      const result = validators.optionalString("   ")

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for null input", () => {
      const result = validators.optionalString(null)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for undefined input", () => {
      const result = validators.optionalString(undefined)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should reject non-string types", () => {
      const result = validators.optionalString(123)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("必須為字串")
    })
  })

  describe("participants", () => {
    const validMemberIds = new Set(["member-1", "member-2", "member-3"])

    it("should accept valid participants array", () => {
      const participants = [
        { memberId: "member-1", shareAmount: 50 },
        { memberId: "member-2", shareAmount: 50 },
      ]
      const result = validators.participants(participants, validMemberIds, 100)

      expect(result.valid).toBe(true)
      expect(result.value).toHaveLength(2)
    })

    it("should reject empty array", () => {
      const result = validators.participants([], validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("至少需要一個參與者")
    })

    it("should reject non-array input", () => {
      const result = validators.participants("not an array", validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("參與者必須為陣列")
    })

    it("should reject null input", () => {
      const result = validators.participants(null, validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("參與者必須為陣列")
    })

    it("should reject participant with invalid memberId", () => {
      const participants = [{ memberId: null, shareAmount: 50 }]
      const result = validators.participants(participants, validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("參與者成員 ID 無效")
    })

    it("should reject participant not in validMemberIds", () => {
      const participants = [{ memberId: "invalid-member", shareAmount: 50 }]
      const result = validators.participants(participants, validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toContain("不是專案成員")
    })

    it("should validate share amounts sum equals expectedTotal", () => {
      const participants = [
        { memberId: "member-1", shareAmount: 30 },
        { memberId: "member-2", shareAmount: 30 },
      ]
      const result = validators.participants(participants, validMemberIds, 100)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("分擔總額必須等於費用總額")
    })

    it("should allow small floating point difference (0.01)", () => {
      const participants = [
        { memberId: "member-1", shareAmount: 33.33 },
        { memberId: "member-2", shareAmount: 33.33 },
        { memberId: "member-3", shareAmount: 33.34 },
      ]
      const result = validators.participants(participants, validMemberIds, 100)

      expect(result.valid).toBe(true)
    })

    it("should accept string shareAmount and convert to number", () => {
      const participants = [
        { memberId: "member-1", shareAmount: "50" },
        { memberId: "member-2", shareAmount: "50" },
      ]
      const result = validators.participants(participants, validMemberIds, 100)

      expect(result.valid).toBe(true)
      expect(result.value?.[0].shareAmount).toBe(50)
    })

    it("should reject negative shareAmount", () => {
      const participants = [{ memberId: "member-1", shareAmount: -50 }]
      const result = validators.participants(participants, validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("分擔金額必須為非負數")
    })

    it("should reject invalid participant object", () => {
      const participants = [null]
      const result = validators.participants(participants, validMemberIds)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("參與者資料格式無效")
    })

    it("should work without expectedTotal", () => {
      const participants = [
        { memberId: "member-1", shareAmount: 30 },
        { memberId: "member-2", shareAmount: 70 },
      ]
      const result = validators.participants(participants, validMemberIds)

      expect(result.valid).toBe(true)
    })
  })

  describe("uuid", () => {
    it("should accept valid UUID", () => {
      const result = validators.uuid("550e8400-e29b-41d4-a716-446655440000")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("550e8400-e29b-41d4-a716-446655440000")
    })

    it("should accept uppercase UUID", () => {
      const result = validators.uuid("550E8400-E29B-41D4-A716-446655440000")

      expect(result.valid).toBe(true)
    })

    it("should reject invalid UUID format", () => {
      const result = validators.uuid("not-a-uuid")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("ID格式無效")
    })

    it("should reject null", () => {
      const result = validators.uuid(null)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("ID必填")
    })

    it("should reject undefined", () => {
      const result = validators.uuid(undefined)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("ID必填")
    })

    it("should include field name in error", () => {
      const result = validators.uuid("invalid", "專案ID")

      expect(result.error).toBe("專案ID格式無效")
    })

    it("should reject non-string types", () => {
      const result = validators.uuid(123, "用戶ID")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("用戶ID格式無效")
    })
  })

  describe("imageFormat", () => {
    it("should accept http URL", () => {
      const result = validators.imageFormat("http://example.com/image.png")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("http://example.com/image.png")
    })

    it("should accept https URL", () => {
      const result = validators.imageFormat("https://example.com/image.png")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("https://example.com/image.png")
    })

    it("should accept avatar: prefixed string", () => {
      const result = validators.imageFormat("avatar:smile")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("avatar:smile")
    })

    it("should return null for empty string", () => {
      const result = validators.imageFormat("")

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for null input", () => {
      const result = validators.imageFormat(null)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should return null for undefined input", () => {
      const result = validators.imageFormat(undefined)

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })

    it("should reject invalid format", () => {
      const result = validators.imageFormat("invalid-image-format")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("圖片格式無效，必須為 URL 或 avatar: 格式")
    })

    it("should reject non-string types", () => {
      const result = validators.imageFormat(123)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("圖片格式無效")
    })

    it("should trim whitespace", () => {
      const result = validators.imageFormat("  https://example.com/image.png  ")

      expect(result.valid).toBe(true)
      expect(result.value).toBe("https://example.com/image.png")
    })

    it("should return null for whitespace-only string", () => {
      const result = validators.imageFormat("   ")

      expect(result.valid).toBe(true)
      expect(result.value).toBe(null)
    })
  })
})

describe("validateAll", () => {
  it("should return valid when all validations pass", () => {
    const result = validateAll([
      () => validators.requiredString("test", "名稱"),
      () => validators.amount(100),
    ])

    expect(result.valid).toBe(true)
    expect(result.firstError).toBeUndefined()
  })

  it("should return first error when validation fails", () => {
    const result = validateAll([
      () => validators.requiredString("", "名稱"),
      () => validators.amount(-1),
    ])

    expect(result.valid).toBe(false)
    expect(result.firstError).toBe("名稱必填")
  })

  it("should short-circuit on first failure", () => {
    let secondValidatorCalled = false

    const result = validateAll([
      () => validators.requiredString("", "名稱"),
      () => {
        secondValidatorCalled = true
        return validators.amount(100)
      },
    ])

    expect(result.valid).toBe(false)
    expect(secondValidatorCalled).toBe(false)
  })

  it("should return valid for empty validation array", () => {
    const result = validateAll([])

    expect(result.valid).toBe(true)
  })
})
