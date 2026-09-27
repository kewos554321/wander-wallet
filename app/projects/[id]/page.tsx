"use client"

import { use } from "react"
import { ProjectOverviewV1 } from "@/components/v1/project/project-overview-v1"

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProjectOverviewV1 projectId={id} />
}
