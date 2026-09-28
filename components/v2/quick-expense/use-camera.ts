"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// iOS LIFF has no getUserMedia; same detection as components/ui/image-picker.tsx.
export function isIOSDevice(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /iPad|iPhone|iPod/.test(ua)
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [mode, setMode] = useState<"starting" | "live" | "fallback">(() => {
    if (typeof navigator === "undefined" || isIOSDevice() || !navigator.mediaDevices?.getUserMedia) {
      return "fallback"
    }
    return "starting"
  })

  useEffect(() => {
    if (typeof navigator === "undefined" || isIOSDevice() || !navigator.mediaDevices?.getUserMedia) return
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          void video.play?.()?.catch?.(() => {})
        }
        setMode("live")
      })
      .catch(() => {
        if (!cancelled) setMode("fallback")
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const capture = useCallback(async (): Promise<File | null> => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
    return blob ? new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }) : null
  }, [])

  return { videoRef, mode, capture }
}
