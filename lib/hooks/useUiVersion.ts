"use client"

import { useCallback, useEffect, useState } from "react"
import { useLiff } from "@/components/auth/liff-provider"
import {
  type UiVersion,
  UI_VERSION_CHANGE_EVENT,
  parseUiVersion,
  readStoredUiVersion,
  resolveUiVersion,
  writeStoredUiVersion,
} from "@/lib/ui-version"

interface UiVersionState {
  version: UiVersion | null
  overridden: boolean
}

export function useUiVersion() {
  const { user } = useLiff()
  const preference = user?.preferences?.uiVersion
  const [state, setState] = useState<UiVersionState>({ version: null, overridden: false })

  useEffect(() => {
    // Read window.location directly: useSearchParams would force a
    // Suspense boundary on every page that renders this hook.
    const sync = () => {
      const param = new URLSearchParams(window.location.search).get("ui")
      const resolved = resolveUiVersion({ param, stored: readStoredUiVersion(), preference })
      if (parseUiVersion(param)) writeStoredUiVersion(resolved.version)
      setState(resolved)
    }
    sync()
    window.addEventListener(UI_VERSION_CHANGE_EVENT, sync)
    return () => window.removeEventListener(UI_VERSION_CHANGE_EVENT, sync)
  }, [preference])

  const setVersion = useCallback((version: UiVersion) => {
    writeStoredUiVersion(version)
    // Keep the param in the url so the choice survives even without storage.
    const url = new URL(window.location.href)
    url.searchParams.set("ui", version)
    window.history.replaceState(window.history.state, "", url)
    window.dispatchEvent(new Event(UI_VERSION_CHANGE_EVENT))
  }, [])

  return { ...state, setVersion }
}
