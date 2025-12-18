/**
 * 系統層級 Logger
 * 用於生產環境追蹤和除錯
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  /** 請求 ID，用於追蹤同一請求的所有 log */
  requestId?: string
  /** 使用者 ID */
  userId?: string
  /** API 路徑 */
  path?: string
  /** HTTP 方法 */
  method?: string
  /** 額外資訊 */
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// 根據環境設定最低 log level
const MIN_LOG_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug"

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL]
}

function formatError(
  error: unknown
): LogEntry["error"] | undefined {
  if (!error) return undefined

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      code: (error as { code?: string }).code,
    }
  }

  if (typeof error === "object" && error !== null) {
    const err = error as { message?: string; code?: string; name?: string }
    return {
      name: err.name || "UnknownError",
      message: err.message || String(error),
      code: err.code,
    }
  }

  return {
    name: "UnknownError",
    message: String(error),
  }
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context
  }

  if (error) {
    entry.error = formatError(error)
  }

  return entry
}

function output(entry: LogEntry): void {
  const jsonOutput = JSON.stringify(entry)

  switch (entry.level) {
    case "debug":
      console.debug(jsonOutput)
      break
    case "info":
      console.info(jsonOutput)
      break
    case "warn":
      console.warn(jsonOutput)
      break
    case "error":
      console.error(jsonOutput)
      break
  }
}

/**
 * 主要 Logger 物件
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) return
    output(createLogEntry("debug", message, context))
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) return
    output(createLogEntry("info", message, context))
  },

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (!shouldLog("warn")) return
    output(createLogEntry("warn", message, context, error))
  },

  error(message: string, context?: LogContext, error?: unknown): void {
    if (!shouldLog("error")) return
    output(createLogEntry("error", message, context, error))
  },
}

/**
 * 產生唯一的 Request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * API Route 專用的 Logger 建立器
 * 自動附加 request 相關資訊
 */
export function createApiLogger(
  method: string,
  path: string,
  userId?: string
) {
  const requestId = generateRequestId()
  const baseContext: LogContext = {
    requestId,
    method,
    path,
    ...(userId && { userId }),
  }

  return {
    requestId,

    debug(message: string, extra?: Record<string, unknown>): void {
      logger.debug(message, { ...baseContext, ...extra })
    },

    info(message: string, extra?: Record<string, unknown>): void {
      logger.info(message, { ...baseContext, ...extra })
    },

    warn(message: string, extra?: Record<string, unknown>, error?: unknown): void {
      logger.warn(message, { ...baseContext, ...extra }, error)
    },

    error(message: string, extra?: Record<string, unknown>, error?: unknown): void {
      logger.error(message, { ...baseContext, ...extra }, error)
    },

    /** 記錄 API 請求開始 */
    start(): void {
      logger.info(`${method} ${path} 開始`, baseContext)
    },

    /** 記錄 API 請求成功完成 */
    success(statusCode: number = 200, extra?: Record<string, unknown>): void {
      logger.info(`${method} ${path} 完成`, {
        ...baseContext,
        statusCode,
        ...extra,
      })
    },

    /** 記錄 API 請求失敗 */
    fail(
      statusCode: number,
      errorMessage: string,
      error?: unknown,
      extra?: Record<string, unknown>
    ): void {
      logger.error(`${method} ${path} 失敗: ${errorMessage}`, {
        ...baseContext,
        statusCode,
        ...extra,
      }, error)
    },
  }
}

export type ApiLogger = ReturnType<typeof createApiLogger>
