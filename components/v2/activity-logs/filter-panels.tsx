"use client"

import { Check, CircleX } from "lucide-react"

export interface NameOption {
  key: string
  label: string
}

const ACTIONS: NameOption[] = [
  { key: "create", label: "新增" },
  { key: "update", label: "編輯" },
  { key: "delete", label: "刪除" },
]

function PanelHeader({ title, onClear, showClear }: { title: string; onClear: () => void; showClear: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
        <p className="m-0 text-[10px] font-bold text-v2-ink-subtle">{title}</p>
        {showClear && (
          <button type="button" onClick={onClear} className="flex items-center gap-[3px] rounded-md px-1 py-0.5 text-[10px] font-bold text-v2-danger">
            <CircleX className="h-[11px] w-[11px]" strokeWidth={2.4} aria-hidden="true" />
            清除
          </button>
        )}
      </div>
      <div className="h-px bg-v2-line-soft" />
    </>
  )
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] ${
        checked ? "bg-v2-lake" : "border-[1.5px] border-v2-line bg-v2-surface"
      }`}
    >
      {checked && <Check className="h-2.5 w-2.5 text-v2-on-lake" strokeWidth={3} aria-hidden="true" />}
    </span>
  )
}

function OptionRows({
  options,
  selected,
  onToggle,
  emptyText,
}: {
  options: NameOption[]
  selected: Set<string>
  onToggle: (key: string) => void
  emptyText: string
}) {
  if (options.length === 0) {
    return <p className="px-2.5 py-3 text-[11px] text-v2-ink-subtle">{emptyText}</p>
  }
  return (
    <div className="v2-scroll max-h-60 overflow-y-auto">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="checkbox"
          aria-checked={selected.has(option.key)}
          aria-label={option.label}
          onClick={() => onToggle(option.key)}
          className="flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-xs"
        >
          <CheckBox checked={selected.has(option.key)} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export function ActionPanel({ selected, onToggle, onClear }: { selected: Set<string>; onToggle: (key: string) => void; onClear: () => void }) {
  return (
    <>
      <PanelHeader title="操作類型" onClear={onClear} showClear={selected.size > 0} />
      <OptionRows options={ACTIONS} selected={selected} onToggle={onToggle} emptyText="" />
    </>
  )
}

export function NameListPanel({
  title,
  options,
  selected,
  onToggle,
  onClear,
  emptyText,
}: {
  title: string
  options: NameOption[]
  selected: Set<string>
  onToggle: (key: string) => void
  onClear: () => void
  emptyText: string
}) {
  return (
    <>
      <PanelHeader title={title} onClear={onClear} showClear={selected.size > 0} />
      <OptionRows options={options} selected={selected} onToggle={onToggle} emptyText={emptyText} />
    </>
  )
}
