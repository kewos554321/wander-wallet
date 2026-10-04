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

type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[]
  pointsOfInterest?: unknown
  torch?: boolean
}

function hasCameraApi(): boolean {
  return typeof navigator !== "undefined" && !isIOSDevice() && !!navigator.mediaDevices?.getUserMedia
}

function isDenied(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "NotAllowedError"
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const revertFocusRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [mode, setMode] = useState<CameraMode>(() => (hasCameraApi() ? "starting" : "fallback"))
  const [denied, setDenied] = useState(false)
  const [canFocus, setCanFocus] = useState(false)
  const [canTorch, setCanTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [facing, setFacing] = useState<string | null>(null)

  useEffect(() => {
    if (!hasCameraApi()) return
    let cancelled = false
    // Narrow once so the async closures keep the same (non-null) reference.
    const media = navigator.mediaDevices

    async function requestStream(): Promise<MediaStream> {
      // Ask for a full-resolution still; "ideal" never fails, so each device
      // settles on the closest resolution it supports (this is what fixes the
      // default low-res, blurry capture).
      const HD = { width: { ideal: 3840 }, height: { ideal: 2160 } }
      try {
        // Prefer the rear camera, but keep it "ideal" so a device whose only
        // camera faces the user (a desktop webcam) still resolves.
        return await media.getUserMedia({ video: { facingMode: { ideal: "environment" }, ...HD }, audio: false })
      } catch (err) {
        // A denied permission fails the same way again, so only retry with a
        // looser constraint for other failures (e.g. no "environment" camera).
        if (isDenied(err)) throw err
        return await media.getUserMedia({ video: HD, audio: false })
      }
    }

    // Reflect a track's capabilities into state.
    function applyTrack(track: MediaStreamTrack | null) {
      trackRef.current = track
      const caps = (track?.getCapabilities?.() ?? undefined) as CameraCapabilities | undefined
      const modes = caps?.focusMode ?? []
      // Tap-to-focus only makes sense with a single-shot focus or a point of interest.
      setCanFocus(modes.includes("single-shot") || caps?.pointsOfInterest !== undefined)
      setCanTorch(!!caps?.torch)
      setFacing(((track?.getSettings?.() ?? {}) as { facingMode?: string }).facingMode ?? null)
    }

    void (async () => {
      try {
        const stream = await requestStream()
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        applyTrack(stream.getVideoTracks?.()[0] ?? null)
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
      if (revertFocusRef.current) {
        clearTimeout(revertFocusRef.current)
        revertFocusRef.current = null
      }
      trackRef.current = null
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

  // Tap-to-focus: only acts when the track offers single-shot focus / a point of
  // interest.
  const focusAt = useCallback(async (x: number, y: number) => {
    const track = trackRef.current
    if (!track?.applyConstraints) return
    const caps = (track.getCapabilities?.() ?? {}) as CameraCapabilities
    const modes = caps.focusMode ?? []
    const hasPoints = caps.pointsOfInterest !== undefined
    if (!modes.includes("single-shot") && !hasPoints) return
    try {
      const advanced: Record<string, unknown>[] = [{ focusMode: modes.includes("single-shot") ? "single-shot" : "continuous" }]
      if (hasPoints) advanced[0].pointsOfInterest = [{ x, y }]
      await track.applyConstraints({ advanced } as unknown as MediaTrackConstraints)
      if (revertFocusRef.current) clearTimeout(revertFocusRef.current)
      revertFocusRef.current = setTimeout(() => {
        void track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints).catch(() => {})
      }, 1200)
    } catch {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: "single-shot" }] } as unknown as MediaTrackConstraints)
      } catch {
        // Device does not actually accept focus constraints.
      }
    }
  }, [])

  // Torch / flashlight: only available when the track reports torch support.
  const toggleTorch = useCallback(async () => {
    const track = trackRef.current
    if (!track?.applyConstraints) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints)
      setTorchOn(next)
    } catch {
      // Torch not accepted by the device; leave the toggle unchanged.
    }
  }, [torchOn])

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

  return { videoRef, mode, denied, canFocus, canTorch, torchOn, facing, retry, focusAt, toggleTorch, capture }
}
