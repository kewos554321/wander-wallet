"use client"

import { useState } from "react"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"
import { DEMO_USER } from "@/app/demo/_data/fixtures"

export default function ProfileDemoPage() {
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="mx-auto max-w-md">
      <ProfileV2View
        name={DEMO_USER.name}
        image={DEMO_USER.image}
        userId="u-demo"
        logoutOpen={logoutOpen}
        onLogoutOpenChange={setLogoutOpen}
        onLogout={() => alert("（demo）登出")}
      />
    </div>
  )
}
