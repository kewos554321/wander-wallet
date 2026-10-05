"use client"

import { useCallback } from "react"
import { usePreferences } from "@/lib/hooks/use-preferences"
import { useUiVersion } from "@/lib/hooks/useUiVersion"
import { UI_VERSION_CHANGE_EVENT, UI_VERSION_STORAGE_KEY } from "@/lib/ui-version"

// Saves the UI-version choice and drops the comparison overrides (url param and
// session storage) so the saved preference takes effect immediately.
//
// Default sense: `enabled` is true on v2 (opt in to the new UI), which is what
// the v1 settings page uses. The v2 settings page passes `{ invert: true }` to
// flip it into a "使用舊版介面" switch: `enabled` is true on v1.
export function useBetaToggle(options?: { invert?: boolean }) {
  const invert = options?.invert ?? false
  const { version } = useUiVersion()
  const { save, saving, error } = usePreferences()

  const toggle = useCallback(
    async (next: boolean) => {
      const target = invert ? (next ? "v1" : "v2") : next ? "v2" : "v1"
      const ok = await save({ uiVersion: target })
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
    [save, invert]
  )

  const enabled = invert ? version === "v1" : version === "v2"
  return { enabled, toggle, saving, error }
}
