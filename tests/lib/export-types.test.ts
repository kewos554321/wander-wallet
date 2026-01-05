import { describe, it, expect } from "vitest"
import {
  defaultExportOptions,
  type ExportFormat,
  type ExportContentOptions,
  type ExportFilterOptions,
  type ExportOptions,
  type ExpenseExportData,
  type SettlementExportData,
  type MemberBalanceData,
  type CategoryBreakdownData,
  type StatisticsExportData,
  type ExportData,
} from "@/lib/export/types"

describe("Export Types (lib/export/types.ts)", () => {
  describe("defaultExportOptions", () => {
    it("should have csv as default format", () => {
      expect(defaultExportOptions.format).toBe("csv")
    })

    it("should have expenseDetails enabled by default", () => {
      expect(defaultExportOptions.content.expenseDetails).toBe(true)
    })

    it("should have settlementInfo enabled by default", () => {
      expect(defaultExportOptions.content.settlementInfo).toBe(true)
    })

    it("should have statisticsSummary disabled by default", () => {
      expect(defaultExportOptions.content.statisticsSummary).toBe(false)
    })

    it("should have empty filters by default", () => {
      expect(defaultExportOptions.filters).toEqual({})
    })
  })

  describe("type definitions", () => {
    it("should accept valid ExportFormat", () => {
      const csvFormat: ExportFormat = "csv"
      const pdfFormat: ExportFormat = "pdf"
      expect(csvFormat).toBe("csv")
      expect(pdfFormat).toBe("pdf")
    })

    it("should accept valid ExportContentOptions", () => {
      const options: ExportContentOptions = {
        expenseDetails: true,
        settlementInfo: false,
        statisticsSummary: true,
      }
      expect(options.expenseDetails).toBe(true)
      expect(options.settlementInfo).toBe(false)
      expect(options.statisticsSummary).toBe(true)
    })

    it("should accept valid ExportFilterOptions", () => {
      const options: ExportFilterOptions = {
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-12-31"),
        },
        categories: ["food", "transport"],
      }
      expect(options.dateRange?.start).toBeInstanceOf(Date)
      expect(options.categories).toHaveLength(2)
    })

    it("should accept ExportFilterOptions with null dates", () => {
      const options: ExportFilterOptions = {
        dateRange: {
          start: null,
          end: null,
        },
      }
      expect(options.dateRange?.start).toBeNull()
      expect(options.dateRange?.end).toBeNull()
    })

    it("should accept valid ExpenseExportData", () => {
      const expense: ExpenseExportData = {
        id: "exp-1",
        date: "2024-01-15T00:00:00.000Z",
        description: "Lunch",
        category: "food",
        categoryLabel: "餐飲",
        amount: 500,
        payer: "Alice",
        participants: ["Alice", "Bob"],
        participantShares: [
          { name: "Alice", amount: 250 },
          { name: "Bob", amount: 250 },
        ],
      }
      expect(expense.id).toBe("exp-1")
      expect(expense.amount).toBe(500)
    })

    it("should accept valid SettlementExportData", () => {
      const settlement: SettlementExportData = {
        from: "Bob",
        to: "Alice",
        amount: 100,
      }
      expect(settlement.from).toBe("Bob")
      expect(settlement.to).toBe("Alice")
      expect(settlement.amount).toBe(100)
    })

    it("should accept valid MemberBalanceData", () => {
      const balance: MemberBalanceData = {
        name: "Alice",
        paid: 1000,
        share: 800,
        balance: 200,
      }
      expect(balance.name).toBe("Alice")
      expect(balance.balance).toBe(200)
    })

    it("should accept valid CategoryBreakdownData", () => {
      const breakdown: CategoryBreakdownData = {
        category: "food",
        label: "餐飲",
        amount: 5000,
        count: 10,
        percentage: 50,
      }
      expect(breakdown.category).toBe("food")
      expect(breakdown.percentage).toBe(50)
    })

    it("should accept valid StatisticsExportData", () => {
      const stats: StatisticsExportData = {
        totalExpenses: 20,
        totalAmount: 10000,
        perPerson: 2500,
        memberCount: 4,
        categoryBreakdown: [],
        memberBreakdown: [],
      }
      expect(stats.totalExpenses).toBe(20)
      expect(stats.memberCount).toBe(4)
    })

    it("should accept valid ExportData", () => {
      const exportData: ExportData = {
        projectName: "Trip to Japan",
        exportDate: "2024-01-20T00:00:00.000Z",
        currency: "TWD",
        expenses: [],
        settlements: [],
        statistics: {
          totalExpenses: 0,
          totalAmount: 0,
          perPerson: 0,
          memberCount: 0,
          categoryBreakdown: [],
          memberBreakdown: [],
        },
      }
      expect(exportData.projectName).toBe("Trip to Japan")
      expect(exportData.currency).toBe("TWD")
    })

    it("should accept valid ExportOptions", () => {
      const options: ExportOptions = {
        format: "pdf",
        content: {
          expenseDetails: true,
          settlementInfo: true,
          statisticsSummary: true,
        },
        filters: {},
        projectName: "My Project",
      }
      expect(options.format).toBe("pdf")
      expect(options.projectName).toBe("My Project")
    })
  })
})
