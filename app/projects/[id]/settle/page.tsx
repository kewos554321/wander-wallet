"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { SettleV1 } from "@/components/v1/settle/settle-v1"
import { SettleV2 } from "@/components/v2/settle/settle-v2"

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<SettleV1 projectId={id} />} v2={<SettleV2 projectId={id} />} />
}
