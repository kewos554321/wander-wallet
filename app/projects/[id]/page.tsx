"use client"

import { use } from "react"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProjectOverviewV2 projectId={id} />
}
