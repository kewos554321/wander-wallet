import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { ApiResponse, ApiErrorResponse } from "./api-response"

/**
 * Prisma 錯誤資訊介面
 */
export interface PrismaErrorInfo {
  code: string
  message: string
  meta?: Record<string, unknown>
}

/**
 * 錯誤處理選項
 */
export interface ErrorHandlerOptions {
  /** 自訂錯誤訊息 */
  customMessages?: {
    P2002?: string // 唯一約束違規
    P2003?: string // 外鍵約束失敗
    P2025?: string // 記錄不存在
  }
  /** 資源名稱 (用於錯誤訊息) */
  resource?: string
  /** 是否包含技術細節 (僅開發環境) */
  includeDetails?: boolean
}

/**
 * Prisma 錯誤碼常數
 */
export const PrismaErrorCodes = {
  /** 唯一約束違規 */
  UNIQUE_CONSTRAINT: "P2002",
  /** 外鍵約束失敗 */
  FOREIGN_KEY_CONSTRAINT: "P2003",
  /** 欄位不存在 */
  COLUMN_NOT_FOUND: "P2022",
  /** 記錄不存在 */
  RECORD_NOT_FOUND: "P2025",
} as const

/**
 * 檢查是否為 Prisma 已知錯誤
 * @param error - 錯誤物件
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "code" in error &&
    "clientVersion" in error &&
    typeof (error as { code: unknown }).code === "string"
  )
}

/**
 * 提取 Prisma 錯誤資訊
 * @param error - 錯誤物件
 */
export function extractPrismaErrorInfo(error: unknown): PrismaErrorInfo | null {
  if (!isPrismaError(error)) {
    return null
  }

  return {
    code: error.code,
    message: error.message,
    meta: error.meta as Record<string, unknown> | undefined,
  }
}

/**
 * 處理 Prisma 錯誤並返回適當的 API 回應
 * @param error - 錯誤物件
 * @param options - 錯誤處理選項
 */
export function handlePrismaError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): NextResponse<ApiErrorResponse> {
  const { customMessages, resource, includeDetails } = options
  const isDev = process.env.NODE_ENV !== "production"

  // 處理 Prisma 已知錯誤
  if (isPrismaError(error)) {
    const code = error.code

    switch (code) {
      case PrismaErrorCodes.UNIQUE_CONSTRAINT: {
        // P2002: 唯一約束違規
        const message = customMessages?.P2002 || `${resource || "記錄"}已存在`
        return ApiResponse.conflict(message, code)
      }

      case PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT: {
        // P2003: 外鍵約束失敗
        const message = customMessages?.P2003 || "關聯的記錄不存在"
        return ApiResponse.badRequest(message, { code })
      }

      case PrismaErrorCodes.COLUMN_NOT_FOUND: {
        // P2022: 欄位不存在 (通常是遷移問題)
        return ApiResponse.serverError("資料庫結構不完整", {
          code,
          details: isDev || includeDetails
            ? "請運行數據庫遷移：npx prisma migrate dev"
            : undefined,
        })
      }

      case PrismaErrorCodes.RECORD_NOT_FOUND: {
        // P2025: 記錄不存在
        const message = customMessages?.P2025 || `${resource || "記錄"}不存在`
        return ApiResponse.error(message, 404, { code })
      }

      default: {
        // 其他 Prisma 錯誤
        console.error("未處理的 Prisma 錯誤:", { code, message: error.message, meta: error.meta })
        return ApiResponse.serverError("資料庫操作失敗", {
          code,
          details: isDev || includeDetails ? error.message : undefined,
        })
      }
    }
  }

  // 處理一般錯誤
  const errorMessage = error instanceof Error ? error.message : "未知錯誤"
  console.error("伺服器錯誤:", error)

  return ApiResponse.serverError("伺服器錯誤", {
    details: isDev || includeDetails ? errorMessage : undefined,
  })
}

/**
 * 錯誤處理包裝器類型
 */
type AsyncHandler<T extends unknown[]> = (...args: T) => Promise<NextResponse>

/**
 * 用錯誤處理包裝非同步處理器
 * @param handler - 原始處理器
 * @param options - 錯誤處理選項
 */
export function withErrorHandler<T extends unknown[]>(
  handler: AsyncHandler<T>,
  options?: ErrorHandlerOptions
): AsyncHandler<T> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handlePrismaError(error, options)
    }
  }
}
