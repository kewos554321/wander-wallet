"use client"

import { useLiff } from "@/components/auth/liff-provider"
import { AdContainer } from "@/components/ads/ad-container"
import { useProjects } from "@/lib/hooks/useProjects"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { ProjectsV2View } from "./projects-v2-view"

export function ProjectsV2() {
  const { user } = useLiff()
  const { projects, loading } = useProjects()

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <ProjectsV2View
          projects={projects}
          loading={loading}
          userName={user?.name ?? null}
          userImage={user?.image ?? null}
          now={new Date()}
          adSlot={<AdContainer placement="project-list" variant="banner" />}
        />
      </div>
    </UiV2Scope>
  )
}
