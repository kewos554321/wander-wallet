"use client"

import { useState } from "react"
import { SettleV2View } from "@/components/v2/settle/settle-v2-view"
import { SettlementCalcDialog } from "@/components/v2/settle/settle-calc-dialog"
import { SettleShareDialog } from "@/components/v2/settle/settle-share-dialog"
import { buildSettlementShareText } from "@/lib/settlement-share"
import { DEMO_CURRENCY, DEMO_CURRENT_MEMBER_ID, DEMO_PROJECT_ID, DEMO_SETTLE } from "@/app/demo/_data/fixtures"

// Real settlement view fed by the shared fixtures; calc/share render the real
// dialogs so the demo can be used to tune spacing and copy.
export default function DemoSettlePage() {
  const [showCalc, setShowCalc] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const shareText = buildSettlementShareText(DEMO_SETTLE, DEMO_CURRENCY)

  return (
    <div className="mx-auto max-w-md">
      <SettleV2View
        projectId={DEMO_PROJECT_ID}
        data={DEMO_SETTLE}
        currentMemberId={DEMO_CURRENT_MEMBER_ID}
        dailyAverage={5932}
        displayCurrencyCode={DEMO_CURRENCY}
        toDisplay={(n) => n}
        onShowCalc={() => setShowCalc(true)}
        onShare={() => setShowShare(true)}
      />
      <SettlementCalcDialog
        open={showCalc}
        onOpenChange={setShowCalc}
        data={DEMO_SETTLE}
        currentMemberId={DEMO_CURRENT_MEMBER_ID}
      />
      <SettleShareDialog open={showShare} onOpenChange={setShowShare} shareText={shareText} />
    </div>
  )
}
