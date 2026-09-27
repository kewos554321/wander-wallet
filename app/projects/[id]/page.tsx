"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectOverviewV1 } from "@/components/v1/project/project-overview-v1"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ProjectOverviewV1 projectId={id} />} v2={<ProjectOverviewV2 projectId={id} />} />
}
