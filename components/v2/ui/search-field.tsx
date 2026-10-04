"use client"

import { Search } from "lucide-react"

export interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
}

/** v2 token search input, shared by list screens. */
export function SearchField({ value, onChange, placeholder, ariaLabel }: SearchFieldProps) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-v2-line bg-v2-surface px-3 py-2.5">
      <Search className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" />
      <input
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[13px] text-v2-ink outline-none placeholder:text-v2-ink-subtle"
      />
    </div>
  )
}
