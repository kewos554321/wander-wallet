import { Sparkles, type LucideIcon } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import { parseCover } from "@/lib/covers"
import type { ProjectSummary } from "@/lib/project-overview"
import { COVER_ICON_COMPONENTS } from "@/components/v2/cover/cover-icons"

export function TripSummaryCard({
  summary,
  currency,
  cover,
}: {
  summary: ProjectSummary
  currency: string
  cover?: string | null
}) {
  const { totalAmount, perPerson, budget, budgetProgress, budgetRemaining } = summary
  const fmt = (n: number) => formatCurrency(Math.round(n), currency)

  const parsed = parseCover(cover ?? null)
  const coverIcon = parsed.type === "icon" && parsed.iconId && COVER_ICON_COMPONENTS[parsed.iconId] ? parsed.iconId : null
  const Decoration: LucideIcon = coverIcon ? COVER_ICON_COMPONENTS[coverIcon] : Sparkles

  return (
    <div data-testid="v2-trip-summary-card" className="relative mx-4 mt-3 overflow-hidden rounded-[20px] bg-v2-lake text-v2-paper">
      <Decoration
        data-testid="trip-summary-decoration"
        data-cover={coverIcon ?? "sparkles"}
        className="absolute -right-6 -top-6 h-[120px] w-[120px] opacity-[.08]"
        strokeWidth={1.2}
        aria-hidden="true"
      />
      <div className="relative px-5 py-4">
        <p className="mb-[3px] text-sm font-medium leading-5 tracking-[.1px] opacity-[.78]">旅程總覽</p>
        <p className="m-0 font-v2-serif text-[32px] font-bold leading-10 tabular-nums">{fmt(totalAmount)}</p>
        <p className="mt-[3px] text-xs leading-4 tracking-[.4px] opacity-[.85]">平均每人 {fmt(perPerson)}</p>
        {budget !== null && budgetRemaining !== null && (
          <>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[rgba(250,247,242,.22)]">
                <div className="h-full rounded-full bg-v2-paper" style={{ width: `${budgetProgress}%` }} />
              </div>
              <span className="shrink-0 text-xs font-medium leading-4 tracking-[.5px]">{Math.round(budgetProgress)}%</span>
            </div>
            <p className="mt-1 text-xs leading-4 tracking-[.4px] opacity-75">
              {fmt(totalAmount)} ／ {fmt(budget)}（{budgetRemaining >= 0 ? `剩餘 ${fmt(budgetRemaining)}` : `超支 ${fmt(-budgetRemaining)}`}）
            </p>
          </>
        )}
      </div>
    </div>
  )
}
