"use client"

import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { Sheet } from "@/components/v2/ui/sheet"
import { DeleteExpenseSummary, type DeleteExpenseSummaryProps } from "./delete-expense-summary"

export interface DeleteExpenseSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  error?: string | null
  expense: DeleteExpenseSummaryProps | null
  canNotifyLine?: boolean
  notifyLine?: boolean
  onNotifyLineChange?: (checked: boolean) => void
}

/**
 * v2 delete confirmation. Names the expense before asking, uses the shared
 * bottom-sheet focus trap, and keeps the LINE notification option.
 *
 * There is intentionally no undo: the API deletes immediately and there is no
 * restore path yet, so the copy must not promise one.
 */
export function DeleteExpenseSheet({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
  expense,
  canNotifyLine = false,
  notifyLine = true,
  onNotifyLineChange,
}: DeleteExpenseSheetProps) {
  return (
    <Sheet open={open && expense != null} onClose={onClose} label="刪除支出">
      {expense && (
        <>
          <h2 className="m-0 font-v2-serif text-[20px] font-bold leading-7 text-v2-ink">
            刪除這筆支出？
          </h2>
          <p className="m-0 mt-1 text-[12px] leading-4 text-v2-ink-muted">
            這筆支出會從旅程中移除；相關的分攤與結算也會一起更新。此操作無法復原。
          </p>

          <DeleteExpenseSummary {...expense} />

          {canNotifyLine && (
            <div className="mt-3 border-t border-v2-line pt-1">
              <NotifyLineCheckbox checked={notifyLine} onChange={onNotifyLineChange ?? (() => {})} />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-[12px] font-semibold text-v2-danger">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-v2-md border border-v2-line py-3 text-[14px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake disabled:opacity-40 motion-reduce:transition-none"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-v2-md bg-v2-danger-strong py-3 text-[14px] font-bold text-v2-on-lake transition-transform duration-150 ease-out active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-danger-strong disabled:opacity-40 motion-reduce:transition-none"
            >
              {loading ? "刪除中…" : "刪除這筆支出"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
