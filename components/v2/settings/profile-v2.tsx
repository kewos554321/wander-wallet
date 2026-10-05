"use client"

import { useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { generateAvatarString, parseAvatarString } from "@/components/avatar-picker"
import { ProfileV2View } from "./profile-v2-view"

export function ProfileV2() {
  const { user, refreshSession, logout } = useLiff()
  const authFetch = useAuthFetch()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const avatarData = parseAvatarString(user?.image)
  const hasExternalImage =
    Boolean(user?.image) && !user!.image!.startsWith("avatar:") && !user!.image!.startsWith("data:")

  async function handleAvatarSelect(iconId: string, colorId: string) {
    setSaving(true)
    try {
      const avatarString = generateAvatarString(iconId, colorId)
      const res = await authFetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: avatarString }),
      })
      if (!res.ok) throw new Error("儲存失敗")
      await refreshSession()
      setPickerOpen(false)
    } catch (error) {
      console.error("更新頭像失敗:", error)
      alert("儲存失敗，請稍後再試")
    } finally {
      setSaving(false)
    }
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <ProfileV2View
          name={user?.name || ""}
          image={user?.image ?? null}
          avatarData={avatarData}
          hasExternalImage={hasExternalImage}
          pickerOpen={pickerOpen}
          saving={saving}
          onOpenPicker={() => setPickerOpen(true)}
          onPickerOpenChange={setPickerOpen}
          onSelectAvatar={handleAvatarSelect}
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
