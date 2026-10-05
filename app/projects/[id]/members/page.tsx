"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { MembersV1 } from "@/components/v1/members/members-v1"
import { MembersV2 } from "@/components/v2/members/members-v2"

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<MembersV1 projectId={id} />} v2={<MembersV2 projectId={id} />} />
}
