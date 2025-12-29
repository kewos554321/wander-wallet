"use client"

import { useState } from "react"
import { format as formatDate } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Calendar as CalendarIcon, FileSpreadsheet, FileText, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CATEGORIES } from "@/lib/constants/expenses"
import type { ExportFormat, ExportContentOptions, ExportFilterOptions } from "@/lib/export/types"
import { cn } from "@/lib/utils"

interface ExportOptionsFormProps {
  format: ExportFormat
  content: ExportContentOptions
  filters: ExportFilterOptions
  onFormatChange: (format: ExportFormat) => void
  onContentChange: (content: ExportContentOptions) => void
  onFiltersChange: (filters: ExportFilterOptions) => void
}

export function ExportOptionsForm({
  format,
  content,
  filters,
  onFormatChange,
  onContentChange,
  onFiltersChange,
}: ExportOptionsFormProps) {
  const [showFilters, setShowFilters] = useState(
    !!(filters.dateRange?.start || filters.dateRange?.end || filters.categories?.length)
  )

  const handleContentToggle = (key: keyof ExportContentOptions) => {
    onContentChange({
      ...content,
      [key]: !content[key],
    })
  }

  const handleDateChange = (type: "start" | "end", date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        start: type === "start" ? (date || null) : (filters.dateRange?.start || null),
        end: type === "end" ? (date || null) : (filters.dateRange?.end || null),
      },
    })
  }

  const handleCategoryToggle = (category: string) => {
    const current = filters.categories || []
    const newCategories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]

    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
    setShowFilters(false)
  }

  const hasActiveFilters = !!(
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.categories?.length
  )

  return (
    <div className="space-y-6">
      {/* 匯出格式 */}
      <div>
        <h3 className="text-sm font-medium mb-3">匯出格式</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onFormatChange("csv")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              format === "csv"
                ? "border-primary bg-primary/5"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            <FileSpreadsheet
              className={cn(
                "h-8 w-8",
                format === "csv" ? "text-primary" : "text-slate-400"
              )}
            />
            <div className="text-center">
              <p className="font-medium text-sm">CSV</p>
              <p className="text-xs text-muted-foreground">Excel 相容</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onFormatChange("pdf")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              format === "pdf"
                ? "border-primary bg-primary/5"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            <FileText
              className={cn(
                "h-8 w-8",
                format === "pdf" ? "text-primary" : "text-slate-400"
              )}
            />
            <div className="text-center">
              <p className="font-medium text-sm">PDF</p>
              <p className="text-xs text-muted-foreground">可列印報表</p>
            </div>
          </button>
        </div>
      </div>

      {/* 匯出內容 */}
      <div>
        <h3 className="text-sm font-medium mb-3">匯出內容</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <Checkbox
              checked={content.expenseDetails}
              onCheckedChange={() => handleContentToggle("expenseDetails")}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">支出明細</p>
              <p className="text-xs text-muted-foreground">每筆支出的日期、金額、類別、付款人</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <Checkbox
              checked={content.settlementInfo}
              onCheckedChange={() => handleContentToggle("settlementInfo")}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">結算資訊</p>
              <p className="text-xs text-muted-foreground">誰該付誰多少錢的結算清單</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <Checkbox
              checked={content.statisticsSummary}
              onCheckedChange={() => handleContentToggle("statisticsSummary")}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">統計摘要</p>
              <p className="text-xs text-muted-foreground">總額、人均、分類統計、成員餘額</p>
            </div>
          </label>
        </div>
      </div>

      {/* 篩選選項 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">篩選條件</h3>
          {!showFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(true)}
              className="h-7 text-xs"
            >
              <Filter className="h-3 w-3 mr-1" />
              新增篩選
            </Button>
          ) : hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              清除篩選
            </Button>
          ) : null}
        </div>

        {showFilters && (
          <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            {/* 日期範圍 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">日期範圍</p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-9",
                        !filters.dateRange?.start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.start
                        ? formatDate(filters.dateRange.start, "yyyy/MM/dd", { locale: zhTW })
                        : "開始日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.start || undefined}
                      onSelect={(date) => handleDateChange("start", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground self-center">~</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-9",
                        !filters.dateRange?.end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.end
                        ? formatDate(filters.dateRange.end, "yyyy/MM/dd", { locale: zhTW })
                        : "結束日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.end || undefined}
                      onSelect={(date) => handleDateChange("end", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 分類篩選 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">分類篩選</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = filters.categories?.includes(cat.value)
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategoryToggle(cat.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : cat.color
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
              {filters.categories && filters.categories.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  已選 {filters.categories.length} 個分類
                </p>
              )}
            </div>
          </div>
        )}

        {!showFilters && (
          <p className="text-xs text-muted-foreground">
            預設匯出所有資料，點擊「新增篩選」可選擇日期範圍或分類
          </p>
        )}
      </div>
    </div>
  )
}
