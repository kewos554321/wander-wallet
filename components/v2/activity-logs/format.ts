import { getCategoryLabel } from "@/lib/constants/expenses"

export type ActionTone = "create" | "update" | "delete"

export function getActionText(action: string, entityType: string): string {
  const entityName = entityType === "expense" ? "費用" : entityType === "member" ? "成員" : "項目"
  switch (action) {
    case "create":
      return `新增${entityName}`
    case "update":
      return `編輯${entityName}`
    case "delete":
      return `刪除${entityName}`
    default:
      return `操作${entityName}`
  }
}

export function getActionTone(action: string): ActionTone {
  if (action === "create" || action === "delete") return action
  return "update"
}

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return ""
  return getCategoryLabel(category)
}

interface ParticipantsChange {
  count: number
  added?: string[]
  removed?: string[]
}

const FIELD_LABELS: Record<string, string> = {
  amount: "金額",
  description: "描述",
  category: "類別",
  payer: "付款成員",
  payers: "付款成員",
  paidByMemberId: "付款成員",
  expenseDate: "日期",
  location: "地點",
  participants: "分攤者",
}

/** Ports the v1 activity-log change formatter (amount+currency merged into one row). */
export function formatChanges(
  changes: Record<string, { from: unknown; to: unknown }> | null,
  defaultCurrency: string
): { label: string; from: string; to: string }[] {
  if (!changes) return []

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return "無"
    if (field === "category") return categoryLabel(String(value))
    if (field === "expenseDate") return new Date(String(value)).toLocaleDateString("zh-TW")
    return String(value)
  }

  const formatParticipantsChange = (from: ParticipantsChange, to: ParticipantsChange): { from: string; to: string } => {
    const parts: string[] = []
    if (from.removed && from.removed.length > 0) parts.push(`移除：${from.removed.join("、")}`)
    if (to.added && to.added.length > 0) parts.push(`加入：${to.added.join("、")}`)
    return {
      from: `${from.count}人`,
      to: parts.length > 0 ? `${to.count}人（${parts.join("；")}）` : `${to.count}人`,
    }
  }

  const amountChange = changes.amount
  const currencyChange = changes.currency
  const result: { label: string; from: string; to: string }[] = []

  if (amountChange || currencyChange) {
    const oldCurrency = currencyChange ? String(currencyChange.from) : defaultCurrency
    const newCurrency = currencyChange ? String(currencyChange.to) : defaultCurrency
    const oldAmount = amountChange ? Number(amountChange.from) : null
    const newAmount = amountChange ? Number(amountChange.to) : null
    const formatAmountWithCurrency = (cur: string, amount: number | null) =>
      amount === null ? cur : `${cur} ${amount.toLocaleString()}`

    result.push({
      label: "金額",
      from: formatAmountWithCurrency(oldCurrency, oldAmount ?? newAmount ?? 0),
      to: formatAmountWithCurrency(newCurrency, newAmount ?? oldAmount ?? 0),
    })
  }

  for (const [field, { from, to }] of Object.entries(changes)) {
    if (field === "amount" || field === "currency") continue
    if (field === "participants" && typeof from === "object" && from !== null && typeof to === "object" && to !== null) {
      const formatted = formatParticipantsChange(from as ParticipantsChange, to as ParticipantsChange)
      result.push({ label: FIELD_LABELS[field] || field, from: formatted.from, to: formatted.to })
      continue
    }
    result.push({ label: FIELD_LABELS[field] || field, from: formatValue(field, from), to: formatValue(field, to) })
  }

  return result
}
