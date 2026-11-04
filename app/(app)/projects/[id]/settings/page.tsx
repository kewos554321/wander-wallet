"use client"

import { use } from "react"
import { ProjectSettingsV2 } from "@/components/v2/project-settings/project-settings-v2"

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProjectSettingsV2 projectId={id} />
}
