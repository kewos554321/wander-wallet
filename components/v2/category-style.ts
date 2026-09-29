import { CATEGORY_ICONS, type ExpenseCategory } from "@/lib/constants/expenses"

export const CATEGORY_TONES: Record<ExpenseCategory, string> = {
  food: "bg-v2-coral-soft text-v2-coral",
  transport: "bg-v2-lake-soft text-v2-lake-mid",
  accommodation: "bg-v2-plum-soft text-v2-plum",
  ticket: "bg-v2-gold-soft text-v2-gold",
  shopping: "bg-v2-rose-soft text-v2-rose",
  entertainment: "bg-v2-sky-soft text-v2-sky",
  gift: "bg-v2-gold-soft text-v2-gold",
  other: "bg-v2-sand text-v2-ink-muted",
}

export function categoryKey(category: string | null): ExpenseCategory {
  return category && category in CATEGORY_ICONS ? (category as ExpenseCategory) : "other"
}
