"use client"

import { ProjectOverviewV2View } from "@/components/v2/project/project-overview-v2-view"
import { DEMO_PROJECT, DEMO_SUMMARY, DEMO_USER } from "@/app/demo/_data/fixtures"

// Same overview as /demo/overview, but over budget, so the real trip summary
// card renders its overflow segment and the "超出" caption.
export default function OverviewOverBudgetDemoPage() {
  return (
    <div className="mx-auto max-w-md">
      <ProjectOverviewV2View
        project={DEMO_PROJECT}
        summary={{
          ...DEMO_SUMMARY,
          totalAmount: 70900,
          perPerson: 17725,
          budget: 60000,
          budgetProgress: 118.2,
          budgetRemaining: -10900,
        }}
        onShare={() => alert("（demo）分享邀請")}
        onVoice={() => alert("（demo）語音記帳")}
        currentUserName={DEMO_USER.name}
        currentUserImage={DEMO_USER.image}
      />
    </div>
  )
}
