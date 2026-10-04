"use client"

import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { mergePreferences, type NotificationPreferences, type UserPreferences } from "@/types/user-preferences"

type PreferencesPatch = Partial<Omit<UserPreferences, "notifications">> & { notifications?: Partial<NotificationPreferences> }

// Saves on top of the raw stored preferences so fields mergePreferences
// drops (e.g. uiVersion) survive a save from the settings page.
export function usePreferences() {
  const { user, updatePreferences } = useLiff()
  const authFetch = useAuthFetch()
  const preferences = mergePreferences(user?.preferences)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (patch: PreferencesPatch) => {
      const raw = (user?.preferences ?? {}) as Partial<UserPreferences>
      const next = {
        ...raw,
        ...preferences,
        ...patch,
        notifications: { ...preferences.notifications, ...(patch.notifications ?? {}) },
      } as UserPreferences
      setSaving(true)
      setError(null)
      try {
        const res = await authFetch("/api/users/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: next }),
        })
        if (!res.ok) throw new Error("save failed")
        updatePreferences(next)
        return true
      } catch {
        setError("儲存失敗，請重試")
        return false
      } finally {
        setSaving(false)
      }
    },
    [authFetch, preferences, updatePreferences, user?.preferences]
  )

  return { preferences, save, saving, error }
}
