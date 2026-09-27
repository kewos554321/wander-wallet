import type { CategoryStat, DailyStat, MemberStat } from "@/lib/project-stats"
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

const heading = "mb-1.5 text-xs font-semibold text-v2-ink-muted"

export function StatsV2View({ projectId, currency, stats, currentMemberId }: StatsV2ViewProps) {
  return (
    <>
      <V2TopBar title="統計" backHref={`/projects/${projectId}`} />
      <section className="px-4 pt-[22px]">
        <p className={heading}>類別佔比</p>
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <CategoryDonut categories={stats.categories} currency={currency} />
        </div>
      </section>
      <section className="px-4 pt-[22px]">
        <p className={heading}>成員排行</p>
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <MemberRanking members={stats.members} currency={currency} currentMemberId={currentMemberId} />
        </div>
      </section>
      <section className="px-4 pt-[22px]">
        <p className={heading}>每日趨勢</p>
        <figure aria-label="每日趨勢" className="m-0 rounded-[14px] border border-v2-line bg-v2-surface px-4 pb-2.5 pt-4">
          <DailyTrend daily={stats.daily} />
        </figure>
      </section>
      <div className="h-6" />
    </>
  )
}
