"use client"

import { Camera, Image as ImageIcon, X } from "lucide-react"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"
import { useImageSource } from "./use-image-source"

interface V2ImagePickerProps {
  label?: string
  /** Preview URL (object URL or data URL) to display, or null when empty. */
  value: string | null
  /** Called with the selected file once it passes validation. */
  onChange: (file: File) => void
  /** Called when the preview's remove button is pressed. */
  onRemove?: () => void
  /** Optional error callback; the message is also rendered inline as an alert. */
  onError?: (message: string) => void
}

/**
 * v2 image picker: a token-only card with two tiles (拍照 / 選擇圖片). 拍照 opens
 * the shared full-screen camera (live getUserMedia on desktop/Android, capture
 * input fallback on iOS), 選擇圖片 opens the gallery, and a preview with a
 * remove button shows once a value exists. Errors surface with role="alert"
 * instead of the browser alert().
 */
export function V2ImagePicker({ label = "收據/消費圖片", value, onChange, onRemove, onError }: V2ImagePickerProps) {
  const { error, clearError, openCamera, openGallery, galleryInput, camera } = useImageSource({ onChange, onError })

  const tile = "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-v2-check bg-v2-paper px-2.5 py-4 text-v2-ink-muted"

  return (
    <div className={SECTION_CARD}>
      <p className={`mb-2 ${SECTION_TITLE}`}>{label}</p>

      {error && (
        <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
          {error}
        </p>
      )}

      {value ? (
        <div className="relative overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="圖片預覽" className="max-h-48 w-full object-contain" />
          <button
            type="button"
            aria-label="移除圖片"
            onClick={() => {
              clearError()
              onRemove?.()
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-v2-ink/60 text-v2-paper"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5">
          <button type="button" onClick={openCamera} className={tile}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-coral-soft text-v2-coral" aria-hidden="true">
              <Camera className="h-[15px] w-[15px]" />
            </span>
            <span className="text-xs font-semibold">拍照</span>
          </button>
          <button type="button" onClick={openGallery} className={tile}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-lake-soft text-v2-lake" aria-hidden="true">
              <ImageIcon className="h-[15px] w-[15px]" />
            </span>
            <span className="text-xs font-semibold">選擇圖片</span>
          </button>
        </div>
      )}

      {galleryInput}
      {camera}
    </div>
  )
}
