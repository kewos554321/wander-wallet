import Link from "next/link"
import { CalendarDays, ChevronRight, Image as ImageIcon, MapPin } from "lucide-react"
import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"
import { SwipeRow } from "./swipe-row"

const PARTICIPANT_TONES = ["bg-v2-lake", "bg-v2-coral", "bg-v2-plum"]

const monthDay = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const initial = (name: string) => name.charAt(0)

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
  const members = expense.participants.map((p) => p.member)
  const shown = members.slice(0, 3)
  const overflow = members.length - shown.length

  const body = (
    <div className="flex items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${CATEGORY_TONES[key]}`} aria-hidden="true">
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold leading-[19px]">{title}</h3>
          <span className="flex shrink-0 items-center gap-[3px]">
            <span className="text-sm font-bold tabular-nums text-v2-ink">
              {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
            </span>
            <ChevronRight className="h-3 w-3 text-v2-check" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-[5px] flex items-center gap-[5px] overflow-hidden whitespace-nowrap">
          <CalendarDays className="h-[11px] w-[11px] shrink-0 text-v2-ink-subtle" aria-hidden="true" />
          <span className="shrink-0 text-[11px] text-v2-ink-subtle">付款日期</span>
          <span className="shrink-0 text-[11px] font-semibold text-v2-ink">{monthDay(expense.expenseDate)}</span>
        </div>
        <div className="mt-[5px] flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <span
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-v2-on-lake ${isMe ? "bg-v2-lake" : "bg-v2-coral"}`}
            aria-hidden="true"
          >
            {initial(payerName)}
          </span>
          <span className="shrink-0 text-[11px] font-medium">{isMe ? "我付款" : `${payerName}付款`}</span>
          <span className="h-px w-2 shrink-0 bg-v2-check" aria-hidden="true" />
          <span className="flex shrink-0" aria-hidden="true">
            {shown.map((m, i) => {
              const label = m.id === currentMemberId ? "我" : initial(m.displayName)
              return (
                <span
                  key={m.id}
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-v2-surface text-[6px] font-bold text-v2-on-lake ${PARTICIPANT_TONES[i % PARTICIPANT_TONES.length]} ${i > 0 ? "-ml-[5px]" : ""}`}
                >
                  {label}
                </span>
              )
            })}
            {overflow > 0 && (
              <span className="-ml-[5px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-line text-[6px] font-bold text-v2-ink-muted">
                +{overflow}
              </span>
            )}
          </span>
          <span className="shrink-0 text-[11px] text-v2-ink-subtle">共{members.length}人分攤</span>
        </div>
      </div>
    </div>
  )

  const footer = (
    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-v2-line pt-2.5">
      <span className="flex min-w-0 items-center gap-[5px]">
        {expense.location ? (
          <>
            <MapPin className="h-3 w-3 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
            <span className="truncate text-[11px] text-v2-ink-muted">{expense.location}</span>
          </>
        ) : (
          <span className="truncate text-[11px] text-v2-ink-subtle">未填寫地點</span>
        )}
      </span>
      {!selectMode && expense.image ? (
        <span className="block h-8 w-8 shrink-0" aria-hidden="true" />
      ) : (
        <span
          aria-label={expense.image ? "已附明細圖片" : "未附明細圖片"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
            expense.image ? "bg-v2-lake-border text-v2-lake" : "bg-v2-line-soft text-v2-check"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
        </span>
      )}
    </div>
  )

  const card = (
    <div className="relative rounded-[14px] border border-v2-line bg-v2-surface p-[11px] shadow-[0_1px_2px_rgba(27,24,21,.05)]">
      {selectMode ? (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(expense.id)}
            aria-label={`選取 ${title}`}
            className="mt-4 h-4 w-4 accent-v2-lake"
          />
          <div className="min-w-0 flex-1">
            {body}
            {footer}
          </div>
        </label>
      ) : (
        <>
          <Link href={`/projects/${projectId}/expenses/${expense.id}/edit`} className="block">
            {body}
            {footer}
          </Link>
          {expense.image && (
            <button
              type="button"
              aria-label="查看圖片"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onViewImage(expense.image!)
              }}
              className="absolute bottom-[11px] right-[11px] flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-v2-lake-border text-v2-lake"
            >
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="mb-2">
      <SwipeRow onDelete={() => onRequestDelete(expense)} disabled={selectMode}>
        {card}
      </SwipeRow>
    </div>
  )
}
