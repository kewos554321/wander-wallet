"use client"

import { useState } from "react"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { CheckboxRow } from "@/components/v2/ui/checkbox-row"

/**
 * Demo-only: the LINE notification control is still the v1 checkbox. It picks
 * up the v2 colour tokens inside a v2 surface, but its size and type scale do
 * not match the rest of the sheet. The after side uses the existing v2
 * CheckboxRow so the control follows the same row system.
 */

export function NotifyCheckboxDemo({ view }: { view: "before" | "after" }) {
  const [checked, setChecked] = useState(true)

  return (
    <div className="mx-4 rounded-v2-lg border border-v2-line bg-v2-surface p-3.5">
      <div className="rounded-v2-md border border-v2-line bg-v2-paper px-3 py-2">
        <p className="m-0 text-[10px] font-bold tracking-[.4px] text-v2-ink-muted">刪除 sheet 內</p>

        <div className="mt-1">
          {view === "before" ? (
            <NotifyLineCheckbox checked={checked} onChange={setChecked} />
          ) : (
            <CheckboxRow
              checked={checked}
              onCheckedChange={setChecked}
              label="通知 LINE 群組"
              description="刪除後自動發送通知到群組"
            />
          )}
        </div>
      </div>

      <p className="m-0 mt-2 text-[11px] leading-4 text-v2-ink-muted">
        {view === "before"
          ? "v1 Checkbox：18px 方形、text-sm、text-xs。放進 v2 sheet 會拿到 v2 顏色，但尺寸與密度沒對齊。"
          : "v2 CheckboxRow：token 邊框、13px 標題、11px 說明，整列可點。"}
      </p>
      <p className="m-0 mt-1 text-[11px] leading-4 text-v2-ink-muted">點一下切換，兩邊都可操作。</p>
    </div>
  )
}
