"use client"

import { useId } from "react"
import * as Checkbox from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

export interface CheckboxRowProps {
  checked: boolean
  onCheckedChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

/** Token-styled checkbox with a title and optional sub-copy (non-portal Radix). */
export function CheckboxRow({ checked, onCheckedChange, label, description, disabled }: CheckboxRowProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-v2-line p-[11px]">
      <Checkbox.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-v2-line bg-v2-surface data-[state=checked]:border-v2-lake data-[state=checked]:bg-v2-lake disabled:opacity-50"
      >
        <Checkbox.Indicator>
          <Check className="h-3 w-3 text-v2-on-lake" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-semibold text-v2-ink">{label}</span>
        {description ? (
          <span className="mt-px block text-[11px] text-v2-ink-subtle">{description}</span>
        ) : null}
      </label>
    </div>
  )
}
