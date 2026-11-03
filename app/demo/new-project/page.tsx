"use client"

import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { NewProjectV2View } from "@/components/v2/new-project/new-project-v2-view"
import { useProjectForm } from "@/lib/hooks/use-project-form"
import { DEMO_FORM_VALUES } from "@/app/demo/_data/fixtures"

// Real create-trip view; the create action is a demo no-op.
export default function NewProjectDemoPage() {
  const { values, set } = useProjectForm(DEMO_FORM_VALUES)

  return (
    <div className="mx-auto max-w-md">
      <V2TopBar title="建立旅程" backHref="/demo" />
      <NewProjectV2View
        values={values}
        set={set}
        submitting={false}
        error={null}
        onCreate={() => alert("（demo）建立旅程")}
      />
    </div>
  )
}
