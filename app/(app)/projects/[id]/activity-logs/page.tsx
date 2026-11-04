"use client"

import { use } from "react"
import { ActivityLogsV2 } from "@/components/v2/activity-logs/activity-logs-v2"

export default function ActivityLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ActivityLogsV2 projectId={id} />
}
