"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"
import { ProjectTour } from "@/components/v2/onboarding/project-tour"
import { JoinTripSheet } from "@/components/v2/project/join-trip-sheet"
import { InviteSheetV2 } from "@/components/v2/project/invite-sheet-v2"
import { useLiff } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useOnboarding } from "@/lib/hooks/useOnboarding"
import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
import { ProjectOverviewV2View } from "./project-overview-v2-view"

// The tour only mounts once the overview (and its data-tour anchors) renders.
export function ProjectOverviewV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { user } = useLiff()
  const {
    project,
    loading,
    joinInfo,
    joining,
    joinProject,
    claimMember,
    refetch,
    summary,
    ratesLoading,
    ratesReady,
    usingFallback,
    ratesTimestamp,
    refetchRates,
  } = useProjectOverview(projectId)
  const {
    isOnboardingCompleted,
    isLoading: onboardingLoading,
    completeOnboarding,
  } = useOnboarding()
  const [showInvite, setShowInvite] = useState(false)
  // Which step the quick-expense overlay opens on; null means closed.
  const [quickStep, setQuickStep] = useState<"input" | null>(null)

  let content: ReactNode
  if (loading) {
    content = (
      <div data-testid="v2-overview-skeleton" className="space-y-3 p-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-v2-sand" />
        <div className="h-36 animate-pulse rounded-v2-lg bg-v2-sand" />
        <div className="h-20 animate-pulse rounded-v2-lg bg-v2-sand" />
      </div>
    )
  } else if (joinInfo) {
    content = (
      <JoinTripSheet
        info={joinInfo}
        joining={joining}
        onJoin={joinProject}
        onClaim={claimMember}
        onCancel={() => router.push("/projects")}
      />
    )
  } else if (!project || !summary) {
    content = <p className="py-8 text-center text-v2-ink-muted">旅程不存在</p>
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
          currentUserId={user?.id ?? null}
          ratesLoading={ratesLoading}
          ratesReady={ratesReady}
          usingFallback={usingFallback}
          ratesTimestamp={ratesTimestamp}
          onRetryRates={refetchRates}
        />
        <InviteSheetV2 open={showInvite} onOpenChange={setShowInvite} projectId={project.id} projectName={project.name} />
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
            userId: m.user?.id ?? null,
            isCurrentUser: m.id === summary.currentMemberId,
            isPlaceholder: !m.user,
            remainderDiscrepancy: m.remainderDiscrepancy ?? 0,
          }))}
          currentUserMemberId={summary.currentMemberId || ""}
          currency={project.currency || DEFAULT_CURRENCY}
          onSuccess={() => {
            refetch()
          }}
        />
        {!onboardingLoading && !isOnboardingCompleted && (
          <ProjectTour onComplete={completeOnboarding} onSkip={completeOnboarding} />
        )}
      </>
    )
  }

  return (
      <div className="mx-auto max-w-md">{content}</div>
  )
}
