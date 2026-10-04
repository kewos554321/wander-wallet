import type { CategoryStat, DailyStat, MemberStat } from "@/lib/project-stats"
import Link from "next/link"
import { ChevronRight, LineChart } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CategoryDonut } from "./category-donut"
import { MemberRanking } from "./member-ranking"
import { DailyTrend } from "./daily-trend"

interface StatsV2ViewProps {
  projectId: string
  currency: string
  stats: { total: number; categories: CategoryStat[]; members: MemberStat[]; daily: DailyStat[] }
  currentMemberId: string | null
}

const heading = "mb-2.5 text-xs font-semibold text-v2-ink-muted"
const titleClassName = "text-[17px] font-semibold"

export function StatsV2View({ projectId, currency, stats, currentMemberId }: StatsV2ViewProps) {
  return (
    <>
      <V2TopBar title="統計" backHref={`/projects/${projectId}`} titleClassName={titleClassName} />
      <section className="px-4 pt-[22px]">
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <p className={heading}>類別佔比</p>
          <CategoryDonut categories={stats.categories} currency={currency} />
        </div>
      </section>
      <section className="px-4 pt-[22px]">
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <p className={heading}>成員排行</p>
          <MemberRanking members={stats.members} currency={currency} currentMemberId={currentMemberId} />
        </div>
      </section>
      <section className="px-4 pt-[22px]">
        <figure aria-label="每日趨勢" className="m-0 rounded-[14px] border border-v2-line bg-v2-surface px-4 pb-2.5 pt-4">
          <p className={heading}>每日趨勢</p>
          <DailyTrend daily={stats.daily} />
        </figure>
      </section>
      <div className="mx-4 mt-3.5 text-center">
        <Link href={`/projects/${projectId}/settle`} className="inline-flex items-center gap-[5px] text-xs font-semibold text-v2-ink-muted">
          <LineChart className="h-[13px] w-[13px]" strokeWidth={1.7} aria-hidden="true" />
          查看結算
          <ChevronRight className="h-[11px] w-[11px]" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
      <div className="h-6" />
    </>
  )
}
