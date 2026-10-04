"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// iOS LIFF has no getUserMedia; same detection as components/ui/image-picker.tsx.
// iPadOS 13+ reports a desktop "Macintosh" user agent, so it is distinguished
// from a real Mac by touch support.
export function isIOSDevice(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true
  const maxTouchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints ?? 0
  return /Macintosh/.test(ua) && maxTouchPoints > 1
}

type CameraMode = "starting" | "live" | "fallback"

function hasCameraApi(): boolean {
  return typeof navigator !== "undefined" && !isIOSDevice() && !!navigator.mediaDevices?.getUserMedia
}

function isDenied(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "NotAllowedError"
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [mode, setMode] = useState<CameraMode>(() => (hasCameraApi() ? "starting" : "fallback"))
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!hasCameraApi()) return
    let cancelled = false
    // Narrow once so the async closures keep the same (non-null) reference.
    const media = navigator.mediaDevices

    async function requestStream(): Promise<MediaStream> {
      try {
        // Prefer the rear camera, but keep it "ideal" so a device whose only
        // camera faces the user (a desktop webcam) still resolves.
        return await media.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      } catch (err) {
        // A denied permission fails the same way again, so only retry with a
        // looser constraint for other failures (e.g. no "environment" camera).
        if (isDenied(err)) throw err
        return await media.getUserMedia({ video: true, audio: false })
      }
    }

    void (async () => {
      try {
        const stream = await requestStream()
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          // Set muted on the element so autoplay is allowed, then await play so a
          // rejection surfaces instead of silently leaving a black frame.
          video.muted = true
          video.srcObject = stream
          try {
            await video.play()
          } catch {
            // Autoplay can be deferred until the element is visible; not fatal.
          }
        }
        if (!cancelled) {
          setDenied(false)
          setMode("live")
        }
      } catch (err) {
        if (!cancelled) {
          setDenied(isDenied(err))
          setMode("fallback")
        }
      }
    })()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [attempt])

  // Re-request the camera, e.g. after the user allows it in the browser.
  const retry = useCallback(() => {
    if (!hasCameraApi()) return
    setDenied(false)
    setMode("starting")
    setAttempt((n) => n + 1)
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

  return { videoRef, mode, denied, retry, capture }
}
