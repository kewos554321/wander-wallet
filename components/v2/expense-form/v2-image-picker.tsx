"use client"

import { useRef, useState } from "react"
import { Camera, ImagePlus } from "lucide-react"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"

const MAX_SIZE_MB = 10

interface V2ImagePickerProps {
  label?: string
  /** Preview URL (object URL or data URL) to display, or null when empty. */
  value: string | null
  /** Called with the selected file once it passes validation. */
  onChange: (file: File) => void
  /** Optional error callback; the message is also rendered inline as an alert. */
  onError?: (message: string) => void
}

/**
 * v2 image picker: a token-only card with a bottom popup (inline, no Portal)
 * offering 拍照 (capture) and 從相簿選擇 (gallery). Errors are surfaced with
 * role="alert" instead of the browser alert().
 */
export function V2ImagePicker({ label = "收據/消費圖片", value, onChange, onError }: V2ImagePickerProps) {
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function reportError(message: string) {
    setError(message)
    onError?.(message)
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
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
    setOpen(false)
  }

  return (
    <div className={SECTION_CARD}>
      <p className={`mb-2 ${SECTION_TITLE}`}>{label}</p>

      {error && (
        <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
          {error}
        </p>
      )}

      {value && (
        <div className="mb-2 overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="圖片預覽" className="max-h-48 w-full object-contain" />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-v2-check bg-v2-paper py-3 text-xs font-semibold text-v2-ink-muted"
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        {value ? "更換圖片" : "新增圖片"}
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-[14px] border border-v2-line bg-v2-paper">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              cameraRef.current?.click()
            }}
            className="flex w-full items-center gap-2.5 border-b border-v2-line-soft px-3.5 py-3 text-[13px] font-semibold text-v2-ink"
          >
            <Camera className="h-4 w-4 text-v2-lake" aria-hidden="true" />
            拍照
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              galleryRef.current?.click()
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13px] font-semibold text-v2-ink"
          >
            <ImagePlus className="h-4 w-4 text-v2-lake" aria-hidden="true" />
            從相簿選擇
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleSelect} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleSelect} className="hidden" />
    </div>
  )
}
