"use client"

import { useState } from "react"

// Simple fixed-overlay confirmation dialog (components/v2/ui/confirm-sheet
// does not exist yet) for the danger-zone "刪除專案" action. Local `text`
// state resets automatically since the sheet unmounts when closed.
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-v2-surface p-5 sm:rounded-2xl">
        <h2 className="m-0 mb-2 font-v2-serif text-base font-semibold">確認刪除專案</h2>
        <p className="mb-3 text-xs text-v2-ink-muted">刪除專案後，所有成員、支出紀錄都會永久移除，此操作無法復原。請輸入 delete 以確認。</p>
        <input
          aria-label="輸入 delete 確認"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={deleting}
          autoComplete="off"
          className="mb-3 w-full rounded-xl border border-v2-line px-3.5 py-2.5 text-sm outline-none"
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
            disabled={deleting || text !== "delete"}
            className="flex-1 rounded-xl bg-v2-danger py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {deleting ? "刪除中…" : "永久刪除"}
          </button>
        </div>
      </div>
    </div>
  )
}
