import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// We need to test with DEBUG_MODE both true and false
// Reset module between tests
describe("lib/debug", () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEBUG_MODE

  beforeEach(() => {
    vi.resetModules()
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEBUG_MODE = originalEnv
    vi.restoreAllMocks()
  })

  describe("DEBUG_MODE=false", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEBUG_MODE = "false"
    })

    it("should output to console even when debug mode is off", async () => {
      const { debugLog } = await import("@/lib/debug")

      debugLog("test message")

      expect(console.log).toHaveBeenCalledWith("[Debug] test message")
    })

    it("should not store logs when debug mode is off", async () => {
      const { debugLog, getDebugLogs } = await import("@/lib/debug")

      debugLog("test message")

      expect(getDebugLogs()).toHaveLength(0)
    })
  })

  describe("DEBUG_MODE=true", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_DEBUG_MODE = "true"
      vi.resetModules()
    })

    it("should store logs when debug mode is on", async () => {
      const { debugLog, getDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      debugLog("test message")

      const logs = getDebugLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe("test message")
      expect(logs[0].level).toBe("info")
    })

    it("should use correct console method for different log levels", async () => {
      const { debugLog, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      debugLog("info message", "info")
      debugLog("warn message", "warn")
      debugLog("error message", "error")

      expect(console.log).toHaveBeenCalledWith("[Debug] info message")
      expect(console.warn).toHaveBeenCalledWith("[Debug] warn message")
      expect(console.error).toHaveBeenCalledWith("[Debug] error message")
    })

    it("should limit logs to 50 entries", async () => {
      const { debugLog, getDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      // Add 60 logs
      for (let i = 0; i < 60; i++) {
        debugLog(`message ${i}`)
      }

      const logs = getDebugLogs()
      expect(logs).toHaveLength(50)
      // Should keep the last 50 (message 10-59)
      expect(logs[0].message).toBe("message 10")
      expect(logs[49].message).toBe("message 59")
    })

    it("should include timestamp in logs", async () => {
      const { debugLog, getDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      debugLog("test message")

      const logs = getDebugLogs()
      expect(logs[0].timestamp).toBeDefined()
      expect(typeof logs[0].timestamp).toBe("string")
    })

    it("should assign unique ids to logs", async () => {
      const { debugLog, getDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      debugLog("message 1")
      debugLog("message 2")

      const logs = getDebugLogs()
      expect(logs[0].id).not.toBe(logs[1].id)
    })
  })

  describe("clearDebugLogs", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_DEBUG_MODE = "true"
      vi.resetModules()
    })

    it("should clear all logs", async () => {
      const { debugLog, getDebugLogs, clearDebugLogs } = await import("@/lib/debug")

      debugLog("message 1")
      debugLog("message 2")
      expect(getDebugLogs().length).toBeGreaterThan(0)

      clearDebugLogs()
      expect(getDebugLogs()).toHaveLength(0)
    })
  })

  describe("subscribeDebugLogs", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_DEBUG_MODE = "true"
      vi.resetModules()
    })

    it("should call listener immediately with current logs", async () => {
      const { subscribeDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      const listener = vi.fn()
      subscribeDebugLogs(listener)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith([])
    })

    it("should notify listener when new log is added", async () => {
      const { debugLog, subscribeDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      const listener = vi.fn()
      subscribeDebugLogs(listener)

      debugLog("new message")

      expect(listener).toHaveBeenCalledTimes(2) // Once on subscribe, once on log
      const lastCall = listener.mock.calls[1][0]
      expect(lastCall).toHaveLength(1)
      expect(lastCall[0].message).toBe("new message")
    })

    it("should return unsubscribe function", async () => {
      const { debugLog, subscribeDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      const listener = vi.fn()
      const unsubscribe = subscribeDebugLogs(listener)

      unsubscribe()

      debugLog("new message")

      // Should only have been called once (on subscribe)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it("should notify all listeners", async () => {
      const { debugLog, subscribeDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      const listener1 = vi.fn()
      const listener2 = vi.fn()
      subscribeDebugLogs(listener1)
      subscribeDebugLogs(listener2)

      debugLog("message")

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(2)
    })
  })

  describe("getDebugLogs", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_DEBUG_MODE = "true"
      vi.resetModules()
    })

    it("should return a copy of logs", async () => {
      const { debugLog, getDebugLogs, clearDebugLogs } = await import("@/lib/debug")
      clearDebugLogs()

      debugLog("test")

      const logs1 = getDebugLogs()
      const logs2 = getDebugLogs()

      expect(logs1).not.toBe(logs2)
      expect(logs1).toEqual(logs2)
    })
  })
})
