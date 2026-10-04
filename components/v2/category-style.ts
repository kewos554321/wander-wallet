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

/**
 * Picker-scoped identity palette: `tone` (bg + text) is the category's fixed
 * identity colour and is applied in BOTH checked and unchecked states; only the
 * border (`border` vs `border-v2-line`) and font weight (bold vs semibold) change.
 * `CATEGORY_TONES` stays untouched because A2/A6b list & filter chips rely on its
 * 餐飲 colour.
 */
export const CATEGORY_PICKER_TONES: Record<ExpenseCategory, { tone: string; border: string }> = {
  food: { tone: "bg-v2-coral-soft text-v2-coral-deep", border: "border-v2-coral-deep" },
  transport: { tone: CATEGORY_TONES.transport, border: "border-v2-lake-mid" },
  accommodation: { tone: CATEGORY_TONES.accommodation, border: "border-v2-plum" },
  ticket: { tone: CATEGORY_TONES.ticket, border: "border-v2-gold" },
  shopping: { tone: CATEGORY_TONES.shopping, border: "border-v2-rose" },
  entertainment: { tone: CATEGORY_TONES.entertainment, border: "border-v2-sky" },
  gift: { tone: CATEGORY_TONES.gift, border: "border-v2-gold" },
  other: { tone: CATEGORY_TONES.other, border: "border-v2-ink-muted" },
}

export function categoryKey(category: string | null): ExpenseCategory {
  return category && category in CATEGORY_ICONS ? (category as ExpenseCategory) : "other"
}
