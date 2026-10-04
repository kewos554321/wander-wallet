"use client"

import { cn } from "@/lib/utils"

export interface CategoryChipItem {
  key: string
  label: string
  emoji: string
  count: number
}

export interface CategoryChipsProps {
  items: CategoryChipItem[]
  totalCount: number
  selected: string | null
  onSelect: (key: string | null) => void
  allLabel?: string
}

const CHIP =
  "shrink-0 rounded-full px-3 py-1.5 text-[12px]"
const ACTIVE = "bg-v2-lake font-bold text-v2-on-lake"
const IDLE = "border border-v2-line bg-v2-surface text-v2-ink"

/** Horizontally scrollable category filter chips shared by photos and map. */
export function CategoryChips({
  items,
  totalCount,
  selected,
  onSelect,
  allLabel = "全部",
}: CategoryChipsProps) {
  return (
    <div data-testid="category-chips" className="flex gap-1.5 overflow-x-auto px-4">
      <button
        type="button"
        data-testid="category-chip-all"
        onClick={() => onSelect(null)}
        className={cn(CHIP, selected === null ? ACTIVE : IDLE)}
      >
        {allLabel} {totalCount}
      </button>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          data-testid={`category-chip-${item.key}`}
          onClick={() => onSelect(item.key)}
          className={cn(CHIP, selected === item.key ? ACTIVE : IDLE)}
        >
          {item.emoji} {item.label} {item.count}
        </button>
      ))}
    </div>
  )
}
