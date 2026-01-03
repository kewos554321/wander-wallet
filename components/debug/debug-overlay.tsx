"use client"

import { useState, useEffect } from "react"
import { DEBUG_MODE, subscribeDebugLogs, clearDebugLogs } from "@/lib/debug"
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react"

interface LogEntry {
  id: number
  timestamp: string
  level: "info" | "warn" | "error"
  message: string
}

export function DebugOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVisible, setIsVisible] = useState(true)

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

  return (
    <div className="fixed bottom-20 left-2 right-2 z-[9999] max-h-[40vh] bg-black/90 backdrop-blur rounded-lg border border-slate-700 shadow-xl text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">🐛 DEBUG</span>
          <span className="text-slate-400">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearDebugLogs}
            className="p-1 hover:bg-slate-700 rounded"
            title="清除"
          >
            <Trash2 className="h-3 w-3 text-slate-400" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-slate-400" />
            ) : (
              <ChevronUp className="h-3 w-3 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <X className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Logs */}
      {isExpanded && (
        <div className="overflow-y-auto max-h-[30vh] p-2 space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">No logs yet...</div>
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
      )}
    </div>
  )
}
