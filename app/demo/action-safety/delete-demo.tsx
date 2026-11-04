"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Sheet } from "@/components/v2/ui/sheet"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"
import { CATEGORY_ICONS } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"

/**
 * Demo-only: the shipped delete dialog only says "無法復原"; it never names the
 * expense. The after side uses the v2 sheet, names the target, and keeps a
 * five-second undo so a mistake is recoverable.
 */

const EXPENSE = {
  name: "一蘭拉麵晚餐",
  amount: 680,
  payer: "我付款",
  date: "3/14",
  participants: 4,
}

const CATEGORY = categoryKey("food")
const CategoryIcon = CATEGORY_ICONS[CATEGORY]

export function DeleteDemo({ view }: { view: "before" | "after" }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rowVisible, setRowVisible] = useState(true)

  const confirm = () => {
    setDialogOpen(false)
    setRowVisible(false)
  }

  const reset = () => {
    setRowVisible(true)
  }

  return (
    <>
      <div className="relative mx-4 h-[320px] overflow-hidden rounded-v2-lg border border-v2-line bg-v2-paper shadow-v2-card">
        <div className="flex items-center justify-between border-b border-v2-line px-4 py-3">
          <span className="text-[15px] font-semibold text-v2-ink">支出</span>
          <span className="text-[11px] text-v2-ink-muted">東京之旅</span>
        </div>

        {rowVisible ? (
          <div className="m-4 rounded-v2-md border border-v2-line bg-v2-surface p-3 shadow-v2-xs">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md ${CATEGORY_TONES[CATEGORY]}`}
                aria-hidden="true"
              >
                <CategoryIcon className="h-[17px] w-[17px]" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="m-0 min-w-0 flex-1 truncate text-[14px] font-semibold leading-[19px] text-v2-ink">
                    {EXPENSE.name}
                  </h3>
                  <span className="shrink-0 text-[14px] font-bold tabular-nums text-v2-ink">
                    {formatCurrency(EXPENSE.amount, "TWD")}
                  </span>
                </div>
                <p className="m-0 mt-1 text-[11px] leading-4 text-v2-ink-muted">
                  {EXPENSE.payer} · {EXPENSE.date} · 共 {EXPENSE.participants} 人分攤
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                aria-label={`刪除${EXPENSE.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-danger transition-colors duration-150 hover:bg-v2-danger-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-danger motion-reduce:transition-none"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="m-4 rounded-v2-md border border-dashed border-v2-line bg-v2-surface px-4 py-8 text-center">
            <p className="m-0 text-[13px] font-semibold text-v2-ink">這筆支出已刪除</p>
            <p className="m-0 mt-1 text-[11px] leading-4 text-v2-ink-muted">
              {view === "after"
                ? "改後：確認前已把目標講清楚；確認後立即移除。"
                : "改前：沒有指認目標，確認後直接消失。"}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 min-h-[44px] rounded-full border border-v2-line px-4 text-[12px] font-bold text-v2-lake transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
            >
              重設 demo
            </button>
          </div>
        )}
      </div>

      {view === "before" ? (
        <ConfirmDeleteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          description="確定要刪除這筆支出嗎？此操作無法復原。"
          onConfirm={confirm}
        />
      ) : (
        <Sheet open={dialogOpen} onClose={() => setDialogOpen(false)} label="刪除支出">
          <h2 className="m-0 font-v2-serif text-[20px] font-bold leading-7 text-v2-ink">刪除這筆支出？</h2>
          <p className="m-0 mt-1 text-[12px] leading-4 text-v2-ink-muted">
            這筆支出會從旅程中移除；相關的分攤與結算也會一起更新。此操作無法復原。
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-v2-md border border-v2-line bg-v2-paper p-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md ${CATEGORY_TONES[CATEGORY]}`}
              aria-hidden="true"
            >
              <CategoryIcon className="h-[17px] w-[17px]" strokeWidth={1.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[13px] font-bold text-v2-ink">{EXPENSE.name}</p>
              <p className="m-0 mt-0.5 text-[11px] text-v2-ink-muted">
                {EXPENSE.payer} · {EXPENSE.date} · 共 {EXPENSE.participants} 人分攤
              </p>
            </div>
            <span className="shrink-0 text-[14px] font-bold tabular-nums text-v2-ink">
              {formatCurrency(EXPENSE.amount, "TWD")}
            </span>
          </div>

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="flex-1 rounded-v2-md border border-v2-line py-3 text-[14px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex-1 rounded-v2-md bg-v2-danger-strong py-3 text-[14px] font-bold text-v2-on-lake transition-transform duration-150 ease-out active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-danger-strong motion-reduce:transition-none"
            >
              刪除這筆支出
            </button>
          </div>
          {/* Keep the demo shell's floating back link clear of the sheet actions. */}
          <div className="h-11" aria-hidden="true" />
        </Sheet>
      )}
    </>
  )
}
