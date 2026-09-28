"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import { itemTotals, type QuickItem } from "@/lib/quick-expense/draft"
import { QuickItemCard } from "./quick-item-card"

type Member = { id: string; displayName: string }
const SWIPE_THRESHOLD = 50

export function ConfirmStep({ items, members, index, onIndexChange, onItemsChange, onReinput, onSubmit, onClose, canNotifyLine, error }: {
  items: QuickItem[]
  members: Member[]
  index: number
  onIndexChange: (i: number) => void
  onItemsChange: (items: QuickItem[]) => void
  onReinput: () => void
  onSubmit: (notifyLine: boolean) => void
  onClose: () => void
  canNotifyLine: boolean
  error: string | null
}) {
  const [notifyLine, setNotifyLine] = useState(true)
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
      <div className="flex items-center justify-between px-4 py-3">
        <p className="m-0 text-base font-semibold">AI 快速記帳</p>
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake-soft">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-medium">支出明細</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="上一筆" disabled={index === 0} onClick={() => go(index - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-v2-lake-soft disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold tabular-nums">{`${index + 1} / ${items.length}`}</span>
          <button type="button" aria-label="下一筆" disabled={index === items.length - 1} onClick={() => go(index + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-v2-lake-soft disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (dx <= -SWIPE_THRESHOLD) go(index + 1)
          else if (dx >= SWIPE_THRESHOLD) go(index - 1)
        }}
      >
        <QuickItemCard key={current.id} item={current} members={members} onChange={patch} onRemove={remove} />
      </div>
      <div className="h-44" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-v2-ink-muted">{`共 ${items.length} 筆`}</span>
            <span className="font-bold text-v2-lake">{totals}</span>
          </div>
          {canNotifyLine && (
            <label className="mb-2 flex items-center gap-2.5">
              <input type="checkbox" checked={notifyLine} onChange={(e) => setNotifyLine(e.target.checked)} className="h-5 w-5 accent-[#1B5847]" />
              <span>
                <span className="block text-xs font-bold">通知 LINE 群組</span>
                <span className="block text-xs text-v2-ink-muted">新增後自動發送通知到群組</span>
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onReinput} className="flex-1 rounded-[14px] border border-v2-line py-3.5 text-sm font-bold">
              重新輸入
            </button>
            <button type="button" onClick={() => onSubmit(canNotifyLine && notifyLine)} className="flex-[2] rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-white">
              {`新增 ${items.length} 筆`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
