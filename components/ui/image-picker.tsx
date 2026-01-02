"use client"

import { useRef } from "react"
import { Camera, ImagePlus, X } from "lucide-react"

export interface ImagePickerValue {
  image: string | null // 已上傳的 URL
  pendingFile: File | null // 待上傳的檔案
  preview: string | null // 本地預覽 URL
}

interface ImagePickerProps {
  value: ImagePickerValue
  onChange: (value: ImagePickerValue) => void
  onRemove?: () => Promise<void> | void // 移除圖片時的額外處理（如刪除 R2）
  disabled?: boolean
  maxSizeMB?: number
  className?: string
}

// 簡化版：只顯示已上傳的圖片，選擇後立即回調
interface SimpleImagePickerProps {
  image: string | null
  onFileSelect: (file: File) => void | Promise<void>
  onRemove?: () => void
  uploading?: boolean
  disabled?: boolean
  maxSizeMB?: number
  showCamera?: boolean
  className?: string
}

export function ImagePicker({
  value,
  onChange,
  onRemove,
  disabled = false,
  maxSizeMB = 10,
  className,
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const hasImage = value.preview || value.image

  // 處理圖片選擇（拍照或相簿都用這個）
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // iOS HEIC 格式的 MIME type 可能是 image/heic 或 image/heif
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
      alert("請選擇圖片檔案")
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`圖片大小不能超過 ${maxSizeMB}MB`)
      return
    }

    // 釋放舊的預覽 URL
    if (value.preview) {
      URL.revokeObjectURL(value.preview)
    }

    const previewUrl = URL.createObjectURL(file)
    onChange({
      image: null,
      pendingFile: file,
      preview: previewUrl,
    })

    // 重置 input 以便可以再次選擇相同檔案
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  // 移除圖片
  async function handleRemoveImage() {
    if (onRemove) {
      await onRemove()
    }

    if (value.preview) {
      URL.revokeObjectURL(value.preview)
    }

    onChange({
      image: null,
      pendingFile: null,
      preview: null,
    })

    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <div className={className}>
      {/* 拍照專用 input - 使用 capture 屬性直接開啟相機 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* 選擇圖片專用 input - 不使用 capture，讓用戶可以選擇相簿 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={disabled}
      />

      {hasImage ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.preview || value.image || ""}
            alt="圖片預覽"
            className="w-full h-auto max-h-48 object-contain bg-slate-50 dark:bg-slate-900"
          />
          {value.pendingFile && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500 text-white text-xs font-medium">
              待上傳
            </div>
          )}
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-50 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="flex-1 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Camera className="h-5 w-5" />
            <span className="text-sm">拍照</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-1 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-sm">選擇圖片</span>
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * 簡化版圖片選擇器
 * - 選擇後立即回調 onFileSelect
 * - 不處理本地預覽狀態
 * - 適合需要立即上傳的場景
 */
export function SimpleImagePicker({
  image,
  onFileSelect,
  onRemove,
  uploading = false,
  disabled = false,
  maxSizeMB = 10,
  showCamera = true,
  className,
}: SimpleImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // 處理圖片選擇
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // iOS HEIC 格式支援
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
      alert("請選擇圖片檔案")
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`圖片大小不能超過 ${maxSizeMB}MB`)
      return
    }

    await onFileSelect(file)

    // 重置 input
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <div className={className}>
      {/* 拍照專用 input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* 選擇圖片專用 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {image ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="圖片"
            className="w-full h-20 object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || uploading}
            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-50 flex items-center justify-center text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {showCamera && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || uploading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span>{uploading ? "處理中..." : "拍照"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading && !showCamera ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <span>{uploading && !showCamera ? "處理中..." : "上傳"}</span>
          </button>
        </div>
      )}
    </div>
  )
}
