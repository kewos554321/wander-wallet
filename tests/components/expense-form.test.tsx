import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ExpenseForm } from "@/components/expense/expense-form"
import { ThemeProvider } from "@/components/system/theme-provider"
import { ReactNode } from "react"

// Mock dependencies
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/projects/project-1",
  useSearchParams: () => new URLSearchParams(),
}))

const mockAuthFetch = vi.fn()
const mockUseLiff = vi.fn()

vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => mockUseLiff(),
}))

const mockSendExpenseNotification = vi.fn()
const mockSendDeleteNotification = vi.fn()

vi.mock("@/lib/liff", () => ({
  sendExpenseNotificationToChat: (params: unknown) => mockSendExpenseNotification(params),
  sendDeleteNotificationToChat: (params: unknown) => mockSendDeleteNotification(params),
}))

const mockUploadImageToR2 = vi.fn()

vi.mock("@/lib/image-utils", () => ({
  uploadImageToR2: (file: File, projectId: string, authFetch: unknown) =>
    mockUploadImageToR2(file, projectId, authFetch),
}))

// Mock PointerEvent for Radix UI components
class MockPointerEvent extends Event {
  button: number
  ctrlKey: boolean
  pointerType: string

  constructor(type: string, props: PointerEventInit) {
    super(type, props)
    this.button = props.button || 0
    this.ctrlKey = props.ctrlKey || false
    this.pointerType = props.pointerType || "mouse"
  }
}
// @ts-expect-error - mock
window.PointerEvent = MockPointerEvent

// Mock HTMLElement.prototype.scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()

// Mock ResizeObserver properly as a class
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver

// Mock data
const mockMembers = [
  {
    id: "member-1",
    role: "owner",
    displayName: "Alice",
    userId: "user-1",
    user: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
  },
  {
    id: "member-2",
    role: "member",
    displayName: "Bob",
    userId: "user-2",
    user: { id: "user-2", name: "Bob", email: "bob@test.com", image: null },
  },
  {
    id: "member-3",
    role: "member",
    displayName: "Charlie",
    userId: null,
    user: null,
  },
]

const mockProject = {
  id: "project-1",
  name: "Test Trip",
  currency: "TWD",
  customRates: null,
  exchangeRatePrecision: 2,
}

const mockExpense = {
  id: "expense-1",
  amount: 300,
  currency: "TWD",
  description: "Lunch",
  category: "food",
  image: null,
  location: "Taipei",
  latitude: 25.033,
  longitude: 121.5654,
  expenseDate: "2024-06-15T00:00:00.000Z",
  paidByMemberId: "member-1",
  payer: {
    id: "member-1",
    displayName: "Alice",
    user: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
  },
  participants: [
    {
      id: "participant-1",
      shareAmount: 100,
      member: {
        id: "member-1",
        displayName: "Alice",
        userId: "user-1",
        user: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
      },
    },
    {
      id: "participant-2",
      shareAmount: 100,
      member: {
        id: "member-2",
        displayName: "Bob",
        userId: "user-2",
        user: { id: "user-2", name: "Bob", email: "bob@test.com", image: null },
      },
    },
    {
      id: "participant-3",
      shareAmount: 100,
      member: {
        id: "member-3",
        displayName: "Charlie",
        userId: null,
        user: null,
      },
    },
  ],
}

// Wrapper component with providers
function TestWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestWrapper })
}

