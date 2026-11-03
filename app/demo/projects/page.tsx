import { ProjectsV2View } from "@/components/v2/projects/projects-v2-view"
import { DEMO_PROJECT_CARDS, DEMO_USER } from "@/app/demo/_data/fixtures"

// Real project-list view fed by the shared fixtures. Server component: no hooks.
export default function DemoProjectsPage() {
  return (
    <div className="mx-auto max-w-md">
      <ProjectsV2View
        projects={DEMO_PROJECT_CARDS}
        loading={false}
        userName={DEMO_USER.name}
        userImage={DEMO_USER.image}
        now={new Date(2026, 9, 11)}
      />
    </div>
  )
}
