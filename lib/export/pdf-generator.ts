import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type {
  ExportData,
  ExportOptions,
  ExpenseExportData,
  SettlementExportData,
  StatisticsExportData,
} from "./types"
import { formatCurrency } from "@/lib/constants/currencies"

// 字型快取 - 儲存 base64 資料以便重複使用
let cachedFontBase64: string | null = null

// 載入中文字型
async function loadChineseFont(doc: jsPDF): Promise<void> {
  try {
    // 如果尚未快取字型，從 CDN 下載
    if (!cachedFontBase64) {
      // 從 Google Fonts CDN 載入 Noto Sans TC
      const fontUrl =
        "https://fonts.gstatic.com/s/notosanstc/v36/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cz_Co.ttf"

      const response = await fetch(fontUrl)
      if (!response.ok) {
        throw new Error("Failed to fetch font")
      }

      const fontBuffer = await response.arrayBuffer()

      // 轉換為 base64
      const fontBytes = new Uint8Array(fontBuffer)
      let binary = ""
      for (let i = 0; i < fontBytes.length; i++) {
        binary += String.fromCharCode(fontBytes[i])
      }
      cachedFontBase64 = btoa(binary)
    }

    // 每個新的 jsPDF 實例都需要重新註冊字型
    doc.addFileToVFS("NotoSansTC-Regular.ttf", cachedFontBase64)
    doc.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal")
    doc.setFont("NotoSansTC")
  } catch (error) {
    console.warn("無法載入中文字型，使用預設字型:", error)
    // 使用預設字型（中文會顯示為方塊）
  }
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

// 格式化金額 - 使用專案幣別
function formatAmountWithCurrency(amount: number, currency: string): string {
  return formatCurrency(amount, currency)
}

// 添加支出明細表格
function addExpenseTable(
  doc: jsPDF,
  expenses: ExpenseExportData[],
  startY: number,
  currency: string
): number {
  // 區段標題
  doc.setFontSize(14)
  doc.text("支出明細", 14, startY)

  const tableData = expenses.map((expense) => [
    formatDate(expense.date),
    expense.description || "-",
    expense.categoryLabel,
    formatAmountWithCurrency(expense.amount, currency),
    expense.payer,
    expense.participants.join("、"),
  ])

  autoTable(doc, {
    startY: startY + 5,
    head: [["日期", "描述", "類別", "金額", "付款人", "分擔者"]],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: "NotoSansTC",
      fontStyle: "normal",
    },
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: 255,
      font: "NotoSansTC",
      fontStyle: "normal",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 22 }, // 日期
      1: { cellWidth: "auto" }, // 描述
      2: { cellWidth: 20 }, // 類別
      3: { cellWidth: 22, halign: "right" }, // 金額
      4: { cellWidth: 25 }, // 付款人
      5: { cellWidth: "auto" }, // 分擔者
    },
  })

  // 返回表格結束後的 Y 位置
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 15
}

