import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExportOptionsForm } from "@/components/export/export-options-form"
import type { ExportFormat, ExportContentOptions, ExportFilterOptions } from "@/lib/export/types"

describe("ExportOptionsForm Component", () => {
  const defaultContent: ExportContentOptions = {
    expenseDetails: true,
    settlementInfo: true,
    statisticsSummary: false,
  }

  const defaultFilters: ExportFilterOptions = {}

  describe("format selection", () => {
    it("should render CSV format option", () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("CSV")).toBeInTheDocument()
      expect(screen.getByText("Excel 相容")).toBeInTheDocument()
    })

    it("should render PDF format option", () => {
      render(
        <ExportOptionsForm
          format="pdf"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("PDF")).toBeInTheDocument()
      expect(screen.getByText("可列印報表")).toBeInTheDocument()
    })

    it("should call onFormatChange when CSV is clicked", async () => {
      const onFormatChange = vi.fn()

      render(
        <ExportOptionsForm
          format="pdf"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={onFormatChange}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      const csvButton = screen.getByText("CSV").closest("button")
      await fireEvent.click(csvButton!)

      expect(onFormatChange).toHaveBeenCalledWith("csv")
    })

    it("should call onFormatChange when PDF is clicked", async () => {
      const onFormatChange = vi.fn()

      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={onFormatChange}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      const pdfButton = screen.getByText("PDF").closest("button")
      await fireEvent.click(pdfButton!)

      expect(onFormatChange).toHaveBeenCalledWith("pdf")
    })
  })

  describe("content options", () => {
    it("should render expense details option", () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("支出明細")).toBeInTheDocument()
    })

    it("should render settlement info option", () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("結算資訊")).toBeInTheDocument()
    })

    it("should render statistics summary option", () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("統計摘要")).toBeInTheDocument()
    })

    it("should call onContentChange when toggling expense details", async () => {
      const onContentChange = vi.fn()

      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={onContentChange}
          onFiltersChange={vi.fn()}
        />
      )

      const expenseLabel = screen.getByText("支出明細").closest("label")
      await fireEvent.click(expenseLabel!)

      expect(onContentChange).toHaveBeenCalledWith({
        ...defaultContent,
        expenseDetails: false,
      })
    })
  })

  describe("filter options", () => {
    it("should show '新增篩選' button when filters are not active", () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("新增篩選")).toBeInTheDocument()
    })

    it("should show filter panel when 新增篩選 is clicked", async () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      const addFilterButton = screen.getByText("新增篩選")
      await fireEvent.click(addFilterButton)

      expect(screen.getByText("日期範圍")).toBeInTheDocument()
      expect(screen.getByText("分類篩選")).toBeInTheDocument()
    })

    it("should show 清除篩選 button when filters are active", async () => {
      const filtersWithDate: ExportFilterOptions = {
        dateRange: {
          start: new Date("2024-01-01"),
          end: null,
        },
      }

      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={filtersWithDate}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("清除篩選")).toBeInTheDocument()
    })

    it("should call onFiltersChange to clear when 清除篩選 is clicked", async () => {
      const onFiltersChange = vi.fn()
      const filtersWithDate: ExportFilterOptions = {
        dateRange: {
          start: new Date("2024-01-01"),
          end: null,
        },
      }

      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={filtersWithDate}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={onFiltersChange}
        />
      )

      const clearButton = screen.getByText("清除篩選")
      await fireEvent.click(clearButton)

      expect(onFiltersChange).toHaveBeenCalledWith({})
    })

    it("should show category filter buttons", async () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      // Click to show filters
      await fireEvent.click(screen.getByText("新增篩選"))

      // Should show category buttons (from CATEGORIES constant)
      expect(screen.getByText("餐飲")).toBeInTheDocument()
      expect(screen.getByText("交通")).toBeInTheDocument()
    })

    it("should call onFiltersChange when category is selected", async () => {
      const onFiltersChange = vi.fn()

      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={onFiltersChange}
        />
      )

      // Click to show filters
      await fireEvent.click(screen.getByText("新增篩選"))

      // Click a category
      const foodButton = screen.getByText("餐飲")
      await fireEvent.click(foodButton)

      expect(onFiltersChange).toHaveBeenCalledWith({
        categories: ["food"],
      })
    })

    it("should show selected category count", () => {
      const filtersWithCategories: ExportFilterOptions = {
        categories: ["food", "transport"],
      }

      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={filtersWithCategories}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      expect(screen.getByText("已選 2 個分類")).toBeInTheDocument()
    })
  })

  describe("date picker", () => {
    it("should show date range pickers when filters are visible", async () => {
      render(
        <ExportOptionsForm
          format="csv"
          content={defaultContent}
          filters={defaultFilters}
          onFormatChange={vi.fn()}
          onContentChange={vi.fn()}
          onFiltersChange={vi.fn()}
        />
      )

      await fireEvent.click(screen.getByText("新增篩選"))

      expect(screen.getByText("開始日期")).toBeInTheDocument()
      expect(screen.getByText("結束日期")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export ExportOptionsForm component", () => {
      expect(ExportOptionsForm).toBeDefined()
      expect(typeof ExportOptionsForm).toBe("function")
    })
  })
})
