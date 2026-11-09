"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CategoryChipItem {
  key: string
  label: string
  /** Emoji fallback for surfaces that still use emoji (photos). */
  emoji?: string
  /** Line icon that matches the add-expense category picker. */
  icon?: LucideIcon
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
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.key}
            type="button"
            data-testid={`category-chip-${item.key}`}
            onClick={() => onSelect(item.key)}
            className={cn(CHIP, "inline-flex items-center gap-1", selected === item.key ? ACTIVE : IDLE)}
          >
            {Icon ? (
              <Icon className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden="true" />
            ) : item.emoji ? (
              <span aria-hidden="true">{item.emoji}</span>
            ) : null}
            <span>
              {item.label} {item.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
