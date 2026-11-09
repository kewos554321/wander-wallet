"use client"

// Shared camera/gallery plumbing for image fields. The receipt row uses it for
// two direct trailing icon buttons, so camera and album each stay two taps from
// a collapsed section.

import { useRef, useState } from "react"
import { CameraStep } from "@/components/v2/quick-expense/camera-step"

const MAX_SIZE_MB = 10

export function useImageSource({
  onChange,
  onError,
}: {
  onChange: (file: File) => void
  onError?: (message: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)

  function reportError(message: string) {
    setError(message)
    onError?.(message)
  }

  function acceptFile(file: File) {
    if (!file.type.startsWith("image/")) {
      reportError("請選擇圖片檔案")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      reportError(`圖片大小不能超過 ${MAX_SIZE_MB}MB`)
      return
    }
    setError(null)
    onChange(file)
  }

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) acceptFile(file)
  }

  return {
    error,
    clearError: () => setError(null),
    openCamera: () => setCameraOpen(true),
    openGallery: () => galleryRef.current?.click(),
    galleryInput: (
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleSelect} className="hidden" />
    ),
    camera: cameraOpen ? (
      <CameraStep
        onImage={(file) => {
          setCameraOpen(false)
          acceptFile(file)
        }}
        onClose={() => setCameraOpen(false)}
      />
    ) : null,
  }
}
