"use client"

import { useCallback } from "react"
import { usePreferences } from "@/lib/hooks/use-preferences"
import { useUiVersion } from "@/lib/hooks/useUiVersion"
import { UI_VERSION_CHANGE_EVENT, UI_VERSION_STORAGE_KEY } from "@/lib/ui-version"

// Saves the Beta opt-in and drops the comparison overrides (url param and
// session storage) so the saved preference takes effect immediately.
export function useBetaToggle() {
  const { version } = useUiVersion()
  const { save, saving, error } = usePreferences()

  const toggle = useCallback(
    async (next: boolean) => {
      const ok = await save({ uiVersion: next ? "v2" : "v1" })
      if (!ok) return
      try {
        window.sessionStorage.removeItem(UI_VERSION_STORAGE_KEY)
      } catch {
        // Storage may be unavailable (LINE in-app browser / private mode).
      }
      const url = new URL(window.location.href)
      url.searchParams.delete("ui")
      window.history.replaceState(window.history.state, "", url)
      window.dispatchEvent(new Event(UI_VERSION_CHANGE_EVENT))
    },
    [save]
  )

  return { enabled: version === "v2", toggle, saving, error }
}