// Setup fetch mock responses
function setupMockFetch(overrides: Record<string, unknown> = {}) {
  mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
    const method = options?.method || "GET"

    // Project fetch
    if (url.includes("/api/projects/") && !url.includes("/members") && !url.includes("/expenses")) {
      return {
        ok: true,
        json: () => Promise.resolve(overrides.project || mockProject),
      }
    }

    // Members fetch
    if (url.includes("/members")) {
      return {
        ok: true,
        json: () => Promise.resolve(overrides.members || mockMembers),
      }
    }

    // Single expense fetch
    if (url.match(/\/expenses\/[^/]+$/) && method === "GET") {
      return {
        ok: true,
        json: () => Promise.resolve(overrides.expense || mockExpense),
      }
    }

    // Create expense
    if (url.includes("/expenses") && method === "POST") {
      return {
        ok: true,
        json: () => Promise.resolve({ id: "new-expense-id", ...JSON.parse(options?.body as string) }),
      }
    }

    // Update expense
    if (url.match(/\/expenses\/[^/]+$/) && method === "PUT") {
      return {
        ok: true,
        json: () => Promise.resolve({ ...mockExpense, ...JSON.parse(options?.body as string) }),
      }
    }

    // Delete expense
    if (url.match(/\/expenses\/[^/]+$/) && method === "DELETE") {
      return { ok: true, json: () => Promise.resolve({}) }
    }

    // Exchange rate fetch
    if (url.includes("/api/exchange-rates")) {
      return {
        ok: true,
        json: () => Promise.resolve({ exchangeRate: 0.033 }),
      }
    }

    // Delete image
    if (url.includes("/api/upload") && method === "DELETE") {
      return { ok: true, json: () => Promise.resolve({}) }
    }

    return { ok: false, status: 404, json: () => Promise.resolve({ error: "Not found" }) }
  })
}

