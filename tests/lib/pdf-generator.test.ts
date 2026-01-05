import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock jsPDF
const mockJsPDFInstance = {
  setFontSize: vi.fn(),
  text: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  getNumberOfPages: vi.fn().mockReturnValue(1),
  setPage: vi.fn(),
  output: vi.fn().mockReturnValue(new Blob(["pdf content"], { type: "application/pdf" })),
  addFileToVFS: vi.fn(),
  addFont: vi.fn(),
  setFont: vi.fn(),
  lastAutoTable: { finalY: 100 },
}

vi.mock("jspdf", () => {
  return {
    jsPDF: class MockJsPDF {
      constructor() {
        Object.assign(this, mockJsPDFInstance)
      }
    },
  }
})

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}))

// Mock fetch for font loading
const mockFetch = vi.fn()
global.fetch = mockFetch

import { generatePDF, downloadPDF } from "@/lib/export/pdf-generator"
import type { ExportData, ExportOptions } from "@/lib/export/types"

const mockExportData: ExportData = {
  projectName: "日本東京之旅",
  exportDate: "2024-12-01",
  currency: "JPY",
  expenses: [
    {
      date: "2024-12-01",
      amount: 1500,
      description: "午餐拉麵",
      categoryLabel: "餐飲",
      payer: "小明",
      participants: ["小明", "小華"],
      participantShares: [
        { name: "小明", share: 750 },
        { name: "小華", share: 750 },
      ],
    },
    {
      date: "2024-12-02",
      amount: 3000,
      description: "新幹線車票",
      categoryLabel: "交通",
      payer: "小華",
      participants: ["小明", "小華"],
      participantShares: [
        { name: "小明", share: 1500 },
        { name: "小華", share: 1500 },
      ],
    },
  ],
  settlements: [
    { from: "小明", to: "小華", amount: 750 },
  ],
  statistics: {
    totalExpenses: 2,
    totalAmount: 4500,
    memberCount: 2,
    perPerson: 2250,
    categoryBreakdown: [
      { label: "餐飲", amount: 1500, count: 1, percentage: 33.33 },
      { label: "交通", amount: 3000, count: 1, percentage: 66.67 },
    ],
    memberBreakdown: [
      { name: "小明", paid: 1500, share: 2250, balance: -750 },
      { name: "小華", paid: 3000, share: 2250, balance: 750 },
    ],
  },
}

const defaultOptions: ExportOptions = {
  content: {
    expenseDetails: true,
    settlementInfo: true,
    statisticsSummary: true,
  },
  filters: {},
  projectName: "日本東京之旅",
}

describe("generatePDF", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    })
    mockJsPDFInstance.getNumberOfPages.mockReturnValue(1)
  })

  it("should generate PDF with all sections", async () => {
    const blob = await generatePDF(mockExportData, defaultOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(mockJsPDFInstance.setFontSize).toHaveBeenCalled()
    expect(mockJsPDFInstance.text).toHaveBeenCalled()
    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should register Chinese font", async () => {
    await generatePDF(mockExportData, defaultOptions)

    // Font may be cached from previous calls, so we verify registration
    expect(mockJsPDFInstance.addFileToVFS).toHaveBeenCalled()
    expect(mockJsPDFInstance.addFont).toHaveBeenCalled()
    expect(mockJsPDFInstance.setFont).toHaveBeenCalledWith("NotoSansTC")
  })

  it("should handle font loading failure gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const blob = await generatePDF(mockExportData, defaultOptions)

    expect(blob).toBeInstanceOf(Blob)
  })

  it("should skip expense details when disabled", async () => {
    const options: ExportOptions = {
      ...defaultOptions,
      content: {
        ...defaultOptions.content,
        expenseDetails: false,
      },
    }

    await generatePDF(mockExportData, options)

    // Should still generate PDF without error
    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should skip settlement info when disabled", async () => {
    const options: ExportOptions = {
      ...defaultOptions,
      content: {
        ...defaultOptions.content,
        settlementInfo: false,
      },
    }

    await generatePDF(mockExportData, options)

    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should skip statistics when disabled", async () => {
    const options: ExportOptions = {
      ...defaultOptions,
      content: {
        ...defaultOptions.content,
        statisticsSummary: false,
      },
    }

    await generatePDF(mockExportData, options)

    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should handle empty expenses", async () => {
    const data: ExportData = {
      ...mockExportData,
      expenses: [],
    }

    await generatePDF(data, defaultOptions)

    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should handle empty settlements", async () => {
    const data: ExportData = {
      ...mockExportData,
      settlements: [],
    }

    await generatePDF(data, defaultOptions)

    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should handle empty category breakdown", async () => {
    const data: ExportData = {
      ...mockExportData,
      statistics: {
        ...mockExportData.statistics,
        categoryBreakdown: [],
      },
    }

    await generatePDF(data, defaultOptions)

    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should handle empty member breakdown", async () => {
    const data: ExportData = {
      ...mockExportData,
      statistics: {
        ...mockExportData.statistics,
        memberBreakdown: [],
      },
    }

    await generatePDF(data, defaultOptions)

    expect(mockJsPDFInstance.output).toHaveBeenCalledWith("blob")
  })

  it("should add page numbers", async () => {
    mockJsPDFInstance.getNumberOfPages.mockReturnValue(3)

    await generatePDF(mockExportData, defaultOptions)

    expect(mockJsPDFInstance.setPage).toHaveBeenCalledWith(1)
    expect(mockJsPDFInstance.setPage).toHaveBeenCalledWith(2)
    expect(mockJsPDFInstance.setPage).toHaveBeenCalledWith(3)
  })

  it("should use TWD currency", async () => {
    const data: ExportData = {
      ...mockExportData,
      currency: "TWD",
    }

    const blob = await generatePDF(data, defaultOptions)

    expect(blob).toBeInstanceOf(Blob)
  })

  it("should use USD currency", async () => {
    const data: ExportData = {
      ...mockExportData,
      currency: "USD",
    }

    const blob = await generatePDF(data, defaultOptions)

    expect(blob).toBeInstanceOf(Blob)
  })
})

describe("downloadPDF", () => {
  beforeEach(() => {
    // Mock DOM methods
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    }
    vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as unknown as Node)
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as unknown as Node)
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  })

  it("should create download link and click it", () => {
    const blob = new Blob(["pdf content"], { type: "application/pdf" })

    downloadPDF(blob, "test-report.pdf")

    expect(document.createElement).toHaveBeenCalledWith("a")
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(document.body.appendChild).toHaveBeenCalled()
    expect(document.body.removeChild).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
  })

  it("should add .pdf extension if missing", () => {
    const blob = new Blob(["pdf content"], { type: "application/pdf" })
    const mockLink = { href: "", download: "", click: vi.fn() }
    vi.mocked(document.createElement).mockReturnValue(mockLink as unknown as HTMLAnchorElement)

    downloadPDF(blob, "test-report")

    expect(mockLink.download).toBe("test-report.pdf")
  })

  it("should not duplicate .pdf extension", () => {
    const blob = new Blob(["pdf content"], { type: "application/pdf" })
    const mockLink = { href: "", download: "", click: vi.fn() }
    vi.mocked(document.createElement).mockReturnValue(mockLink as unknown as HTMLAnchorElement)

    downloadPDF(blob, "test-report.pdf")

    expect(mockLink.download).toBe("test-report.pdf")
  })
})
