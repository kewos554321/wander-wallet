import type {
  ExportData,
  ExportOptions,
  ExpenseExportData,
  SettlementExportData,
  StatisticsExportData,
} from "./types"
import { formatCurrency } from "@/lib/constants/currencies"

// Escape CSV 特殊字元
function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

// 格式化金額（純數字，不含幣別符號，用於欄位中）
function formatAmount(amount: number): string {
  return amount.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

// 生成支出明細區段
function generateExpenseSection(expenses: ExpenseExportData[]): string {
  const lines: string[] = []

  lines.push("【支出明細】")
  lines.push("")

  // 標題列
  lines.push(
    ["日期", "描述", "類別", "金額", "付款人", "分擔者"].map(escapeCSV).join(",")
  )

  // 資料列
  expenses.forEach((expense) => {
    lines.push(
      [
        formatDate(expense.date),
        expense.description,
        expense.categoryLabel,
        formatAmount(expense.amount),
        expense.payer,
        expense.participants.join("、"),
      ]
        .map(escapeCSV)
        .join(",")
    )
  })

  return lines.join("\n")
}

// 生成結算資訊區段
function generateSettlementSection(settlements: SettlementExportData[]): string {
  const lines: string[] = []

  lines.push("【結算資訊】")
  lines.push("")

  if (settlements.length === 0) {
    lines.push("所有人已結清，無需轉帳")
    return lines.join("\n")
  }

  // 標題列
  lines.push(["付款人", "收款人", "金額"].map(escapeCSV).join(","))

  // 資料列
  settlements.forEach((settlement) => {
    lines.push(
      [
        settlement.from,
        settlement.to,
        formatAmount(settlement.amount),
      ]
        .map(escapeCSV)
        .join(",")
    )
  })

  return lines.join("\n")
}

// 生成統計摘要區段
function generateStatisticsSection(statistics: StatisticsExportData, currency: string): string {
  const lines: string[] = []

  lines.push("【統計摘要】")
  lines.push("")

  // 基本統計
  lines.push("項目,數值")
  lines.push(`支出筆數,${statistics.totalExpenses}`)
  lines.push(`總金額,${formatCurrency(statistics.totalAmount, currency)}`)
  lines.push(`成員人數,${statistics.memberCount}`)
  lines.push(`人均金額,${formatCurrency(statistics.perPerson, currency)}`)

  // 分類統計
  if (statistics.categoryBreakdown.length > 0) {
    lines.push("")
    lines.push("【分類統計】")
    lines.push("")
    lines.push(["類別", "金額", "筆數", "佔比"].map(escapeCSV).join(","))

    statistics.categoryBreakdown.forEach((cat) => {
      lines.push(
        [
          cat.label,
          formatCurrency(cat.amount, currency),
          String(cat.count),
          `${cat.percentage.toFixed(1)}%`,
        ]
          .map(escapeCSV)
          .join(",")
      )
    })
  }

  // 成員餘額
  if (statistics.memberBreakdown.length > 0) {
    lines.push("")
    lines.push("【成員餘額】")
    lines.push("")
    lines.push(["成員", "已付金額", "應分擔", "餘額"].map(escapeCSV).join(","))

    statistics.memberBreakdown.forEach((member) => {
      lines.push(
        [
          member.name,
          formatCurrency(member.paid, currency),
          formatCurrency(member.share, currency),
          formatCurrency(member.balance, currency),
        ]
          .map(escapeCSV)
          .join(",")
      )
    })
  }

  return lines.join("\n")
}

// 主要 CSV 生成函數
export function generateCSV(data: ExportData, options: ExportOptions): string {
  const sections: string[] = []

  // 標題區
  sections.push(`專案名稱:,${escapeCSV(data.projectName)}`)
  sections.push(`匯出日期:,${formatDate(data.exportDate)}`)
  sections.push("")

  // 根據選項添加各區段
  if (options.content.expenseDetails && data.expenses.length > 0) {
    sections.push(generateExpenseSection(data.expenses))
    sections.push("")
  }

  if (options.content.settlementInfo) {
    sections.push(generateSettlementSection(data.settlements))
    sections.push("")
  }

  if (options.content.statisticsSummary) {
    sections.push(generateStatisticsSection(data.statistics, data.currency))
  }

  // 添加 BOM 讓 Excel 正確識別 UTF-8
  return "\ufeff" + sections.join("\n")
}

// 下載 CSV 檔案
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
