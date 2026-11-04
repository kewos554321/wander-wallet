"use client"

import { useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { JoinTripSheet } from "@/components/v2/project/join-trip-sheet"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
import { computeProjectStats } from "@/lib/project-stats"
import { StatsV2View } from "./stats-v2-view"

export function StatsV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { project, loading, joinInfo, joining, joinProject, claimMember, summary, convert } = useProjectOverview(projectId)
  const stats = useMemo(() => {
    if (!project) return null
    const base = computeProjectStats(project, convert, project.currency)
    const memberMeta = new Map(
      project.members.map((m) => [
        m.id,
        { image: m.user?.image ?? null, isPlaceholder: !m.user, seed: m.user?.id ?? m.id },
      ]),
    )
    return {
      ...base,
      members: base.members.map((m) => ({
        ...m,
        ...(memberMeta.get(m.id) ?? { image: null, isPlaceholder: false, seed: m.id }),
      })),
    }
  }, [project, convert])

  let content: ReactNode
  if (loading) {
    content = (
      <>
        <V2TopBar title="統計" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />
        <div data-testid="v2-stats-skeleton" className="space-y-3 p-4">
          <div className="h-36 animate-pulse rounded-2xl bg-v2-sand" />
          <div className="h-36 animate-pulse rounded-2xl bg-v2-sand" />
        </div>
      </>
    )
  } else if (joinInfo) {
    content = (
      <JoinTripSheet info={joinInfo} joining={joining} onJoin={joinProject} onClaim={claimMember} onCancel={() => router.push("/projects")} />
    )
  } else if (!project || !stats) {
    content = (
      <>
        <V2TopBar title="統計" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />
        <p className="py-8 text-center text-v2-ink-muted">旅程不存在</p>
      </>
    )
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
      <div className="mx-auto max-w-md">{content}</div>
  )
}
