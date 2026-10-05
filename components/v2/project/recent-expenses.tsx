import Link from "next/link"
import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { getRecentExpenses, type OverviewExpense, type OverviewMember } from "@/lib/project-overview"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"
import { NEUTRAL_AVATAR_TONE } from "@/components/v2/expenses/avatar-tone"

interface RecentExpensesProps {
  projectId: string
  expenses: OverviewExpense[]
  members: OverviewMember[]
  currentMemberId: string | null
}

export function RecentExpenses({ projectId, expenses, members, currentMemberId }: RecentExpensesProps) {
  const recent = getRecentExpenses(expenses)
  const memberById = new Map(members.map((member) => [member.id, member]))

  return (
    <section className="px-4 pb-44 pt-[22px]">
      <div data-testid="v2-recent-expenses-card" className="overflow-hidden rounded-[16px] border border-v2-line bg-v2-surface">
        <div className="flex items-baseline justify-between px-3.5 pb-2 pt-3.5">
          <p className="m-0 text-[13px] font-bold text-v2-lake">最近支出</p>
          <Link href={`/projects/${projectId}/expenses`} className="text-xs font-medium tracking-[.5px] text-v2-link">
            查看全部
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-v2-ink-muted">還沒有支出，點右下角開始記帳</p>
        ) : (
          recent.map((expense, i) => {
            const key = categoryKey(expense.category)
            const Icon = CATEGORY_ICONS[key]
            const isMe = expense.payer.id === currentMemberId
            const payerName = isMe ? "我" : expense.payer.displayName
            const payerMember = memberById.get(expense.payer.id)
            const participants = expense.participants
              .map((p) => memberById.get(p.memberId))
              .filter((m): m is OverviewMember => Boolean(m))
            const shown = participants.slice(0, 3)
            const overflow = participants.length - shown.length
            return (
              <Link
                key={expense.id}
                href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                className={`flex items-start gap-2.5 px-3 py-3 ${i < recent.length - 1 ? "border-b border-v2-line-soft" : ""}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_TONES[key]}`} aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="block min-w-0 flex-1 truncate text-sm font-medium leading-5 tracking-[.1px]">
                      {expense.description || getCategoryLabel(key)}
                    </span>
                    <span className="shrink-0 text-sm font-bold leading-5 tracking-[.1px] tabular-nums">
                      {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] leading-4 text-v2-ink-muted">
                    <V2Avatar
                      image={payerMember?.user?.image ?? null}
                      name={payerName}
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      fallbackClassName={`text-[7px] font-bold ${NEUTRAL_AVATAR_TONE}`}
                    />
                    <span className="min-w-0 truncate font-medium">{isMe ? "我付款" : `${payerName}付款`}</span>
                    <span className="h-px w-2 shrink-0 bg-v2-check" aria-hidden="true" />
                    <span className="flex shrink-0" aria-hidden="true">
                      {shown.map((m, idx) => {
                        const label = m.id === currentMemberId ? "我" : m.displayName
                        return (
                          <V2Avatar
                            key={m.id}
                            image={m.user?.image ?? null}
                            name={label}
                            className={`h-3.5 w-3.5 rounded-full border-2 border-v2-surface ${idx > 0 ? "-ml-[5px]" : ""}`}
                            fallbackClassName={`text-[6px] font-bold ${NEUTRAL_AVATAR_TONE}`}
                          />
                        )
                      })}
                      {overflow > 0 && (
                        <span className="-ml-[5px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-line text-[6px] font-bold text-v2-ink-muted">
                          +{overflow}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0">共{participants.length}人分攤</span>
                  </span>
                </span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
