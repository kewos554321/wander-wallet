"use client"

import { useState } from "react"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"
import { DEMO_USER } from "@/app/demo/_data/fixtures"

// Real profile view; avatar picking and logout are demo no-ops.
export default function ProfileDemoPage() {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="mx-auto max-w-md">
      <ProfileV2View
        name={DEMO_USER.name}
        image={DEMO_USER.image}
        avatarData={null}
        hasExternalImage={!!DEMO_USER.image}
        pickerOpen={pickerOpen}
        saving={false}
        onOpenPicker={() => setPickerOpen(true)}
        onPickerOpenChange={setPickerOpen}
        onSelectAvatar={() => {}}
        logoutOpen={logoutOpen}
        onLogoutOpenChange={setLogoutOpen}
        onLogout={() => alert("（demo）登出")}
      />
    </div>
  )
}
