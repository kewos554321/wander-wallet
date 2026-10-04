"use client"

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { NewProjectV1 } from "@/components/v1/new-project/new-project-v1"
import { NewProjectV2 } from "@/components/v2/new-project/new-project-v2"

export default function NewProjectPage() {
  return <UiVersionSwitch v1={<NewProjectV1 />} v2={<NewProjectV2 />} />
}
