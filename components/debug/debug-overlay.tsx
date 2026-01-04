"use client"

import { useState, useEffect } from "react"
import { DEBUG_MODE, subscribeDebugLogs, clearDebugLogs, getDebugLogs } from "@/lib/debug"
import { X, Trash2, Copy, Check, Bug } from "lucide-react"

interface LogEntry {
  id: number
  timestamp: string
  level: "info" | "warn" | "error"
  message: string
}

export function DebugOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, _setIsVisible] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!DEBUG_MODE) return

    const unsubscribe = subscribeDebugLogs(setLogs)
    return unsubscribe
  }, [])

  if (!DEBUG_MODE || !isVisible) return null

  const levelColors = {
    info: "text-blue-400",
    warn: "text-yellow-400",
    error: "text-red-400",
  }

  const handleCopy = async () => {
    const allLogs = getDebugLogs()
    const text = allLogs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join("\n")

    try {
      await navigator.clipboard.writeText(text || "No logs")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for iOS
      const textArea = document.createElement("textarea")
      textArea.value = text || "No logs"
      textArea.style.position = "fixed"
      textArea.style.left = "-9999px"
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Collapsed: show small floating button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 left-4 z-[9999] w-10 h-10 bg-black/80 backdrop-blur rounded-full border border-slate-600 shadow-xl flex items-center justify-center"
      >
        <Bug className="h-4 w-4 text-green-400" />
        {logs.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {logs.length > 9 ? "9+" : logs.length}
          </span>
        )}
      </button>
    )
  }

  // Expanded: show full panel
  return (
    <div className="fixed bottom-20 left-2 right-2 z-[9999] max-h-[30vh] bg-black/95 backdrop-blur rounded-lg border border-slate-700 shadow-xl text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">🐛 DEBUG</span>
          <span className="text-slate-400">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-700 rounded"
            title="複製全部"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
          <button
            onClick={clearDebugLogs}
            className="p-1.5 hover:bg-slate-700 rounded"
            title="清除"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 hover:bg-slate-700 rounded"
            title="縮小"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="overflow-y-auto max-h-[22vh] p-2 space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center py-2">No logs yet...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-slate-500 shrink-0">{log.timestamp}</span>
              <span className={`shrink-0 ${levelColors[log.level]}`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
