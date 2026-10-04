"use client"

import type { ReactNode } from "react"
import { useUiVersion } from "@/lib/hooks/useUiVersion"

interface UiVersionSwitchProps {
  v1: ReactNode
  v2: ReactNode
  fallback?: ReactNode
}

export function UiVersionSwitch({ v1, v2, fallback = null }: UiVersionSwitchProps) {
  const { version } = useUiVersion()
  if (version === null) return <>{fallback}</>
  return <>{version === "v2" ? v2 : v1}</>
}
