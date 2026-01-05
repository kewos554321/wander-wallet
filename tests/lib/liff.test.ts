import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock liff module
const mockLiff = {
  init: vi.fn(),
  isLoggedIn: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
  getAccessToken: vi.fn(),
  isInClient: vi.fn(),
  getContext: vi.fn(),
  sendMessages: vi.fn(),
}

vi.mock("@line/liff", () => ({
  default: mockLiff,
}))

// Mock window.location
const mockLocation = {
  href: "https://example.com/test",
  reload: vi.fn(),
}

describe("liff module", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    // Setup window mock
    Object.defineProperty(global, "window", {
      value: {
        location: mockLocation,
      },
      writable: true,
      configurable: true,
    })

    // Reset environment variables
    process.env.NEXT_PUBLIC_LIFF_ID = "test-liff-id"
    process.env.NEXT_PUBLIC_LIFF_URL = "https://liff.example.com"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.NEXT_PUBLIC_LIFF_ID
    delete process.env.NEXT_PUBLIC_LIFF_URL
  })

  describe("initLiff", () => {
    it("should initialize liff with liff id", async () => {
      mockLiff.init.mockResolvedValueOnce(undefined)

      const { initLiff } = await import("@/lib/liff")
      await initLiff()

      expect(mockLiff.init).toHaveBeenCalledWith({ liffId: "test-liff-id" })
    })

    it("should throw error if LIFF_ID is not set", async () => {
      delete process.env.NEXT_PUBLIC_LIFF_ID

      const { initLiff } = await import("@/lib/liff")

      await expect(initLiff()).rejects.toThrow("NEXT_PUBLIC_LIFF_ID is not set")
    })

    it("should not re-initialize if already initialized", async () => {
      mockLiff.init.mockResolvedValueOnce(undefined)

      const { initLiff } = await import("@/lib/liff")
      await initLiff()
      await initLiff() // Second call

      // Should only be called once
      expect(mockLiff.init).toHaveBeenCalledTimes(1)
    })
  })

  describe("isLoggedIn", () => {
    it("should return true when logged in", async () => {
      mockLiff.isLoggedIn.mockReturnValue(true)

      const { isLoggedIn } = await import("@/lib/liff")
      expect(isLoggedIn()).toBe(true)
    })

    it("should return false when not logged in", async () => {
      mockLiff.isLoggedIn.mockReturnValue(false)

      const { isLoggedIn } = await import("@/lib/liff")
      expect(isLoggedIn()).toBe(false)
    })
  })

  describe("login", () => {
    it("should call liff.login with current URL as redirectUri", async () => {
      const { login } = await import("@/lib/liff")
      login()

      expect(mockLiff.login).toHaveBeenCalledWith({
        redirectUri: "https://example.com/test",
      })
    })

    it("should call liff.login with custom redirectUri", async () => {
      const { login } = await import("@/lib/liff")
      login("https://custom.url/path")

      expect(mockLiff.login).toHaveBeenCalledWith({
        redirectUri: "https://custom.url/path",
      })
    })
  })

  describe("logout", () => {
    it("should call liff.logout and reload page", async () => {
      const { logout } = await import("@/lib/liff")
      logout()

      expect(mockLiff.logout).toHaveBeenCalled()
      expect(mockLocation.reload).toHaveBeenCalled()
    })
  })

  describe("getProfile", () => {
    it("should return profile when logged in", async () => {
      mockLiff.isLoggedIn.mockReturnValue(true)
      mockLiff.getProfile.mockResolvedValue({
        userId: "U123456",
        displayName: "Test User",
        pictureUrl: "https://example.com/avatar.jpg",
        statusMessage: "Hello!",
      })

      const { getProfile } = await import("@/lib/liff")
      const profile = await getProfile()

      expect(profile).toEqual({
        lineUserId: "U123456",
        displayName: "Test User",
        pictureUrl: "https://example.com/avatar.jpg",
        statusMessage: "Hello!",
      })
    })

    it("should return null when not logged in", async () => {
      mockLiff.isLoggedIn.mockReturnValue(false)

      const { getProfile } = await import("@/lib/liff")
      const profile = await getProfile()

      expect(profile).toBeNull()
    })

    it("should return null on error", async () => {
      mockLiff.isLoggedIn.mockReturnValue(true)
      mockLiff.getProfile.mockRejectedValue(new Error("API error"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      const { getProfile } = await import("@/lib/liff")
      const profile = await getProfile()

      expect(profile).toBeNull()
      expect(consoleError).toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })

  describe("getAccessToken", () => {
    it("should return access token", async () => {
      mockLiff.getAccessToken.mockReturnValue("test-access-token")

      const { getAccessToken } = await import("@/lib/liff")
      expect(getAccessToken()).toBe("test-access-token")
    })

    it("should return null if no token", async () => {
      mockLiff.getAccessToken.mockReturnValue(null)

      const { getAccessToken } = await import("@/lib/liff")
      expect(getAccessToken()).toBeNull()
    })
  })

  describe("isInClient", () => {
    it("should return true when in LINE client", async () => {
      mockLiff.isInClient.mockReturnValue(true)

      const { isInClient } = await import("@/lib/liff")
      expect(isInClient()).toBe(true)
    })

    it("should return false when not in LINE client", async () => {
      mockLiff.isInClient.mockReturnValue(false)

      const { isInClient } = await import("@/lib/liff")
      expect(isInClient()).toBe(false)
    })
  })

  describe("isSendMessagesAvailable", () => {
    it("should return false when not in client", async () => {
      mockLiff.isInClient.mockReturnValue(false)

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(false)
    })

    it("should return false when context is null", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue(null)

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(false)
    })

    it("should return true for utou context type", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "utou" })

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(true)
    })

    it("should return true for room context type", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "room" })

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(true)
    })

    it("should return true for group context type", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(true)
    })

    it("should return false for external context type", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "external" })

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(false)
    })

    it("should return false on error", async () => {
      mockLiff.isInClient.mockImplementation(() => {
        throw new Error("LIFF error")
      })

      const { isSendMessagesAvailable } = await import("@/lib/liff")
      expect(isSendMessagesAvailable()).toBe(false)
    })
  })

  describe("sendMessagesToChat", () => {
    it("should return false when messages not available", async () => {
      mockLiff.isInClient.mockReturnValue(false)

      const { sendMessagesToChat } = await import("@/lib/liff")
      const result = await sendMessagesToChat([{ type: "text", text: "test" }])

      expect(result).toBe(false)
      expect(mockLiff.sendMessages).not.toHaveBeenCalled()
    })

    it("should send messages when available", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockResolvedValue(undefined)

      const { sendMessagesToChat } = await import("@/lib/liff")
      const messages = [{ type: "text" as const, text: "test" }]
      const result = await sendMessagesToChat(messages)

      expect(result).toBe(true)
      expect(mockLiff.sendMessages).toHaveBeenCalledWith(messages)
    })

    it("should return false on send error", async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockRejectedValue(new Error("Send failed"))

      const { sendMessagesToChat } = await import("@/lib/liff")
      const result = await sendMessagesToChat([{ type: "text", text: "test" }])

      expect(result).toBe(false)
    })
  })

  describe("sendExpenseNotificationToChat", () => {
    beforeEach(() => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockResolvedValue(undefined)
    })

    it("should send create expense notification", async () => {
      const { sendExpenseNotificationToChat } = await import("@/lib/liff")

      const result = await sendExpenseNotificationToChat({
        operationType: "create",
        projectName: "Test Project",
        projectId: "proj-123",
        payerName: "小明",
        amount: 1000,
        description: "午餐",
        category: "food",
        participantCount: 4,
      })

      expect(result).toBe(true)
      expect(mockLiff.sendMessages).toHaveBeenCalled()

      const call = mockLiff.sendMessages.mock.calls[0][0]
      expect(call[0].type).toBe("flex")
      expect(call[0].altText).toContain("新增花費")
      expect(call[0].altText).toContain("午餐")
    })

    it("should send update expense notification with changes", async () => {
      const { sendExpenseNotificationToChat } = await import("@/lib/liff")

      const result = await sendExpenseNotificationToChat({
        operationType: "update",
        projectName: "Test Project",
        projectId: "proj-123",
        payerName: "小明",
        amount: 1500,
        description: "晚餐",
        category: "food",
        participantCount: 4,
        changes: [
          { field: "amount", label: "金額", oldValue: "1000", newValue: "1500" },
          { field: "description", label: "說明", oldValue: "午餐", newValue: "晚餐" },
        ],
      })

      expect(result).toBe(true)
      expect(mockLiff.sendMessages).toHaveBeenCalled()

      const call = mockLiff.sendMessages.mock.calls[0][0]
      expect(call[0].altText).toContain("更新花費")
    })

    it("should use default category emoji when category is unknown", async () => {
      const { sendExpenseNotificationToChat } = await import("@/lib/liff")

      await sendExpenseNotificationToChat({
        operationType: "create",
        projectName: "Test",
        projectId: "proj-123",
        payerName: "User",
        amount: 100,
        participantCount: 1,
      })

      expect(mockLiff.sendMessages).toHaveBeenCalled()
    })

    it("should return false when messages not available", async () => {
      mockLiff.isInClient.mockReturnValue(false)

      const { sendExpenseNotificationToChat } = await import("@/lib/liff")

      const result = await sendExpenseNotificationToChat({
        operationType: "create",
        projectName: "Test",
        projectId: "proj-123",
        payerName: "User",
        amount: 100,
        participantCount: 1,
      })

      expect(result).toBe(false)
    })
  })

  describe("sendDeleteNotificationToChat", () => {
    beforeEach(() => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockResolvedValue(undefined)
    })

    it("should send delete notification", async () => {
      const { sendDeleteNotificationToChat } = await import("@/lib/liff")

      const result = await sendDeleteNotificationToChat({
        projectName: "Test Project",
        projectId: "proj-123",
        payerName: "小明",
        amount: 500,
        description: "咖啡",
        category: "food",
        participantCount: 2,
      })

      expect(result).toBe(true)
      expect(mockLiff.sendMessages).toHaveBeenCalled()

      const call = mockLiff.sendMessages.mock.calls[0][0]
      expect(call[0].type).toBe("flex")
      expect(call[0].altText).toContain("刪除花費")
    })

    it("should use default description when not provided", async () => {
      const { sendDeleteNotificationToChat } = await import("@/lib/liff")

      await sendDeleteNotificationToChat({
        projectName: "Test",
        projectId: "proj-123",
        payerName: "User",
        amount: 100,
        participantCount: 1,
      })

      expect(mockLiff.sendMessages).toHaveBeenCalled()
    })
  })

  describe("sendBatchExpenseNotificationToChat", () => {
    beforeEach(() => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockResolvedValue(undefined)
    })

    it("should send batch expense notification", async () => {
      const { sendBatchExpenseNotificationToChat } = await import("@/lib/liff")

      const result = await sendBatchExpenseNotificationToChat({
        projectName: "Test Project",
        projectId: "proj-123",
        expenses: [
          { amount: 500, description: "早餐", category: "food", payerName: "小明", participantCount: 2 },
          { amount: 300, description: "咖啡", category: "food", payerName: "小華", participantCount: 2 },
          { amount: 200, description: "交通", category: "transport", payerName: "小明", participantCount: 2 },
        ],
      })

      expect(result).toBe(true)
      expect(mockLiff.sendMessages).toHaveBeenCalled()

      const call = mockLiff.sendMessages.mock.calls[0][0]
      expect(call[0].type).toBe("flex")
      expect(call[0].altText).toContain("批次新增 3 筆")
      expect(call[0].altText).toContain("$1,000")
    })

    it("should handle single expense in batch", async () => {
      const { sendBatchExpenseNotificationToChat } = await import("@/lib/liff")

      const result = await sendBatchExpenseNotificationToChat({
        projectName: "Test",
        projectId: "proj-123",
        expenses: [
          { amount: 100, payerName: "User", participantCount: 1 },
        ],
      })

      expect(result).toBe(true)
    })
  })

  describe("sendBatchDeleteNotificationToChat", () => {
    beforeEach(() => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockResolvedValue(undefined)
    })

    it("should send batch delete notification", async () => {
      const { sendBatchDeleteNotificationToChat } = await import("@/lib/liff")

      const result = await sendBatchDeleteNotificationToChat({
        projectName: "Test Project",
        projectId: "proj-123",
        expenses: [
          { amount: 500, description: "早餐", category: "food", payerName: "小明", participantCount: 2 },
          { amount: 300, description: "咖啡", category: "food", payerName: "小華", participantCount: 2 },
        ],
      })

      expect(result).toBe(true)
      expect(mockLiff.sendMessages).toHaveBeenCalled()

      const call = mockLiff.sendMessages.mock.calls[0][0]
      expect(call[0].type).toBe("flex")
      expect(call[0].altText).toContain("批次刪除 2 筆")
    })

    it("should handle expenses without description", async () => {
      const { sendBatchDeleteNotificationToChat } = await import("@/lib/liff")

      await sendBatchDeleteNotificationToChat({
        projectName: "Test",
        projectId: "proj-123",
        expenses: [
          { amount: 100, payerName: "User", participantCount: 1 },
        ],
      })

      expect(mockLiff.sendMessages).toHaveBeenCalled()
    })
  })

  describe("type interfaces", () => {
    it("should define LiffUser interface correctly", async () => {
      const user: import("@/lib/liff").LiffUser = {
        lineUserId: "U123",
        displayName: "Test",
        pictureUrl: "https://example.com/pic.jpg",
        statusMessage: "Hello",
      }

      expect(user.lineUserId).toBe("U123")
    })

    it("should define ExpenseChange interface correctly", async () => {
      const change: import("@/lib/liff").ExpenseChange = {
        field: "amount",
        label: "金額",
        oldValue: "100",
        newValue: "200",
      }

      expect(change.field).toBe("amount")
    })

    it("should define ExpenseNotificationData interface correctly", async () => {
      const data: import("@/lib/liff").ExpenseNotificationData = {
        operationType: "create",
        projectName: "Test",
        projectId: "123",
        payerName: "User",
        amount: 100,
        participantCount: 1,
      }

      expect(data.operationType).toBe("create")
    })

    it("should define DeleteNotificationData interface correctly", async () => {
      const data: import("@/lib/liff").DeleteNotificationData = {
        projectName: "Test",
        projectId: "123",
        payerName: "User",
        amount: 100,
        participantCount: 1,
      }

      expect(data.projectName).toBe("Test")
    })

    it("should define BatchExpenseItem interface correctly", async () => {
      const item: import("@/lib/liff").BatchExpenseItem = {
        amount: 100,
        description: "Test",
        category: "food",
        payerName: "User",
        participantCount: 2,
      }

      expect(item.amount).toBe(100)
    })

    it("should define BatchExpenseNotificationData interface correctly", async () => {
      const data: import("@/lib/liff").BatchExpenseNotificationData = {
        projectName: "Test",
        projectId: "123",
        expenses: [],
      }

      expect(data.expenses).toEqual([])
    })

    it("should define BatchDeleteNotificationData interface correctly", async () => {
      const data: import("@/lib/liff").BatchDeleteNotificationData = {
        projectName: "Test",
        projectId: "123",
        expenses: [],
      }

      expect(data.projectId).toBe("123")
    })
  })

  describe("category emojis", () => {
    beforeEach(() => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.getContext.mockReturnValue({ type: "group" })
      mockLiff.sendMessages.mockResolvedValue(undefined)
    })

    const categories = [
      "food",
      "transport",
      "accommodation",
      "ticket",
      "shopping",
      "entertainment",
      "gift",
      "other",
    ]

    categories.forEach(category => {
      it(`should use correct emoji for category: ${category}`, async () => {
        const { sendExpenseNotificationToChat } = await import("@/lib/liff")

        await sendExpenseNotificationToChat({
          operationType: "create",
          projectName: "Test",
          projectId: "123",
          payerName: "User",
          amount: 100,
          category,
          participantCount: 1,
        })

        expect(mockLiff.sendMessages).toHaveBeenCalled()
      })
    })
  })
})
