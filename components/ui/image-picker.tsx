"use client"

import { useState, useRef } from "react"
import { Camera, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const hasImage = value.preview || value.image

  // 選擇圖片
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 開啟相機
  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      setCameraStream(stream)
      setShowCamera(true)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (error) {
      console.error("無法開啟相機:", error)
      alert("無法開啟相機，請確認已授權相機權限")
    }
  }

  // 關閉相機
  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  // 拍照
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })

        if (value.preview) {
          URL.revokeObjectURL(value.preview)
        }

        const previewUrl = URL.createObjectURL(file)
        onChange({
          image: null,
          pendingFile: file,
          preview: previewUrl,
        })

        closeCamera()
      },
      "image/jpeg",
      0.9
    )
  }

  return (
    <div className={className}>
      {/* 拍照專用 input - 使用 capture 屬性直接開啟相機（iOS LIFF 兼容） */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        className="hidden"
        disabled={disabled}
      />
      {/* 選擇圖片專用 input */}
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

      {/* 相機對話框 */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>拍攝照片</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="p-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeCamera}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              className="flex-1 bg-primary"
            >
              <Camera className="h-4 w-4 mr-2" />
              拍照
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 選擇圖片
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("請選擇圖片檔案")
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`圖片大小不能超過 ${maxSizeMB}MB`)
      return
    }

    await onFileSelect(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 開啟相機
  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      setCameraStream(stream)
      setShowCameraDialog(true)

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (error) {
      console.error("無法開啟相機:", error)
      alert("無法開啟相機，請確認已授權相機權限")
    }
  }

  // 關閉相機
  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCameraDialog(false)
  }

  // 拍照
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      async (blob) => {
        if (!blob) return

        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })

        closeCamera()
        await onFileSelect(file)
      },
      "image/jpeg",
      0.9
    )
  }

  return (
    <div className={className}>
      {/* 拍照專用 input - 使用 capture 屬性直接開啟相機（iOS LIFF 兼容） */}
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

      {/* 相機對話框 */}
      {showCamera && (
        <Dialog open={showCameraDialog} onOpenChange={(open) => !open && closeCamera()}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle>拍攝照片</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeCamera}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={capturePhoto}
                className="flex-1 bg-primary"
              >
                <Camera className="h-4 w-4 mr-2" />
                拍照
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
