/**
 * 驗證結果介面
 */
export interface ValidationResult<T> {
  valid: boolean
  value?: T
  error?: string
}

/**
 * 參與者輸入介面
 */
export interface ParticipantInput {
  memberId: string
  shareAmount: number | string
}

/**
 * 驗證後的參與者資料
 */
export interface ValidatedParticipant {
  memberId: string
  shareAmount: number
}

/**
 * UUID v4 正規表達式
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * 驗證工具集
 */
export const validators = {
  /**
   * 驗證金額 (必須為正數)
   * @param value - 輸入值
   */
  amount(value: unknown): ValidationResult<number> {
    if (value === null || value === undefined) {
      return { valid: false, error: "金額必填" }
    }

    const num = Number(value)

    if (isNaN(num)) {
      return { valid: false, error: "金額必須為數字" }
    }

    if (num < 0) {
      return { valid: false, error: "金額不可為負數" }
    }

    return { valid: true, value: num }
  },

  /**
   * 驗證日期
   * @param value - 輸入值 (允許 null/undefined/空字串)
   */
  date(value: unknown): ValidationResult<Date | null> {
    if (value === null || value === undefined || value === "") {
      return { valid: true, value: null }
    }

    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return { valid: false, error: "無效的日期" }
      }
      return { valid: true, value }
    }

    if (typeof value !== "string") {
      return { valid: false, error: "日期格式無效" }
    }

    const date = new Date(value)

    if (isNaN(date.getTime())) {
      return { valid: false, error: "無效的日期" }
    }

    return { valid: true, value: date }
  },

  /**
   * 驗證日期範圍 (結束日期必須 >= 開始日期)
   * @param startDate - 開始日期
   * @param endDate - 結束日期
   */
  dateRange(
    startDate: Date | null,
    endDate: Date | null
  ): ValidationResult<{ startDate: Date | null; endDate: Date | null }> {
    // 兩者都為 null 是有效的
    if (startDate === null && endDate === null) {
      return { valid: true, value: { startDate: null, endDate: null } }
    }

    // 只有其中一個日期也是有效的
    if (startDate === null || endDate === null) {
      return { valid: true, value: { startDate, endDate } }
    }

    // 結束日期必須 >= 開始日期
    if (endDate < startDate) {
      return { valid: false, error: "結束日期需晚於出發日期" }
    }

    return { valid: true, value: { startDate, endDate } }
  },

  /**
   * 驗證必填字串
   * @param value - 輸入值
   * @param fieldName - 欄位名稱 (用於錯誤訊息)
   */
  requiredString(value: unknown, fieldName: string): ValidationResult<string> {
    if (value === null || value === undefined) {
      return { valid: false, error: `${fieldName}必填` }
    }

    if (typeof value !== "string") {
      return { valid: false, error: `${fieldName}必須為字串` }
    }

    const trimmed = value.trim()

    if (trimmed.length === 0) {
      return { valid: false, error: `${fieldName}必填` }
    }

    return { valid: true, value: trimmed }
  },

  /**
   * 驗證可選字串 (允許 null/undefined/空字串)
   * @param value - 輸入值
   */
  optionalString(value: unknown): ValidationResult<string | null> {
    if (value === null || value === undefined || value === "") {
      return { valid: true, value: null }
    }

    if (typeof value !== "string") {
      return { valid: false, error: "必須為字串" }
    }

    const trimmed = value.trim()

    if (trimmed.length === 0) {
      return { valid: true, value: null }
    }

    return { valid: true, value: trimmed }
  },

  /**
   * 驗證參與者列表
   * @param participants - 參與者陣列
   * @param validMemberIds - 有效成員 ID 集合
   * @param expectedTotal - 預期總金額 (選填，用於驗證分擔金額總和)
   */
  participants(
    participants: unknown,
    validMemberIds: Set<string>,
    expectedTotal?: number
  ): ValidationResult<ValidatedParticipant[]> {
    if (!Array.isArray(participants)) {
      return { valid: false, error: "參與者必須為陣列" }
    }

    if (participants.length === 0) {
      return { valid: false, error: "至少需要一個參與者" }
    }

    const validated: ValidatedParticipant[] = []
    let totalShare = 0

    for (const p of participants) {
      if (!p || typeof p !== "object") {
        return { valid: false, error: "參與者資料格式無效" }
      }

      const { memberId, shareAmount } = p as ParticipantInput

      if (!memberId || typeof memberId !== "string") {
        return { valid: false, error: "參與者成員 ID 無效" }
      }

      if (!validMemberIds.has(memberId)) {
        return { valid: false, error: `成員 ${memberId} 不是專案成員` }
      }

      const shareNum = Number(shareAmount)

      if (isNaN(shareNum) || shareNum < 0) {
        return { valid: false, error: "分擔金額必須為非負數" }
      }

      validated.push({ memberId, shareAmount: shareNum })
      totalShare += shareNum
    }

    // 驗證總金額 (允許 0.01 的浮點誤差)
    if (expectedTotal !== undefined && Math.abs(totalShare - expectedTotal) > 0.01) {
      return { valid: false, error: "分擔總額必須等於費用總額" }
    }

    return { valid: true, value: validated }
  },

  /**
   * 驗證 UUID 格式
   * @param value - 輸入值
   * @param fieldName - 欄位名稱 (選填)
   */
  uuid(value: unknown, fieldName?: string): ValidationResult<string> {
    const field = fieldName || "ID"

    if (value === null || value === undefined) {
      return { valid: false, error: `${field}必填` }
    }

    if (typeof value !== "string") {
      return { valid: false, error: `${field}格式無效` }
    }

    if (!UUID_REGEX.test(value)) {
      return { valid: false, error: `${field}格式無效` }
    }

    return { valid: true, value }
  },

  /**
   * 驗證圖片格式 (URL 或 avatar: 前綴)
   * @param value - 輸入值
   */
  imageFormat(value: unknown): ValidationResult<string | null> {
    if (value === null || value === undefined || value === "") {
      return { valid: true, value: null }
    }

    if (typeof value !== "string") {
      return { valid: false, error: "圖片格式無效" }
    }

    const trimmed = value.trim()

    if (trimmed.length === 0) {
      return { valid: true, value: null }
    }

    // 接受 avatar: 前綴或 http/https URL
    if (
      trimmed.startsWith("avatar:") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return { valid: true, value: trimmed }
    }

    return { valid: false, error: "圖片格式無效，必須為 URL 或 avatar: 格式" }
  },
}

/**
 * 批次驗證工具
 * @param validations - 驗證函數陣列
 * @returns 所有驗證通過返回 valid: true，否則返回第一個錯誤
 */
export function validateAll(
  validations: Array<() => ValidationResult<unknown>>
): { valid: boolean; firstError?: string } {
  for (const validate of validations) {
    const result = validate()
    if (!result.valid) {
      return { valid: false, firstError: result.error }
    }
  }
  return { valid: true }
}
