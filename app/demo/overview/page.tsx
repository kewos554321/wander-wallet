"use client"

import { useState } from "react"
import { ProjectOverviewV2View } from "@/components/v2/project/project-overview-v2-view"
import { InviteSheetV2 } from "@/components/v2/project/invite-sheet-v2"
import { DEMO_PROJECT, DEMO_SUMMARY, DEMO_USER } from "@/app/demo/_data/fixtures"

// Real overview view fed by the shared fixtures. Client component so its
// callback props (onShare/onVoice) can reach the view's client children.
export default function OverviewDemoPage() {
  const [showInvite, setShowInvite] = useState(false)

  return (
    <div className="mx-auto max-w-md">
      <ProjectOverviewV2View
        project={DEMO_PROJECT}
        summary={DEMO_SUMMARY}
        onShare={() => setShowInvite(true)}
        onVoice={() => alert("（demo）語音記帳")}
        currentUserName={DEMO_USER.name}
        currentUserImage={DEMO_USER.image}
      />
      <InviteSheetV2
        open={showInvite}
        onOpenChange={setShowInvite}
        projectId={DEMO_PROJECT.id}
        projectName={DEMO_PROJECT.name}
      />
    </div>
  )
}
