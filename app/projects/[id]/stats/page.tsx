"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { StatsV1 } from "@/components/v1/stats/stats-v1"
import { StatsV2 } from "@/components/v2/stats/stats-v2"

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<StatsV1 projectId={id} />} v2={<StatsV2 projectId={id} />} />
}
