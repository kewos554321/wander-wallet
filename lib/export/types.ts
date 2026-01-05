// 匯出格式
export type ExportFormat = "csv" | "pdf"

// 匯出內容選項
export interface ExportContentOptions {
  expenseDetails: boolean // 支出明細
  settlementInfo: boolean // 結算資訊
  statisticsSummary: boolean // 統計摘要
}

// 匯出篩選選項
export interface ExportFilterOptions {
  dateRange?: {
    start: Date | null
    end: Date | null
  }
  categories?: string[] // 分類篩選
}

// 完整匯出選項
export interface ExportOptions {
  format: ExportFormat
  content: ExportContentOptions
  filters: ExportFilterOptions
  projectName: string
}

// 支出匯出資料
export interface ExpenseExportData {
  id: string
  date: string // ISO string
  description: string
  category: string
  categoryLabel: string
  amount: number
  payer: string
  participants: string[] // 分擔者名稱列表
  participantShares: { name: string; amount: number }[] // 分擔金額明細
}

// 結算匯出資料
export interface SettlementExportData {
  from: string
  to: string
  amount: number
}

// 成員餘額資料
export interface MemberBalanceData {
  name: string
  paid: number // 已付金額
  share: number // 應分擔金額
  balance: number // 餘額 (paid - share)
}

// 分類統計資料
export interface CategoryBreakdownData {
  category: string
  label: string
  amount: number
  count: number
  percentage: number
}

// 統計匯出資料
export interface StatisticsExportData {
  totalExpenses: number // 支出筆數
  totalAmount: number // 總金額
  perPerson: number // 人均
  memberCount: number // 成員數
  categoryBreakdown: CategoryBreakdownData[]
  memberBreakdown: MemberBalanceData[]
}

// 完整匯出資料
export interface ExportData {
  projectName: string
  exportDate: string
  currency: string
  expenses: ExpenseExportData[]
  settlements: SettlementExportData[]
  statistics: StatisticsExportData
}

// 預設匯出選項
export const defaultExportOptions: Omit<ExportOptions, "projectName"> = {
  format: "csv",
  content: {
    expenseDetails: true,
    settlementInfo: true,
    statisticsSummary: false,
  },
  filters: {},
}
