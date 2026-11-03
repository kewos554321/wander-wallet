"use client"

import { useState } from "react"
import { ExportV2View } from "@/components/v2/export/export-v2-view"
import { defaultExportOptions } from "@/lib/export/types"
import type { ExportContentOptions, ExportFilterOptions, ExportFormat } from "@/lib/export/types"
import { DEMO_CURRENCY, DEMO_EXPORT_COUNTS, DEMO_PROJECT, DEMO_PROJECT_ID } from "@/app/demo/_data/fixtures"

// Real export view; the export action is a demo no-op.
export default function ExportDemoPage() {
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [content, setContent] = useState<ExportContentOptions>(defaultExportOptions.content)
  const [filters, setFilters] = useState<ExportFilterOptions>({})

  return (
    <div className="mx-auto max-w-md">
      <ExportV2View
        projectId={DEMO_PROJECT_ID}
        projectName={DEMO_PROJECT.name}
        currency={DEMO_CURRENCY}
        format={format}
        content={content}
        filters={filters}
        memberCount={DEMO_EXPORT_COUNTS.memberCount}
        expenseCount={DEMO_EXPORT_COUNTS.expenseCount}
        filteredCount={DEMO_EXPORT_COUNTS.filteredCount}
        exporting={false}
        showLargeDataWarning={false}
        onFormatChange={setFormat}
        onContentChange={setContent}
        onFiltersChange={setFilters}
        onExport={() => alert("（demo）匯出")}
      />
    </div>
  )
}
