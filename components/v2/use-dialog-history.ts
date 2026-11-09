"use client"

import { useEffect, useRef } from "react"

const KEY = "__v2Dialog"

/**
 * Makes the phone's native back button close a dialog instead of navigating to
 * the previous page.
 *
 * A dialog is only a DOM overlay, so it adds no browser history entry: the
 * hardware back button would pop the page behind it. While open, this hook
 * pushes one marked entry and listens for `popstate`. Popping onto a state
 * without this layer's marker means the user pressed back, so the dialog
 * closes. Closing by other means (X / backdrop / Escape) pops the pushed entry
 * so the history stack stays balanced.
 *
 * `id` must be unique per dialog layer; nested layers each push their own entry.
 * The pushed flag is instance state, so an entry inherited from an earlier
 * mount is never popped by a dialog that did not push it.
 */
export function useDialogHistory(open: boolean, onClose: () => void, id = "dialog") {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  const pushedRef = useRef(false)
  const marker = `${KEY}:${id}`

  useEffect(() => {
    if (!open) return

    if (!pushedRef.current && window.history.state?.[KEY] !== marker) {
      window.history.pushState({ ...window.history.state, [KEY]: marker }, "")
      pushedRef.current = true
    }

    const onPop = (event: PopStateEvent) => {
      const state = event.state as Record<string, unknown> | null
      // Landing on a state without this layer's marker means the user pressed
      // back. A different marker is a deeper layer's entry: leave it alone.
      if (state?.[KEY] !== marker) {
        pushedRef.current = false
        onCloseRef.current()
      }
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [open, marker])

  useEffect(() => {
    if (open || !pushedRef.current) return
    pushedRef.current = false
    if (window.history.state?.[KEY] === marker) window.history.back()
  }, [open, marker])
}