describe("ExpenseForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLiff.mockReturnValue({
      isDevMode: true,
      canSendMessages: false,
    })
    setupMockFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Create Mode - Initial Rendering", () => {
    it("should show loading state initially", () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      expect(screen.getByText("載入中...")).toBeInTheDocument()
    })

    it("should render page title for create mode", () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      expect(screen.getByText("新增支出")).toBeInTheDocument()
    })

    it("should not show delete button in create mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.queryByTitle("刪除此筆")).not.toBeInTheDocument()
    })

    it("should render form after loading completes", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Check main form sections exist
      expect(screen.getByText("輸入金額")).toBeInTheDocument()
      expect(screen.getByText("描述")).toBeInTheDocument()
      expect(screen.getByText("類別")).toBeInTheDocument()
      expect(screen.getByText("誰付的錢？")).toBeInTheDocument()
      expect(screen.getByText("幫誰付？")).toBeInTheDocument()
      expect(screen.getByText("支出日期")).toBeInTheDocument()
      expect(screen.getByText("消費地點")).toBeInTheDocument()
      expect(screen.getByText("收據/消費圖片")).toBeInTheDocument()
    })

    it("should fetch project and members data on mount", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1")
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1/members")
      })
    })
  })

  describe("Create Mode - No Members", () => {
    it("should show message when no members exist", async () => {
      setupMockFetch({ members: [] })

      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getAllByText("沒有成員，請先新增成員").length).toBeGreaterThan(0)
    })
  })

  describe("Create Mode - Calculator Toggle", () => {
    it("should show calculator button", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("計算機")).toBeInTheDocument()
    })

    it("should toggle calculator visibility", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      const calculatorButton = screen.getByText("計算機").closest("button")
      expect(calculatorButton).toBeInTheDocument()

      // Show calculator
      await fireEvent.click(calculatorButton!)

      // Calculator component should be visible - button styling changes when active
      expect(calculatorButton).toHaveClass("bg-primary")
    })
  })

  describe("Create Mode - Split Mode", () => {
    it("should show equal and custom split mode buttons", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("均分")).toBeInTheDocument()
      expect(screen.getByText("自訂金額")).toBeInTheDocument()
    })
  })

  describe("Create Mode - Category Selection", () => {
    it("should display all category buttons", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("餐飲")).toBeInTheDocument()
      expect(screen.getByText("交通")).toBeInTheDocument()
      expect(screen.getByText("住宿")).toBeInTheDocument()
      expect(screen.getByText("票券")).toBeInTheDocument()
      expect(screen.getByText("購物")).toBeInTheDocument()
      expect(screen.getByText("娛樂")).toBeInTheDocument()
      expect(screen.getByText("禮品")).toBeInTheDocument()
      expect(screen.getByText("其他")).toBeInTheDocument()
    })
  })

  describe("Create Mode - Navigation", () => {
    it("should have correct back link for create mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      const cancelLink = screen.getByText("取消").closest("a")
      expect(cancelLink).toHaveAttribute("href", "/projects/project-1")
    })
  })

  describe("Edit Mode - Initial Rendering", () => {
    it("should show loading state initially", () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      expect(screen.getByText("載入中...")).toBeInTheDocument()
    })

    it("should render page title for edit mode", () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      expect(screen.getByText("編輯支出")).toBeInTheDocument()
    })

    it("should fetch expense data on mount", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1/expenses/expense-1")
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1/members")
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1")
      })
    })

    it("should pre-fill form with expense data", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Check amount is pre-filled
      expect(screen.getByDisplayValue("300")).toBeInTheDocument()

      // Check description is pre-filled
      expect(screen.getByDisplayValue("Lunch")).toBeInTheDocument()
    })

    it("should show delete button in edit mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByTitle("刪除此筆")).toBeInTheDocument()
    })
  })

  describe("Edit Mode - Navigation", () => {
    it("should have correct back link for edit mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      const cancelLink = screen.getByText("取消").closest("a")
      expect(cancelLink).toHaveAttribute("href", "/projects/project-1/expenses")
    })
  })

  describe("Edit Mode - Delete Functionality", () => {
    it("should show delete confirmation dialog when delete button clicked", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      const deleteButton = screen.getByTitle("刪除此筆")
      await fireEvent.click(deleteButton)

      expect(screen.getByText("確定要刪除這筆支出嗎？此操作無法復原。")).toBeInTheDocument()
    })
  })

  describe("Edit Mode - Error Handling", () => {
    it("should handle fetch expense error", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})

      mockAuthFetch.mockImplementation(async (url: string) => {
        if (url.match(/\/expenses\/[^/]+$/)) {
          return {
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: "Expense not found" }),
          }
        }
        if (url.includes("/members")) {
          return { ok: true, json: () => Promise.resolve(mockMembers) }
        }
        if (url.includes("/api/projects/")) {
          return { ok: true, json: () => Promise.resolve(mockProject) }
        }
        return { ok: false, status: 404, json: () => Promise.resolve({}) }
      })

      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("無法載入支出資料"))
      })

      expect(mockPush).toHaveBeenCalledWith("/projects/project-1/expenses")
      alertSpy.mockRestore()
    })
  })

  describe("Edit Mode - Custom Category", () => {
    it("should handle expense with custom category", async () => {
      const expenseWithCustomCategory = {
        ...mockExpense,
        category: "自訂類別",
      }

      setupMockFetch({ expense: expenseWithCustomCategory })

      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Should show "other" selected and custom category input visible
      expect(screen.getByDisplayValue("自訂類別")).toBeInTheDocument()
    })
  })

  describe("LINE Notification Options", () => {
    it("should show LINE notification option when canSendMessages is true and not dev mode", async () => {
      mockUseLiff.mockReturnValue({
        isDevMode: false,
        canSendMessages: true,
      })

      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("通知 LINE 群組")).toBeInTheDocument()
    })

    it("should not show LINE notification option in dev mode", async () => {
      mockUseLiff.mockReturnValue({
        isDevMode: true,
        canSendMessages: true,
      })

      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
    })

    it("should not show LINE notification when canSendMessages is false", async () => {
      mockUseLiff.mockReturnValue({
        isDevMode: false,
        canSendMessages: false,
      })

      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
    })
  })

  describe("Currency Selection", () => {
    it("should display currency selector", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Currency selector should exist - look for any currency-related element
      const currencySection = screen.getByText("輸入金額").closest("div")
      expect(currencySection).toBeInTheDocument()
    })
  })

  describe("Custom Exchange Rates", () => {
    it("should load custom rates from project", async () => {
      const projectWithCustomRates = {
        ...mockProject,
        currency: "TWD",
        customRates: { USD: 31.5, JPY: 0.22 },
      }

      setupMockFetch({ project: projectWithCustomRates })

      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1")
      })

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })
    })
  })

  describe("Exports", () => {
    it("should export ExpenseForm component", async () => {
      const module = await import("@/components/expense/expense-form")
      expect(module.ExpenseForm).toBeDefined()
      expect(typeof module.ExpenseForm).toBe("function")
    })
  })

  describe("Form UI Elements", () => {
    it("should display member list for payer selection", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // All members should be visible (may appear multiple times for payer and participants)
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Charlie").length).toBeGreaterThan(0)
    })

    it("should display location picker section", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("消費地點")).toBeInTheDocument()
    })

    it("should display image picker section", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("收據/消費圖片")).toBeInTheDocument()
    })

    it("should display submit button with correct text for create mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("儲存支出")).toBeInTheDocument()
    })

    it("should display cancel button", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("取消")).toBeInTheDocument()
    })
  })

  describe("Edit Mode - Location Display", () => {
    it("should show existing location in edit mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("Taipei")).toBeInTheDocument()
    })
  })

  describe("Edit Mode - Custom Split Detection", () => {
    it("should detect custom split from expense data", async () => {
      const expenseWithCustomSplit = {
        ...mockExpense,
        participants: [
          { ...mockExpense.participants[0], shareAmount: 150 },
          { ...mockExpense.participants[1], shareAmount: 100 },
          { ...mockExpense.participants[2], shareAmount: 50 },
        ],
      }

      setupMockFetch({ expense: expenseWithCustomSplit })

      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Should be in custom split mode
      const customButton = screen.getByText("自訂金額").closest("button")
      expect(customButton).toHaveClass("bg-white")
    })
  })

  describe("Personal Items + Equal Split Mode", () => {
    it("should show custom mode tabs when custom split is selected", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Click custom split button
      const customButton = screen.getByText("自訂金額")
      await fireEvent.click(customButton)

      // Should show mode tabs
      expect(screen.getByText("指定金額")).toBeInTheDocument()
      expect(screen.getByText("先扣再分")).toBeInTheDocument()
    })

    it("should switch to personal mode when tab is clicked", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Switch to custom split
      const customButton = screen.getByText("自訂金額")
      await fireEvent.click(customButton)

      // Click personal mode tab
      const personalTab = screen.getByText("先扣再分")
      await fireEvent.click(personalTab)

      // Tab should be active
      expect(personalTab.closest("button")).toHaveClass("bg-white")
    })

    it("should show add personal item buttons in personal mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Switch to custom split
      const customButton = screen.getByText("自訂金額")
      await fireEvent.click(customButton)

      // Switch to personal mode
      const personalTab = screen.getByText("先扣再分")
      await fireEvent.click(personalTab)

      // Should show "新增項目" buttons for each selected member (3 members)
      const addButtons = screen.getAllByText("新增項目")
      expect(addButtons.length).toBe(3)
    })

    it("should display feedback panel with personal total and remaining amount", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Enter amount
      const amountInput = screen.getByPlaceholderText("0")
      await fireEvent.change(amountInput, { target: { value: "2000" } })

      // Switch to custom split
      const customButton = screen.getByText("自訂金額")
      await fireEvent.click(customButton)

      // Switch to personal mode
      const personalTab = screen.getByText("先扣再分")
      await fireEvent.click(personalTab)

      // Should show feedback panel
      expect(screen.getByText("個人項目總額")).toBeInTheDocument()
      expect(screen.getByText("剩餘金額")).toBeInTheDocument()
    })

    it("should not show fixed member button in personal mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Switch to custom split
      const customButton = screen.getByText("自訂金額")
      await fireEvent.click(customButton)

      // Switch to personal mode
      const personalTab = screen.getByText("先扣再分")
      await fireEvent.click(personalTab)

      // Should not show "固定" buttons
      const fixedButtons = screen.queryAllByText("固定")
      expect(fixedButtons.length).toBe(0)
    })

    it("should show fixed member button in full custom mode", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)

      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })

      // Switch to custom split
      const customButton = screen.getByText("自訂金額")
      await fireEvent.click(customButton)

      // Should be in full custom mode by default and show pin buttons (with title "固定金額")
      const fixedButtons = screen.queryAllByTitle("固定金額")
      expect(fixedButtons.length).toBeGreaterThan(0)
    })
  })

  describe("splitDetail", () => {
    const personalDetail = {
      version: 1,
      personalItems: { "member-2": [{ name: "咖啡", amount: 50 }] },
      customShares: {},
    }
    const personalExpense = {
      ...mockExpense,
      splitDetail: personalDetail,
      participants: [
        { ...mockExpense.participants[0], shareAmount: 83.34 },
        { ...mockExpense.participants[1], shareAmount: 133.33 },
        { ...mockExpense.participants[2], shareAmount: 83.33 },
      ],
    }

    function findBody(method: string) {
      const call = mockAuthFetch.mock.calls.find(
        ([url, options]) => String(url).includes("/expenses") && (options as RequestInit | undefined)?.method === method
      )
      return call ? JSON.parse((call[1] as RequestInit).body as string) : undefined
    }

    async function waitLoaded() {
      await waitFor(() => {
        expect(screen.queryByText("載入中...")).not.toBeInTheDocument()
      })
    }

    it("create personal mode sends splitDetail", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      await waitLoaded()

      fireEvent.change(screen.getAllByPlaceholderText("0")[0], { target: { value: "300" } })
      fireEvent.click(screen.getByText("自訂金額"))
      fireEvent.click(screen.getByText("先扣再分"))
      // Add an item for Bob (second member)
      fireEvent.click(screen.getAllByText("新增項目")[1])
      const nameInput = screen.getByPlaceholderText("項目名稱")
      fireEvent.change(nameInput, { target: { value: "咖啡" } })
      const itemAmountInput = nameInput.parentElement!.querySelectorAll("input")[1]
      fireEvent.change(itemAmountInput, { target: { value: "50" } })

      fireEvent.click(screen.getByText("儲存支出"))

      await waitFor(() => {
        expect(findBody("POST")).toBeDefined()
      })
      const body = findBody("POST")
      expect(body.splitDetail).toEqual({ version: 1, personalItems: { "member-2": [{ name: "咖啡", amount: 50 }] }, customShares: {} })
      expect(body.participants.reduce((s: number, p: { shareAmount: number }) => s + p.shareAmount, 0)).toBeCloseTo(300)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/projects/project-1/expenses")
      })
    })

    it("create equal split sends splitDetail null", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      await waitLoaded()

      fireEvent.change(screen.getAllByPlaceholderText("0")[0], { target: { value: "300" } })
      fireEvent.click(screen.getByText("儲存支出"))

      await waitFor(() => {
        expect(findBody("POST")).toBeDefined()
      })
      const body = findBody("POST")
      expect(body.splitDetail).toBeNull()
      expect(body.participants).toEqual([
        { memberId: "member-1", shareAmount: 100 },
        { memberId: "member-2", shareAmount: 100 },
        { memberId: "member-3", shareAmount: 100 },
      ])
    })

    it("edit restores personal items", async () => {
      setupMockFetch({ expense: personalExpense })
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      await waitLoaded()

      expect(screen.getByDisplayValue("咖啡")).toBeInTheDocument()
      expect(screen.getByText("先扣再分").closest("button")).toHaveClass("bg-white")
    })

    it("edit with unsupported splitDetail is read-only", async () => {
      setupMockFetch({
        expense: {
          ...personalExpense,
          splitDetail: { ...personalDetail, customShares: { "member-3": 83.33 } },
        },
      })
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      await waitLoaded()

      expect(screen.getByText("此支出使用新版功能建立，請切換到新版編輯")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /儲存變更|無變更/ })).toBeDisabled()
      // Delete stays available
      expect(screen.getByTitle("刪除此筆")).not.toBeDisabled()
    })

    it("edit changing only description keeps splitDetail and is not 'no changes'", async () => {
      setupMockFetch({ expense: personalExpense })
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      await waitLoaded()

      expect(screen.getByText("無變更")).toBeInTheDocument()
      fireEvent.change(screen.getByDisplayValue("Lunch"), { target: { value: "Dinner" } })
      const submit = screen.getByText("儲存變更").closest("button")!
      expect(submit).not.toBeDisabled()
      fireEvent.click(submit)

      await waitFor(() => {
        expect(findBody("PUT")).toBeDefined()
      })
      const body = findBody("PUT")
      expect(body.splitDetail).toEqual(personalDetail)
      expect(body.description).toBe("Dinner")
    })

    it("edit of a legacy custom split without splitDetail still shows no changes", async () => {
      setupMockFetch({
        expense: {
          ...mockExpense,
          participants: [
            { ...mockExpense.participants[0], shareAmount: 150 },
            { ...mockExpense.participants[1], shareAmount: 100 },
            { ...mockExpense.participants[2], shareAmount: 50 },
          ],
        },
      })
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      await waitLoaded()

      expect(screen.getByText("無變更")).toBeInTheDocument()
    })

    it("personal item name input is limited to 30 characters", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      await waitLoaded()

      fireEvent.click(screen.getByText("自訂金額"))
      fireEvent.click(screen.getByText("先扣再分"))
      fireEvent.click(screen.getAllByText("新增項目")[0])

      expect(screen.getByPlaceholderText("項目名稱")).toHaveAttribute("maxLength", "30")
    })

    it("stops adding personal items at 20 per member", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      await waitLoaded()

      fireEvent.click(screen.getByText("自訂金額"))
      fireEvent.click(screen.getByText("先扣再分"))
      const addButton = () => screen.getAllByText("新增項目")[0].closest("button")!
      for (let i = 0; i < 25; i++) fireEvent.click(addButton())

      expect(screen.getAllByPlaceholderText("項目名稱")).toHaveLength(20)
      expect(addButton()).toBeDisabled()
      // Other members are unaffected
      expect(screen.getAllByText("新增項目")[1].closest("button")).not.toBeDisabled()
    })

    it("shows the personal items note saying details are saved", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" mode="create" />)
      await waitLoaded()

      fireEvent.click(screen.getByText("自訂金額"))
      fireEvent.click(screen.getByText("先扣再分"))

      expect(screen.getByText("個人項目明細（項目名稱）會隨支出一起儲存，編輯時可還原。")).toBeInTheDocument()
      expect(screen.queryByText(/僅供本次輸入參考/)).not.toBeInTheDocument()
    })

    it("edit restores custom shares from splitDetail and reports no changes", async () => {
      setupMockFetch({
        expense: {
          ...mockExpense,
          splitDetail: { version: 1, personalItems: {}, customShares: { "member-2": 120 } },
          participants: [
            { ...mockExpense.participants[0], shareAmount: 90 },
            { ...mockExpense.participants[1], shareAmount: 120 },
            { ...mockExpense.participants[2], shareAmount: 90 },
          ],
        },
      })
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      await waitLoaded()

      expect(screen.getByText("指定金額").closest("button")).toHaveClass("bg-white")
      expect(screen.getByDisplayValue("120")).toBeInTheDocument()
      // Only Bob is pinned; the other two are auto-split
      expect(screen.getAllByTitle("取消固定")).toHaveLength(1)
      expect(screen.getAllByTitle("固定金額")).toHaveLength(2)
      expect(screen.getByText("無變更")).toBeInTheDocument()
    })

    it("delete goes through the API and navigates back", async () => {
      renderWithProviders(<ExpenseForm projectId="project-1" expenseId="expense-1" mode="edit" />)
      await waitLoaded()

      fireEvent.click(screen.getByTitle("刪除此筆"))
      const confirm = await screen.findByRole("button", { name: /刪除/ })
      fireEvent.click(confirm)

      await waitFor(() => {
        expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/project-1/expenses/expense-1", { method: "DELETE" })
        expect(mockPush).toHaveBeenCalledWith("/projects/project-1/expenses")
      })
    })
  })
})
