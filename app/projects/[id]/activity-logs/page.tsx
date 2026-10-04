"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ActivityLogsV1 } from "@/components/v1/activity-logs/activity-logs-v1"
import { ActivityLogsV2 } from "@/components/v2/activity-logs/activity-logs-v2"

export default function ActivityLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ActivityLogsV1 projectId={id} />} v2={<ActivityLogsV2 projectId={id} />} />
}
