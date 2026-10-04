"use client"

import { useRef } from "react"
import { Check, RotateCcw, Send, Trash2, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import { itemTotals, type QuickItem } from "@/lib/quick-expense/draft"
import { QuickItemCard } from "./quick-item-card"

type Member = { id: string; displayName: string }
const SWIPE_THRESHOLD = 50

export function ConfirmStep({ items, members, index, onIndexChange, onItemsChange, onReinput, onSubmit, onClose, canNotifyLine, notifyLine, onNotifyLineChange, error }: {
  items: QuickItem[]
  members: Member[]
  index: number
  onIndexChange: (i: number) => void
  onItemsChange: (items: QuickItem[]) => void
  onReinput: () => void
  onSubmit: (notifyLine: boolean) => void
  onClose: () => void
  canNotifyLine: boolean
  notifyLine: boolean
  onNotifyLineChange: (notifyLine: boolean) => void
  error: string | null
}) {
  const touchX = useRef<number | null>(null)
  const current = items[index]
  const go = (i: number) => i >= 0 && i < items.length && onIndexChange(i)
  const patch = (p: Partial<QuickItem>) => onItemsChange(items.map((it, i) => (i === index ? { ...it, ...p } : it)))
  const remove = () => {
    onItemsChange(items.filter((_, i) => i !== index))
    if (index > 0 && index >= items.length - 1) onIndexChange(index - 1)
  }
  const totals = itemTotals(items).map((t) => formatCurrency(t.total, t.currency)).join(" · ")

  if (!current) return null
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between border-b border-v2-line px-4 py-4">
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-sand">
          <X className="h-4 w-4" />
        </button>
        <h1 className="m-0 font-v2-serif text-[17px] font-semibold">AI 快速記帳</h1>
        <span className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className="mx-4 mt-5 flex items-center justify-between">
        <p className="m-0 text-[13px] font-bold">支出明細</p>
        <span className="text-xs tabular-nums text-v2-ink-muted">{`${index + 1} / ${items.length}`}</span>
      </div>

      <div className="mx-4 mt-2 flex items-center justify-center gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            aria-label={`第 ${i + 1} 筆`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onIndexChange(i)}
            className={`h-2 rounded-full ${i === index ? "w-6 bg-v2-lake" : "w-2 bg-v2-line"}`}
          />
        ))}
      </div>

      <div className="mx-4 mt-3 flex justify-end">
        <button type="button" onClick={remove} className="flex h-7 items-center gap-1 rounded-full bg-v2-coral-soft px-3 text-xs font-bold text-v2-danger">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          刪除此筆
        </button>
      </div>

      <p className="mx-4 mt-1 text-center text-[11px] text-v2-ink-subtle">{`← 左右滑動切換這一批的 ${items.length} 筆支出 →`}</p>

      <div
        className="mt-2"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (dx <= -SWIPE_THRESHOLD) go(index + 1)
          else if (dx >= SWIPE_THRESHOLD) go(index - 1)
        }}
      >
        <QuickItemCard key={current.id} item={current} members={members} onChange={patch} />
      </div>
      <div className="h-44" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {canNotifyLine && (
            <label className="mb-2.5 flex items-center gap-[10px] rounded-[14px] border border-v2-line bg-v2-surface px-[14px] py-3">
              <input type="checkbox" checked={notifyLine} onChange={(e) => onNotifyLineChange(e.target.checked)} className="peer sr-only" />
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-v2-check bg-v2-surface text-transparent peer-checked:border-v2-lake peer-checked:bg-v2-lake peer-checked:text-v2-on-lake"
              >
                <Check className="h-3 w-3" />
              </span>
              <span>
                <span className="block text-xs font-bold">通知 LINE 群組</span>
                <span className="mt-px block text-xs text-v2-ink-muted">新增後自動發送通知到群組</span>
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
              {error}
            </p>
          )}
          <div className="mb-2.5 flex items-center justify-between rounded-[14px] bg-v2-lake-soft px-4 py-3">
            <span className="text-xs font-semibold text-v2-lake">{`共 ${items.length} 筆`}</span>
            <span className="font-v2-serif text-[17px] font-bold text-v2-lake">{totals}</span>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={onReinput} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-v2-line bg-v2-surface py-[13px] text-[13px] font-bold">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              重新輸入
            </button>
            <button type="button" onClick={() => onSubmit(canNotifyLine && notifyLine)} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-v2-lake py-[13px] text-[13px] font-bold text-v2-on-lake">
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {`新增 ${items.length} 筆`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
