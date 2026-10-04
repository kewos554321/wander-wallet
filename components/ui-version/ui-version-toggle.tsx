"use client"

import { useUiVersion } from "@/lib/hooks/useUiVersion"

// Only visible after ?ui= was used in this session (comparison mode).
export function UiVersionToggle() {
  const { version, overridden, setVersion } = useUiVersion()
  if (!overridden || version === null) return null

  const next = version === "v2" ? "v1" : "v2"
  return (
    <button
      type="button"
      onClick={() => setVersion(next)}
      aria-label={`切換到 ${next.toUpperCase()}`}
      className="fixed left-3 bottom-24 z-[60] rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
    >
      UI {version.toUpperCase()} → {next.toUpperCase()}
    </button>
  )
}
