/* c8 ignore start */
"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ZoomIn, ZoomOut, Check, X } from "lucide-react"

interface ImageCropperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  aspectRatio?: number
  onCropComplete: (croppedImageUrl: string) => void
}

// 將 URL 轉換為 base64（解決 CORS 問題）
async function urlToBase64(url: string): Promise<string> {
  // 如果已經是 base64，直接返回
  if (url.startsWith("data:")) {
    return url
  }

  // 透過後端代理取得圖片避免 CORS
  const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)

  if (!response.ok) {
    throw new Error("無法取得圖片")
  }

  const data = await response.json()
  return data.dataUrl
}

// 建立圖片元素
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("圖片載入失敗"))
    image.src = url
  })
}

// 將裁切區域轉換為實際圖片
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  // 先轉換為 base64 避免 CORS 問題
  const base64Src = await urlToBase64(imageSrc)
  const image = await createImage(base64Src)

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("無法建立 2d context")
  }

  // 設置 canvas 大小為裁切區域大小
  canvas.width = Math.round(pixelCrop.width)
  canvas.height = Math.round(pixelCrop.height)

  // 繪製裁切後的圖片
  ctx.drawImage(
    image,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height)
  )

  return canvas.toDataURL("image/jpeg", 0.9)
}

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  aspectRatio = 4 / 1,
  onCropComplete,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropChange = useCallback((location: Point) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return

    setProcessing(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropComplete(croppedImage)
      onOpenChange(false)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知錯誤"
      console.error("裁切圖片失敗:", errorMessage)
      alert(`裁切圖片失敗: ${errorMessage}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // 重置狀態
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>裁切圖片</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[300px] bg-slate-900 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid
          />
        </div>

        {/* 縮放控制 */}
        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(values) => setZoom(values[0])}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={processing}>
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={processing}>
            <Check className="h-4 w-4 mr-2" />
            {processing ? "處理中..." : "確認裁切"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
/* c8 ignore stop */
