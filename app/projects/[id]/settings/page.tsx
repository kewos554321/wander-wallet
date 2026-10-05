"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectSettingsV1 } from "@/components/v1/project-settings/project-settings-v1"
import { ProjectSettingsV2 } from "@/components/v2/project-settings/project-settings-v2"

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ProjectSettingsV1 projectId={id} />} v2={<ProjectSettingsV2 projectId={id} />} />
}
