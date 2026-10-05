"use client"

import { useProjectData } from "@/lib/hooks"
import { useProjectExpenses } from "@/lib/hooks/useProjectExpenses"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { PhotosV2View } from "./photos-v2-view"

export function PhotosV2({ projectId }: { projectId: string }) {
  const { project, loading: projectLoading } = useProjectData(projectId)
  const { expenses, loading: expensesLoading } = useProjectExpenses(projectId, {
    projectName: project?.name ?? "",
  })

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <PhotosV2View
          projectId={projectId}
          currency={project?.currency ?? "TWD"}
          expenses={expenses}
          loading={projectLoading || expensesLoading}
        />
      </div>
    </UiV2Scope>
  )
}
