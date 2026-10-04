"use client"

import { useCallback, useMemo, useState } from "react"
import { useCurrencyConversion, useProjectData } from "@/lib/hooks"
import { useProjectExpenses } from "@/lib/hooks/useProjectExpenses"
import { defaultExportOptions } from "@/lib/export/types"
import type { ExportContentOptions, ExportFilterOptions, ExportFormat } from "@/lib/export/types"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { buildExportData } from "./export-data"
import { ExportV2View } from "./export-v2-view"

export function ExportV2({ projectId }: { projectId: string }) {
  const { project, members, projectCurrency, customRates, precision } = useProjectData(projectId)
  const { expenses } = useProjectExpenses(projectId, { projectName: project?.name ?? "" })
  const { exchangeRates } = useCurrencyConversion({ projectCurrency, customRates, precision })

  const [format, setFormat] = useState<ExportFormat>(defaultExportOptions.format)
  const [content, setContent] = useState<ExportContentOptions>(defaultExportOptions.content)
  const [filters, setFilters] = useState<ExportFilterOptions>(defaultExportOptions.filters)
  const [exporting, setExporting] = useState(false)

  const projectName = project?.name ?? ""
  const data = useMemo(
    () => buildExportData({ projectName, projectCurrency, members, expenses, filters, ctx: { projectCurrency, customRates, exchangeRates } }),
    [projectName, projectCurrency, members, expenses, filters, customRates, exchangeRates]
  )

  const handleExport = useCallback(async () => {
    if (exporting || data.expenses.length === 0) return
    setExporting(true)
    try {
      const options = { format, content, filters, projectName }
      if (format === "csv") {
        const { generateCSV, downloadCSV } = await import("@/lib/export/csv-generator")
        downloadCSV(generateCSV(data, options), `${projectName}_匯出`)
      } else {
        const { generatePDF, downloadPDF } = await import("@/lib/export/pdf-generator")
        downloadPDF(await generatePDF(data, options), `${projectName}_匯出`)
      }
    } catch (error) {
      console.error("匯出失敗:", error)
      alert("匯出失敗")
    } finally {
      setExporting(false)
    }
  }, [exporting, data, format, content, filters, projectName])

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <ExportV2View
          projectId={projectId}
          projectName={projectName}
          currency={projectCurrency}
          format={format}
          content={content}
          filters={filters}
          memberCount={members.length}
          expenseCount={expenses.length}
          filteredCount={data.expenses.length}
          exporting={exporting}
          showLargeDataWarning={format === "pdf" && data.expenses.length > 500}
          onFormatChange={setFormat}
          onContentChange={setContent}
          onFiltersChange={setFilters}
          onExport={handleExport}
        />
      </div>
    </UiV2Scope>
  )
}
