// Values shared by the detail sheet, the standalone personal-items sheet and
// the form-level guardrail. A blank row is a placeholder; once the user has
// typed into either field, the row must be completed.

export interface PersonalItemLike {
  name: string
  amount: string
}

export function isTouchedItem(item: PersonalItemLike): boolean {
  return item.name.trim() !== "" || item.amount.trim() !== ""
}

export function isCompleteItem(item: PersonalItemLike): boolean {
  return item.name.trim() !== "" && item.amount.trim() !== "" && Number(item.amount) > 0
}

export function isIncompleteItem(item: PersonalItemLike): boolean {
  return isTouchedItem(item) && !isCompleteItem(item)
}

export function countIncompleteItems(items: readonly PersonalItemLike[]): number {
  return items.filter(isIncompleteItem).length
}
