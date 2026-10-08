"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"
import { JoinProjectDialog } from "@/components/project/join-project-dialog"
import { InviteDialog } from "@/components/project/invite-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { useLiff } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
import { ProjectOverviewV2View } from "./project-overview-v2-view"

// The onboarding tour targets v1 markup (data-tour) and is not shown in v2.
export function ProjectOverviewV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { user } = useLiff()
  const { project, loading, joinInfo, joining, joinProject, claimMember, refetch, summary } =
    useProjectOverview(projectId)
  const [showInvite, setShowInvite] = useState(false)
  // Which step the quick-expense overlay opens on; null means closed.
  const [quickStep, setQuickStep] = useState<"input" | null>(null)

  let content: ReactNode
  if (loading) {
    content = (
      <div data-testid="v2-overview-skeleton" className="space-y-3 p-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-v2-sand" />
        <div className="h-36 animate-pulse rounded-[20px] bg-v2-sand" />
        <div className="h-20 animate-pulse rounded-[18px] bg-v2-sand" />
      </div>
    )
  } else if (joinInfo) {
    content = (
      <JoinProjectDialog
        info={joinInfo}
        joining={joining}
        onJoin={joinProject}
        onClaim={claimMember}
        onCancel={() => router.push("/projects")}
      />
    )
  } else if (!project || !summary) {
    content = <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
  } else {
    content = (
      <>
        <ProjectOverviewV2View
          project={project}
          summary={summary}
          onShare={() => setShowInvite(true)}
          onVoice={() => setQuickStep("input")}
          currentUserName={user?.name ?? null}
          currentUserImage={user?.image ?? null}
        />
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} projectId={project.id} projectName={project.name} />
        <QuickExpenseV2
          open={quickStep !== null}
          onOpenChange={(open) => { if (!open) setQuickStep(null) }}
          initialStep={quickStep ?? "input"}
          projectId={project.id}
          projectName={project.name}
          members={project.members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            image: m.user?.image ?? null,
            isPlaceholder: !m.user,
            remainderDiscrepancy: m.remainderDiscrepancy ?? 0,
          }))}
          currentUserMemberId={summary.currentMemberId || ""}
          currency={project.currency || DEFAULT_CURRENCY}
          customRates={project.customRates}
          onSuccess={() => {
            refetch()
          }}
        />
      </>
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
