import Link from "next/link"
import { Pencil, Share2 } from "lucide-react"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { OverviewProject, ProjectSummary } from "@/lib/project-overview"
import { formatTripDateRange } from "@/lib/trip"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"
import { V2BrandMark } from "@/components/v2/ui/v2-brand-mark"
import { TripSummaryCard } from "./trip-summary-card"
import { BalanceCard } from "./balance-card"
import { FeatureGrid } from "./feature-grid"
import { RecentExpenses } from "./recent-expenses"
import { QuickActions } from "./quick-actions"

interface ProjectOverviewV2ViewProps {
  project: OverviewProject
  summary: ProjectSummary
  onShare: () => void
  onVoice: () => void
  currentUserName?: string | null
  currentUserImage?: string | null
}

const pill =
  "flex h-8 items-center gap-1.5 rounded-[9px] border border-v2-lake-edge bg-v2-lake-soft px-2.5 text-[12px] font-semibold text-v2-lake"

export function ProjectOverviewV2View({
  project,
  summary,
  onShare,
  onVoice,
  currentUserName,
  currentUserImage,
}: ProjectOverviewV2ViewProps) {
  const currency = project.currency || DEFAULT_CURRENCY

  return (
    <>
      <V2TopBar
        title="旅程總覽"
        backHref="/projects"
        fixedBack
        backAriaLabel="回旅程列表"
        backClassName="flex h-[34px] w-[34px] items-center justify-center"
        backIcon={<V2BrandMark />}
        actions={
          <Link
            href="/settings"
            aria-label="通用設定"
            className="flex h-9 w-9 items-center justify-center"
          >
            <V2Avatar
              image={currentUserImage ?? null}
              name={currentUserName ?? null}
              className="h-9 w-9 rounded-full"
              fallbackClassName="bg-v2-lake text-sm font-bold text-v2-paper"
            />
          </Link>
        }
      />

      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="m-0 font-v2-serif text-2xl font-bold leading-8">{project.name}</h2>
          <p className="mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
            {formatTripDateRange(project.startDate, project.endDate)} · {project.members.length} 位旅伴
          </p>
          {project.description && (
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-[17px] tracking-[.3px] text-v2-ink-muted">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onShare} className={pill}>
            <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            分享
          </button>
          <Link href={`/projects/${project.id}/settings`} className={pill}>
            <Pencil className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
            修改
          </Link>
        </div>
      </div>

      <TripSummaryCard summary={summary} currency={currency} cover={project.cover ?? null} />
      <BalanceCard balance={summary.userBalance} currency={currency} projectId={project.id} />
      <FeatureGrid projectId={project.id} />
      <RecentExpenses projectId={project.id} expenses={project.expenses} currentMemberId={summary.currentMemberId} />
      <QuickActions projectId={project.id} onVoice={onVoice} />
    </>
  )
}
