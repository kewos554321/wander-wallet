import Link from "next/link"
import Image from "next/image"
import { MapPin, Trash2 } from "lucide-react"
import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { formatMonthDayTime } from "@/lib/expense-list"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"

const DOT_TONES = ["bg-v2-lake-soft", "bg-v2-coral-soft", "bg-v2-plum-soft", "bg-v2-rose-soft"]

interface ExpenseCardProps {
  projectId: string
  expense: ProjectExpense
  currentMemberId: string | null
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onRequestDelete: (expense: ProjectExpense) => void
  onViewImage: (url: string) => void
}

export function ExpenseCard({
  projectId,
  expense,
  currentMemberId,
  selectMode,
  selected,
  onToggleSelect,
  onRequestDelete,
  onViewImage,
}: ExpenseCardProps) {
  const key = categoryKey(expense.category)
  const Icon = CATEGORY_ICONS[key]
  const isMe = expense.payer.id === currentMemberId
  const payerName = isMe ? "我" : expense.payer.displayName
  const title = expense.description || getCategoryLabel(key)

  const body = (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${CATEGORY_TONES[key]}`} aria-hidden="true">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <span className="mt-[3px] text-xs text-v2-ink-subtle">{getCategoryLabel(key)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 truncate text-base font-medium leading-6 tracking-[.15px]">{title}</h3>
          <p className="m-0 text-base font-bold tabular-nums">
            {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
          </p>
        </div>
        <p className="mt-[3px] text-xs text-v2-ink-subtle">付款 {formatMonthDayTime(expense.expenseDate)}</p>
        <p className="mt-px text-xs text-v2-ink-subtle">建立 {formatMonthDayTime(expense.createdAt)}</p>
        {expense.location && (
          <p className="mt-px flex items-center gap-1 text-xs text-v2-ink-subtle">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            <span className="truncate">{expense.location}</span>
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="mb-3 rounded-2xl border border-[#F0EAE0] bg-v2-surface p-3.5 shadow-[0_4px_12px_rgba(27,24,21,.05)]">
      <div className="relative">
        {selectMode ? (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(expense.id)}
              aria-label={`選取 ${title}`}
              className="mt-4 h-4 w-4 accent-[#1B5847]"
            />
            <div className="min-w-0 flex-1">{body}</div>
          </label>
        ) : (
          <Link href={`/projects/${projectId}/expenses/${expense.id}/edit`} className="block pb-0">
            {body}
          </Link>
        )}
        {expense.image && !selectMode && (
          <button
            type="button"
            aria-label="查看圖片"
            onClick={() => onViewImage(expense.image!)}
            className="absolute bottom-0 right-0 h-10 w-10 overflow-hidden rounded-[10px] bg-gradient-to-br from-v2-line to-v2-check"
          >
            <Image src={expense.image} alt="" fill sizes="40px" className="object-cover" />
          </button>
        )}
      </div>
      <div
        data-testid={`expense-footer-${expense.id}`}
        className="mt-2.5 flex items-center justify-between border-t border-[#F0EAE0] pt-2.5"
      >
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${isMe ? "bg-v2-lake" : "bg-v2-coral"}`}
            aria-hidden="true"
          >
            {payerName.charAt(0)}
          </span>
          <span className="font-medium">{payerName}</span>
          <span className="text-v2-check" aria-hidden="true">·</span>
          <span className="ml-0.5 flex" aria-hidden="true">
            {expense.participants.slice(0, 4).map((p, i) => (
              <span
                key={p.id}
                className={`h-4 w-4 rounded-full border-2 border-white ${DOT_TONES[i % DOT_TONES.length]} ${i > 0 ? "-ml-[5px]" : ""}`}
              />
            ))}
          </span>
          <span className="text-v2-ink-subtle">{expense.participants.length}人</span>
        </div>
        {!selectMode && (
          <button
            type="button"
            aria-label="刪除"
            onClick={() => onRequestDelete(expense)}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg text-v2-check"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          </button>
        )}
      </div>
    </div>
  )
}
