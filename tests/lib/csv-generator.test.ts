import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { generateCSV, downloadCSV } from "@/lib/export/csv-generator"
import type { ExportData, ExportOptions } from "@/lib/export/types"

const mockExportData: ExportData = {
  projectName: "日本旅行",
  exportDate: "2024-12-01T00:00:00.000Z",
  currency: "TWD",
  expenses: [
    {
      id: "expense-1",
      date: "2024-11-15T00:00:00.000Z",
      description: "午餐拉麵",
      category: "food",
      categoryLabel: "餐飲",
      amount: 350,
      payer: "小明",
      participants: ["小明", "小華"],
      participantShares: [{ name: "小明", amount: 175 }, { name: "小華", amount: 175 }],
    },
    {
      id: "expense-2",
      date: "2024-11-15T00:00:00.000Z",
      description: "計程車",
      category: "transport",
      categoryLabel: "交通",
      amount: 500,
      payer: "小華",
      participants: ["小明", "小華"],
      participantShares: [{ name: "小明", amount: 250 }, { name: "小華", amount: 250 }],
    },
  ],
  settlements: [
    { from: "小明", to: "小華", amount: 75 },
  ],
  statistics: {
    totalExpenses: 2,
    totalAmount: 850,
    memberCount: 2,
    perPerson: 425,
    categoryBreakdown: [
      { category: "food", label: "餐飲", amount: 350, count: 1, percentage: 41.2 },
      { category: "transport", label: "交通", amount: 500, count: 1, percentage: 58.8 },
    ],
    memberBreakdown: [
      { name: "小明", paid: 350, share: 425, balance: -75 },
      { name: "小華", paid: 500, share: 425, balance: 75 },
    ],
  },
}

const defaultOptions: ExportOptions = {
  format: "csv",
  content: {
    expenseDetails: true,
    settlementInfo: true,
    statisticsSummary: true,
  },
  filters: {},
  projectName: "日本旅行",
}

describe("generateCSV", () => {
  it("should include BOM for Excel UTF-8 support", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv.startsWith("\ufeff")).toBe(true)
  })

  it("should include project name", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("專案名稱:")
    expect(csv).toContain("日本旅行")
  })

  it("should include export date", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("匯出日期:")
  })

  it("should include expense details when enabled", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("【支出明細】")
    expect(csv).toContain("午餐拉麵")
    expect(csv).toContain("計程車")
    expect(csv).toContain("小明")
    expect(csv).toContain("小華")
  })

  it("should include expense headers", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("日期")
    expect(csv).toContain("描述")
    expect(csv).toContain("類別")
    expect(csv).toContain("金額")
    expect(csv).toContain("付款人")
    expect(csv).toContain("分擔者")
  })

  it("should include settlement info when enabled", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("【結算資訊】")
    expect(csv).toContain("付款人")
    expect(csv).toContain("收款人")
  })

  it("should show no settlement message when empty", () => {
    const dataWithNoSettlements = {
      ...mockExportData,
      settlements: [],
    }
    const csv = generateCSV(dataWithNoSettlements, defaultOptions)
    expect(csv).toContain("所有人已結清，無需轉帳")
  })

  it("should include statistics summary when enabled", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("【統計摘要】")
    expect(csv).toContain("支出筆數")
    expect(csv).toContain("總金額")
    expect(csv).toContain("成員人數")
    expect(csv).toContain("人均金額")
  })

  it("should include category breakdown", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("【分類統計】")
    expect(csv).toContain("餐飲")
    expect(csv).toContain("交通")
  })

  it("should include member breakdown", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("【成員餘額】")
    expect(csv).toContain("已付金額")
    expect(csv).toContain("應分擔")
    expect(csv).toContain("餘額")
  })

  it("should exclude expense details when disabled", () => {
    const options = {
      ...defaultOptions,
      content: { ...defaultOptions.content, expenseDetails: false },
    }
    const csv = generateCSV(mockExportData, options)
    expect(csv).not.toContain("【支出明細】")
  })

  it("should exclude settlement info when disabled", () => {
    const options = {
      ...defaultOptions,
      content: { ...defaultOptions.content, settlementInfo: false },
    }
    const csv = generateCSV(mockExportData, options)
    expect(csv).not.toContain("【結算資訊】")
  })

  it("should exclude statistics when disabled", () => {
    const options = {
      ...defaultOptions,
      content: { ...defaultOptions.content, statisticsSummary: false },
    }
    const csv = generateCSV(mockExportData, options)
    expect(csv).not.toContain("【統計摘要】")
  })

  it("should escape CSV special characters", () => {
    const dataWithSpecialChars = {
      ...mockExportData,
      expenses: [
        {
          id: "expense-1",
          date: "2024-11-15T00:00:00.000Z",
          description: 'Description with "quotes" and, commas',
          category: "food",
          categoryLabel: "餐飲",
          amount: 100,
          payer: "小明",
          participants: ["小明"],
          participantShares: [{ name: "小明", amount: 100 }],
        },
      ],
    }
    const csv = generateCSV(dataWithSpecialChars, defaultOptions)
    expect(csv).toContain('""quotes""')
  })

  it("should handle empty expenses array", () => {
    const dataWithNoExpenses = {
      ...mockExportData,
      expenses: [],
    }
    const csv = generateCSV(dataWithNoExpenses, defaultOptions)
    expect(csv).not.toContain("【支出明細】")
  })

  it("should format amounts correctly", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("350")
    expect(csv).toContain("500")
  })

  it("should join participants with separator", () => {
    const csv = generateCSV(mockExportData, defaultOptions)
    expect(csv).toContain("小明、小華")
  })
})

describe("downloadCSV", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    createObjectURLSpy = vi.fn().mockReturnValue("blob:test-url")
    revokeObjectURLSpy = vi.fn()

    mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
    }

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return mockAnchor as unknown as HTMLAnchorElement
      }
      return document.createElement(tag)
    })
    vi.spyOn(document.body, "appendChild").mockImplementation(() => null as unknown as Node)
    vi.spyOn(document.body, "removeChild").mockImplementation(() => null as unknown as Node)

    URL.createObjectURL = createObjectURLSpy
    URL.revokeObjectURL = revokeObjectURLSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should create blob URL", () => {
    downloadCSV("test content", "test.csv")
    expect(createObjectURLSpy).toHaveBeenCalled()
  })

  it("should set download filename", () => {
    downloadCSV("test content", "my-report.csv")
    expect(mockAnchor.download).toBe("my-report.csv")
  })

  it("should add .csv extension if missing", () => {
    downloadCSV("test content", "filename")
    expect(mockAnchor.download).toBe("filename.csv")
  })

  it("should trigger click to download", () => {
    downloadCSV("test content", "test.csv")
    expect(mockAnchor.click).toHaveBeenCalled()
  })

  it("should revoke object URL after download", () => {
    downloadCSV("test content", "test.csv")
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url")
  })

  it("should export downloadCSV function", () => {
    expect(downloadCSV).toBeDefined()
    expect(typeof downloadCSV).toBe("function")
  })
})
