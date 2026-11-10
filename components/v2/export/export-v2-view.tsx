"use client"

import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CheckboxRow } from "@/components/v2/ui/checkbox-row"
import { cn } from "@/lib/utils"
import type { ExportContentOptions, ExportFormat } from "@/lib/export/types"

export interface ExportV2ViewProps {
  projectId: string
  projectName: string
  currency: string
  format: ExportFormat
  content: ExportContentOptions
  memberCount: number
  expenseCount: number
  exporting: boolean
  showLargeDataWarning: boolean
  onFormatChange: (format: ExportFormat) => void
  onContentChange: (content: ExportContentOptions) => void
  onExport: () => void
}

const FORMAT_TILE = "flex flex-col items-center gap-1.5 rounded-v2-md p-3.5 text-center"

export function ExportV2View({
  projectId,
  projectName,
  format,
  content,
  memberCount,
  expenseCount,
  exporting,
  showLargeDataWarning,
  onFormatChange,
  onContentChange,
  onExport,
}: ExportV2ViewProps) {
  const hasContent = content.expenseDetails || content.settlementInfo || content.statisticsSummary
  const disabled = exporting || !hasContent || expenseCount === 0

  return (
    <div className="flex min-h-screen flex-col">
      <V2TopBar title="匯出" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />

      <div className="flex-1 px-4 pb-28 pt-4">
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <p className="mb-2.5 text-[13px] font-bold text-v2-lake">匯出格式</p>
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="export-format-csv"
              onClick={() => onFormatChange("csv")}
              className={cn(FORMAT_TILE, format === "csv" ? "border-2 border-v2-lake bg-v2-lake-soft text-v2-lake" : "border border-v2-line text-v2-ink-muted")}
            >
              <FileSpreadsheet className="h-[22px] w-[22px]" />
              <span className="text-[13px] font-bold">CSV</span>
              <span className="text-[10px] text-v2-ink-muted">Excel 相容</span>
            </button>
            <button
              type="button"
              data-testid="export-format-pdf"
              onClick={() => onFormatChange("pdf")}
              className={cn(FORMAT_TILE, format === "pdf" ? "border-2 border-v2-lake bg-v2-lake-soft text-v2-lake" : "border border-v2-line text-v2-ink-muted")}
            >
              <FileText className="h-[22px] w-[22px]" />
              <span className="text-[13px] font-bold">PDF</span>
              <span className="text-[10px] text-v2-ink-muted">可列印報表</span>
            </button>
          </div>

          <p className="mb-2.5 text-[13px] font-bold text-v2-lake">匯出內容</p>
          <div className="mb-4 flex flex-col gap-2">
            <CheckboxRow
              checked={content.expenseDetails}
              onCheckedChange={(v) => onContentChange({ ...content, expenseDetails: v })}
              label="支出明細"
              description="每筆支出的日期、金額、類別、付款旅伴"
            />
            <CheckboxRow
              checked={content.settlementInfo}
              onCheckedChange={(v) => onContentChange({ ...content, settlementInfo: v })}
              label="結算資訊"
              description="誰該付誰多少錢的結算清單"
            />
            <CheckboxRow
              checked={content.statisticsSummary}
              onCheckedChange={(v) => onContentChange({ ...content, statisticsSummary: v })}
              label="統計摘要"
              description="總額、人均、分類統計、旅伴餘額"
            />
          </div>
        </div>

        {showLargeDataWarning ? (
          <div data-testid="export-warning" className="mt-3.5 rounded-v2-md border border-v2-danger-border bg-v2-danger-tint px-3.5 py-3 text-[12px] text-v2-danger-strong">
            大量資料警告：目前有 {expenseCount} 筆支出，PDF 生成可能需要較長時間。建議改用 CSV 格式。
          </div>
        ) : null}

        <div data-testid="export-summary" className="mt-3.5 rounded-v2-md border border-v2-lake-border bg-v2-lake-soft p-3.5 text-[11px] text-v2-lake">
          <p className="m-0 mb-1">旅程：{projectName}</p>
          <p className="m-0 mb-1">支出筆數：{expenseCount} 筆</p>
          <p className="m-0">旅伴人數：{memberCount} 人</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-v2-line bg-v2-paper p-3.5">
        <button
          type="button"
          data-testid="export-submit"
          onClick={onExport}
          disabled={disabled}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-v2-md bg-v2-lake text-[15px] font-bold text-v2-paper disabled:opacity-50"
        >
          <Download className="h-[17px] w-[17px]" />
          {exporting ? "匯出中..." : `匯出 ${format === "csv" ? "CSV" : "PDF"}`}
        </button>
      </div>
    </div>
  )
}
