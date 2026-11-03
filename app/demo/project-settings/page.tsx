"use client"

import { ProjectSettingsV2View } from "@/components/v2/project-settings/project-settings-v2-view"
import { useProjectForm } from "@/lib/hooks/use-project-form"
import { DEMO_FORM_VALUES } from "@/app/demo/_data/fixtures"

// Real project-settings view; save/delete are demo no-ops.
export default function ProjectSettingsDemoPage() {
  const { values, set } = useProjectForm(DEMO_FORM_VALUES)

  return (
    <div className="mx-auto max-w-md">
      <ProjectSettingsV2View
        values={values}
        set={set}
        isCreator
        saving={false}
        submitError={null}
        onCancel={() => {}}
        onSave={() => alert("（demo）儲存專案")}
        onRequestDelete={() => alert("（demo）刪除專案")}
      />
    </div>
  )
}