// 添加結算資訊表格
function addSettlementTable(
  doc: jsPDF,
  settlements: SettlementExportData[],
  startY: number,
  currency: string
): number {
  doc.setFontSize(14)
  doc.text("結算資訊", 14, startY)

  if (settlements.length === 0) {
    doc.setFontSize(10)
    doc.text("所有人已結清，無需轉帳", 14, startY + 8)
    return startY + 20
  }

  const tableData = settlements.map((s) => [
    s.from,
    s.to,
    formatAmountWithCurrency(s.amount, currency),
  ])

  autoTable(doc, {
    startY: startY + 5,
    head: [["付款人", "收款人", "金額"]],
    body: tableData,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      font: "NotoSansTC",
      fontStyle: "normal",
    },
    headStyles: {
      fillColor: [34, 197, 94], // green-500
      textColor: 255,
      font: "NotoSansTC",
      fontStyle: "normal",
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40, halign: "right" },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 15
}

// 添加統計摘要
function addStatisticsSection(
  doc: jsPDF,
  statistics: StatisticsExportData,
  startY: number,
  currency: string
): number {
  doc.setFontSize(14)
  doc.text("統計摘要", 14, startY)

  let currentY = startY + 8

  // 基本統計 - 使用卡片式佈局
  doc.setFontSize(10)

  const summaryData = [
    ["支出筆數", String(statistics.totalExpenses)],
    ["總金額", formatAmountWithCurrency(statistics.totalAmount, currency)],
    ["成員人數", String(statistics.memberCount)],
    ["人均金額", formatAmountWithCurrency(statistics.perPerson, currency)],
  ]

  autoTable(doc, {
    startY: currentY,
    body: summaryData,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      font: "NotoSansTC",
      fontStyle: "normal",
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right", cellWidth: 50 },
    },
    theme: "plain",
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 10

  // 分類統計
  if (statistics.categoryBreakdown.length > 0) {
    doc.setFontSize(12)
    doc.text("分類統計", 14, currentY)

    const categoryData = statistics.categoryBreakdown.map((cat) => [
      cat.label,
      formatAmountWithCurrency(cat.amount, currency),
      String(cat.count),
      `${cat.percentage.toFixed(1)}%`,
    ])

    autoTable(doc, {
      startY: currentY + 5,
      head: [["類別", "金額", "筆數", "佔比"]],
      body: categoryData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        font: "NotoSansTC",
        fontStyle: "normal",
      },
      headStyles: {
        fillColor: [139, 92, 246], // violet-500
        textColor: 255,
        font: "NotoSansTC",
        fontStyle: "normal",
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "center" },
        3: { halign: "right" },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 10
  }

  // 成員餘額
  if (statistics.memberBreakdown.length > 0) {
    doc.setFontSize(12)
    doc.text("成員餘額", 14, currentY)

    const memberData = statistics.memberBreakdown.map((member) => [
      member.name,
      formatAmountWithCurrency(member.paid, currency),
      formatAmountWithCurrency(member.share, currency),
      formatAmountWithCurrency(member.balance, currency),
    ])

    autoTable(doc, {
      startY: currentY + 5,
      head: [["成員", "已付金額", "應分擔", "餘額"]],
      body: memberData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        font: "NotoSansTC",
        fontStyle: "normal",
      },
      headStyles: {
        fillColor: [249, 115, 22], // orange-500
        textColor: 255,
        font: "NotoSansTC",
        fontStyle: "normal",
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      didParseCell: (data) => {
        // 餘額欄位顏色
        if (data.section === "body" && data.column.index === 3) {
          const value = statistics.memberBreakdown[data.row.index]?.balance || 0
          if (value > 0) {
            data.cell.styles.textColor = [34, 197, 94] // green
          } else if (value < 0) {
            data.cell.styles.textColor = [239, 68, 68] // red
          }
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 10
  }

  return currentY
}

// 主要 PDF 生成函數
export async function generatePDF(
  data: ExportData,
  options: ExportOptions
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // 載入中文字型
  await loadChineseFont(doc)

  // 標題
  doc.setFontSize(20)
  doc.text(data.projectName, 14, 20)

  // 副標題
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`匯出報表 - ${formatDate(data.exportDate)}`, 14, 28)
  doc.setTextColor(0)

  // 分隔線
  doc.setDrawColor(200)
  doc.line(14, 32, 196, 32)

  let currentY = 40

  // 根據選項添加各區段
  if (options.content.expenseDetails && data.expenses.length > 0) {
    // 檢查是否需要新頁面
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }
    currentY = addExpenseTable(doc, data.expenses, currentY, data.currency)
  }

  if (options.content.settlementInfo) {
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }
    currentY = addSettlementTable(doc, data.settlements, currentY, data.currency)
  }

  if (options.content.statisticsSummary) {
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }
    addStatisticsSection(doc, data.statistics, currentY, data.currency)
  }

  // 頁尾
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `第 ${i} 頁，共 ${pageCount} 頁 - Wander Wallet 匯出`,
      105,
      290,
      { align: "center" }
    )
  }

  return doc.output("blob")
}

// 下載 PDF 檔案
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
