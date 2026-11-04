"use client"

import { useState } from "react"
import { useLiff } from "@/components/auth/liff-provider"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { ProfileV2View } from "./profile-v2-view"

export function ProfileV2() {
  const { user, logout } = useLiff()
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <ProfileV2View
          name={user?.name || ""}
          image={user?.image ?? null}
          userId={user?.id ?? null}
          logoutOpen={logoutOpen}
          onLogoutOpenChange={setLogoutOpen}
          onLogout={() => {
            setLogoutOpen(false)
            void logout()
          }}
        />
      </div>
    </UiV2Scope>
  )
}
