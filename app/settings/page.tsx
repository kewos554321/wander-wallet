"use client"

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { GeneralSettingsV1 } from "@/components/v1/settings/general-settings-v1"
import { GeneralSettingsV2 } from "@/components/v2/settings/general-settings-v2"

export default function SettingsPage() {
  return <UiVersionSwitch v1={<GeneralSettingsV1 />} v2={<GeneralSettingsV2 />} />
}
