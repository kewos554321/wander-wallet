"use client"

import { useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { JoinProjectDialog } from "@/components/project/join-project-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
import { computeProjectStats } from "@/lib/project-stats"
import { StatsV2View } from "./stats-v2-view"

export function StatsV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { project, loading, joinInfo, joining, joinProject, claimMember, summary, convert } = useProjectOverview(projectId)
  const stats = useMemo(() => (project ? computeProjectStats(project, convert) : null), [project, convert])

  let content: ReactNode
  if (loading) {
    content = (
      <div data-testid="v2-stats-skeleton" className="space-y-3 p-4">
        <div className="h-36 animate-pulse rounded-2xl bg-v2-sand" />
        <div className="h-36 animate-pulse rounded-2xl bg-v2-sand" />
      </div>
    )
  } else if (joinInfo) {
    content = (
      <JoinProjectDialog info={joinInfo} joining={joining} onJoin={joinProject} onClaim={claimMember} onCancel={() => router.push("/projects")} />
    )
  } else if (!project || !stats) {
    content = <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
  } else {
    content = (
      <StatsV2View
        projectId={projectId}
        currency={project.currency || DEFAULT_CURRENCY}
        stats={stats}
        currentMemberId={summary?.currentMemberId ?? null}
      />
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
