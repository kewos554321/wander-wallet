import {
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  Wallet,
  Ticket,
  Gift,
  type LucideIcon,
} from "lucide-react"

/**
 * 費用類別值列表
 */
export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "accommodation",
  "ticket",
  "shopping",
  "entertainment",
  "gift",
  "other",
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/**
 * 類別中文標籤
 */
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "餐飲",
  transport: "交通",
  accommodation: "住宿",
  ticket: "票券",
  shopping: "購物",
  entertainment: "娛樂",
  gift: "禮品",
  other: "其他",
}

/**
 * 類別圖示
 */
export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  ticket: Ticket,
  shopping: ShoppingBag,
  entertainment: Gamepad2,
  gift: Gift,
  other: Wallet,
}

/**
 * 類別顏色（用於圖表）
 */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: "#f97316",
  transport: "#3b82f6",
  accommodation: "#7c3aed",
  ticket: "#06b6d4",
  shopping: "#10b981",
  entertainment: "#ec4899",
  gift: "#f59e0b",
  other: "#64748b",
}

/**
 * 類別樣式（用於 UI 元件）
 */
export const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  food: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  transport: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  accommodation: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  ticket: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
  shopping: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  entertainment: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  gift: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

/**
 * 類別完整資訊（用於表單選擇器）
 */
export interface CategoryInfo {
  value: ExpenseCategory
  label: string
  icon: LucideIcon
  color: string
}

export const CATEGORIES: CategoryInfo[] = EXPENSE_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
  icon: CATEGORY_ICONS[value],
  color: CATEGORY_STYLES[value],
}))

/**
 * 根據類別值取得完整資訊
 */
export function getCategoryInfo(value: string): CategoryInfo {
  const category = CATEGORIES.find((c) => c.value === value)
  return category || CATEGORIES[CATEGORIES.length - 1] // 預設返回 "other"
}

/**
 * 取得類別標籤
 */
export function getCategoryLabel(value: string): string {
  return CATEGORY_LABELS[value as ExpenseCategory] || value
}

/**
 * 取得類別顏色
 */
export function getCategoryColor(value: string): string {
  return CATEGORY_COLORS[value as ExpenseCategory] || CATEGORY_COLORS.other
}
