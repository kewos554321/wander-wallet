"use client"

import { Checkbox } from "@/components/ui/checkbox"

export function NotifyLineCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <div>
        <span className="text-sm font-medium">通知 LINE 群組</span>
        <p className="text-xs text-muted-foreground">刪除後自動發送通知到群組</p>
      </div>
    </label>
  )
}
