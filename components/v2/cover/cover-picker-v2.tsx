"use client"

import { useRef, useState } from "react"
import { X } from "lucide-react"
import { compressImage } from "@/lib/image-utils"
import { COVER_COLORS, COVER_ICONS, DEFAULT_ICON_COVER, buildIconCover, parseCover } from "@/lib/covers"
import { CoverArt } from "./cover-art"

export function CoverPickerV2({ value, onChange, disabled }: { value: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(false)

  const parsed = parseCover(value)
  const currentIcon = parsed.type === "icon" ? parsed.iconId! : "leaf"
  const currentColor = parsed.type === "icon" ? parsed.colorId! : "lake"

  const handleIconClick = (iconId: string) => {
    onChange(buildIconCover(iconId, currentColor))
  }

  const handleColorClick = (colorId: string) => {
    onChange(buildIconCover(currentIcon, colorId))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(false)

    try {
      const base64 = await compressImage(file, 1200, 800, 0.8)
      onChange(base64)
    } catch {
      setUploadError(true)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveCustom = () => {
    onChange(DEFAULT_ICON_COVER)
  }

  const isCustom = parsed.type === "custom"

  return (
    <div className="space-y-6">
      {/* Icon picker section */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-v2-ink">封面圖示</div>
        <div className="grid grid-cols-7 gap-2">
          {COVER_ICONS.map((icon) => (
            <button
              key={icon.id}
              type="button"
              onClick={() => handleIconClick(icon.id)}
              disabled={disabled}
              aria-label={icon.label}
              aria-pressed={parsed.type === "icon" && parsed.iconId === icon.id}
              className={`rounded-xl transition-all disabled:opacity-50 ${parsed.type === "icon" && parsed.iconId === icon.id ? "ring-2 ring-v2-lake" : ""}`}
            >
              <CoverArt cover={buildIconCover(icon.id, currentColor)} className="h-11 w-11 rounded-xl" />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker section */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-v2-ink">封面顏色</div>
        <div className="flex gap-3">
          {COVER_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => handleColorClick(color.id)}
              disabled={disabled}
              aria-label={`顏色 ${color.id}`}
              aria-pressed={currentColor === color.id}
              className={`h-7 w-7 rounded-full transition-all disabled:opacity-50 ${currentColor === color.id ? "ring-2 ring-v2-lake ring-offset-2" : ""}`}
              style={{ backgroundColor: color.fg }}
            />
          ))}
        </div>
      </div>

      {/* Custom image upload section */}
      <div className="space-y-3">
        {isCustom ? (
          <>
            <div className="flex items-center gap-3">
              <CoverArt cover={value} className="h-11 w-16 rounded-lg" />
              <button
                type="button"
                onClick={handleRemoveCustom}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-lg border border-v2-line px-3 py-2 text-sm text-v2-ink transition-colors hover:bg-v2-surface disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                移除自訂圖片
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="w-full rounded-lg border-2 border-dashed border-v2-line bg-v2-surface px-4 py-3 text-sm text-v2-ink transition-colors hover:border-v2-ink-muted disabled:opacity-50"
            >
              {uploading ? "上傳中…" : "或上傳自訂圖片"}
            </button>
            {uploadError && <div className="text-sm text-v2-danger">圖片上傳失敗</div>}
          </>
        )}
      </div>
    </div>
  )
}
