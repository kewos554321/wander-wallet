"use client"

import { useEffect, type RefObject } from "react"

/** Calls onDismiss on outside mousedown or Escape while active. */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    function handleDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss()
    }
    document.addEventListener("mousedown", handleDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [ref, onDismiss, active])
}
