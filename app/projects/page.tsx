"use client"

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectsV1 } from "@/components/v1/projects/projects-v1"
import { ProjectsV2 } from "@/components/v2/projects/projects-v2"

export default function ProjectsPage() {
  return <UiVersionSwitch v1={<ProjectsV1 />} v2={<ProjectsV2 />} />
}
