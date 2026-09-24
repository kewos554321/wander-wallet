"use client"

import * as React from "react"
import {
  DESIGN_VARIANT_STORAGE_KEY,
  THEME_V2_FLAG_ENABLED,
  type DesignVariant,
} from "@/lib/design-variant"

type DesignVariantProviderProps = {
  children: React.ReactNode
}

function applyDesignVariant(variant: DesignVariant) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (variant === "v2") {
    root.setAttribute("data-theme", "v2")
  } else {
    root.removeAttribute("data-theme")
  }
}

export function DesignVariantProvider({ children }: DesignVariantProviderProps) {
  const [variant, setVariantState] = React.useState<DesignVariant>(() => {
    if (!THEME_V2_FLAG_ENABLED || typeof window === "undefined") return "legacy"
    const stored = window.localStorage.getItem(DESIGN_VARIANT_STORAGE_KEY)
    return stored === "v2" ? "v2" : "legacy"
  })

  React.useEffect(() => {
    // Flag 關閉時強制 legacy，不管裝置上留了什麼舊值，確保 production 不受影響
    applyDesignVariant(THEME_V2_FLAG_ENABLED ? variant : "legacy")
  }, [variant])

  const setVariant = React.useCallback((next: DesignVariant) => {
    if (!THEME_V2_FLAG_ENABLED) return
    setVariantState(next)
    try {
      window.localStorage.setItem(DESIGN_VARIANT_STORAGE_KEY, next)
    } catch {}
  }, [])

  const value = React.useMemo(
    () => ({ variant: THEME_V2_FLAG_ENABLED ? variant : ("legacy" as DesignVariant), setVariant, flagEnabled: THEME_V2_FLAG_ENABLED }),
    [variant, setVariant]
  )

  return (
    <DesignVariantContext.Provider value={value}>
      {children}
    </DesignVariantContext.Provider>
  )
}

type DesignVariantContextValue = {
  variant: DesignVariant
  setVariant: (v: DesignVariant) => void
  flagEnabled: boolean
}

const DesignVariantContext = React.createContext<DesignVariantContextValue | undefined>(undefined)

export function useDesignVariant() {
  const ctx = React.useContext(DesignVariantContext)
  if (!ctx) throw new Error("useDesignVariant must be used within DesignVariantProvider")
  return ctx
}
