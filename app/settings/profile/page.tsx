"use client"

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProfileV1 } from "@/components/v1/settings/profile-v1"
import { ProfileV2 } from "@/components/v2/settings/profile-v2"

export default function SettingsProfilePage() {
  return <UiVersionSwitch v1={<ProfileV1 />} v2={<ProfileV2 />} />
}
