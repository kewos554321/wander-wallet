/**
 * Debug 工具
 * 設定環境變數 NEXT_PUBLIC_DEBUG_MODE=true 開啟
 */

export const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === "true"

type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  id: number
  timestamp: string
  level: LogLevel
  message: string
}

// 全域 log 儲存
let logs: LogEntry[] = []
let logId = 0
let listeners: ((logs: LogEntry[]) => void)[] = []

function notify() {
  listeners.forEach((fn) => fn([...logs]))
}

export function debugLog(message: string, level: LogLevel = "info") {
  // 永遠輸出到 console
  const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log
  consoleFn(`[Debug] ${message}`)

  // 只在 debug mode 時儲存到 overlay
  if (DEBUG_MODE) {
    logs.push({
      id: logId++,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    })
    // 最多保留 50 條
    if (logs.length > 50) {
      logs = logs.slice(-50)
    }
    notify()
  }
}

export function clearDebugLogs() {
  logs = []
  notify()
}

export function subscribeDebugLogs(fn: (logs: LogEntry[]) => void) {
  listeners.push(fn)
  fn([...logs])
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getDebugLogs() {
  return [...logs]
}
