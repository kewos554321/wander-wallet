"use client"

import { useState } from "react"
import { Sheet } from "@/components/v2/ui/sheet"

// Confirmation dialog for the danger-zone "刪除旅程" action. The confirm word is
// Chinese ("刪除") to match the product's language. Local `text` state resets
// automatically since the sheet unmounts when closed.
export function DeleteProjectSheet({
  open,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean
  deleting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const [text, setText] = useState("")

  return (
    <Sheet open={open} onClose={onCancel} label="確認刪除旅程">
      <h2 className="m-0 mb-2 font-v2-serif text-base font-semibold">確認刪除旅程</h2>
      <p className="mb-3 text-xs text-v2-ink-muted">刪除旅程後，所有成員、支出紀錄都會永久移除，此操作無法復原。請輸入「刪除」以確認。</p>
      <input
        aria-label="輸入刪除確認"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={deleting}
        autoComplete="off"
        placeholder="刪除"
        className="mb-3 w-full rounded-xl border border-v2-line px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-v2-lake focus-visible:ring-2 focus-visible:ring-v2-lake/30"
      />
      {error && (
        <p role="alert" className="mb-3 text-xs font-semibold text-v2-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 rounded-xl border border-v2-line py-3 text-sm font-bold disabled:opacity-40"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting || text.trim() !== "刪除"}
          className="flex-1 rounded-xl bg-v2-danger-strong py-3 text-sm font-bold text-v2-on-lake disabled:opacity-40"
        >
          {deleting ? "刪除中…" : "永久刪除"}
        </button>
      </div>
    </Sheet>
  )
}
