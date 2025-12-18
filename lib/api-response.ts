import { NextResponse } from "next/server"

/**
 * 統一 API 成功回應結構
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

/**
 * 統一 API 錯誤回應結構
 */
export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    details?: unknown
    requiresLogout?: boolean
  }
}

/**
 * API 回應類型
 */
export type ApiResponseType<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * 錯誤回應選項
 */
export interface ErrorOptions {
  code?: string
  details?: unknown
  requiresLogout?: boolean
}

/**
 * API 回應工具
 */
export const ApiResponse = {
  /**
   * 建立成功回應
   * @param data - 回應資料
   * @param status - HTTP 狀態碼 (預設: 200)
   */
  success<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>, { status })
  },

  /**
   * 建立錯誤回應
   * @param message - 錯誤訊息
   * @param status - HTTP 狀態碼
   * @param options - 額外錯誤資訊
   */
  error(
    message: string,
    status: number,
    options?: ErrorOptions
  ): NextResponse<ApiErrorResponse> {
    const errorObj: ApiErrorResponse["error"] = { message }

    if (options?.code !== undefined) {
      errorObj.code = options.code
    }
    if (options?.details !== undefined) {
      errorObj.details = options.details
    }
    if (options?.requiresLogout !== undefined) {
      errorObj.requiresLogout = options.requiresLogout
    }

    return NextResponse.json({ success: false, error: errorObj } as ApiErrorResponse, { status })
  },

  /**
   * 401 未授權回應
   * @param message - 錯誤訊息 (預設: "未授權")
   * @param requiresLogout - 是否需要登出
   */
  unauthorized(message: string = "未授權", requiresLogout?: boolean): NextResponse<ApiErrorResponse> {
    return this.error(message, 401, requiresLogout ? { requiresLogout } : undefined)
  },

  /**
   * 403 禁止存取回應
   * @param message - 錯誤訊息 (預設: "無權限")
   */
  forbidden(message: string = "無權限"): NextResponse<ApiErrorResponse> {
    return this.error(message, 403)
  },

  /**
   * 404 資源不存在回應
   * @param resource - 資源名稱 (選填)
   */
  notFound(resource?: string): NextResponse<ApiErrorResponse> {
    const message = resource ? `${resource}不存在` : "資源不存在"
    return this.error(message, 404)
  },

  /**
   * 400 錯誤請求回應
   * @param message - 錯誤訊息
   * @param details - 驗證詳細資訊
   */
  badRequest(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
    return this.error(message, 400, details !== undefined ? { details } : undefined)
  },

  /**
   * 409 衝突回應 (用於重複資料)
   * @param message - 錯誤訊息
   * @param code - 錯誤碼
   */
  conflict(message: string, code?: string): NextResponse<ApiErrorResponse> {
    return this.error(message, 409, code ? { code } : undefined)
  },

  /**
   * 500 伺服器錯誤回應
   * @param message - 錯誤訊息 (預設: "伺服器錯誤")
   * @param options - 額外錯誤資訊
   */
  serverError(message: string = "伺服器錯誤", options?: ErrorOptions): NextResponse<ApiErrorResponse> {
    return this.error(message, 500, options)
  },
}
