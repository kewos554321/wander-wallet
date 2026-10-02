import Link from "next/link"
import { Settings, Share2 } from "lucide-react"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { OverviewProject, ProjectSummary } from "@/lib/project-overview"
import { formatTripDateRange } from "@/lib/trip"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
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
}

const iconButton =
  "flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink"

export function ProjectOverviewV2View({ project, summary, onShare, onVoice }: ProjectOverviewV2ViewProps) {
  const currency = project.currency || DEFAULT_CURRENCY

  return (
    <>
      <V2TopBar
        title="旅程總覽"
        backHref="/projects"
        actions={
          <>
            <button type="button" onClick={onShare} aria-label="分享" className={iconButton}>
              <Share2 className="h-4 w-4" strokeWidth={1.6} />
            </button>
            <Link href={`/projects/${project.id}/settings`} aria-label="專案設定" className={iconButton}>
              <Settings className="h-4 w-4" strokeWidth={1.6} />
            </Link>
          </>
        }
      />

      <div className="px-4 pt-4">
        <h2 className="m-0 font-v2-serif text-2xl font-bold leading-8">{project.name}</h2>
        <p className="mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
          {formatTripDateRange(project.startDate, project.endDate)} · {project.members.length} 位旅伴
        </p>
      </div>

      <TripSummaryCard summary={summary} currency={currency} />
      <BalanceCard balance={summary.userBalance} currency={currency} projectId={project.id} />
      <FeatureGrid projectId={project.id} />
      <RecentExpenses projectId={project.id} expenses={project.expenses} currentMemberId={summary.currentMemberId} />
      <QuickActions projectId={project.id} onVoice={onVoice} />
    </>
  )
}
