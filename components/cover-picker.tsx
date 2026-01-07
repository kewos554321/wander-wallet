"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { ImagePlus, Check, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PRESET_COVERS, parseCover, getPresetCover, createCoverString } from "@/lib/covers"
import { cn } from "@/lib/utils"

interface CoverPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function CoverPicker({ value, onChange, disabled }: CoverPickerProps) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = parseCover(value)
  const presetCover = parsed.type === "preset" ? getPresetCover(parsed.presetId!) : null

  const handlePresetSelect = (presetId: string) => {
    onChange(createCoverString("preset", presetId))
    setOpen(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案類型
    if (!file.type.startsWith("image/")) {
      alert("請選擇圖片檔案")
      return
    }

    // 限制檔案大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("圖片大小不能超過 2MB")
      return
    }

    setUploading(true)

    try {
      // 壓縮並轉換為 base64
      const compressedBase64 = await compressImage(file, 800, 400, 0.8)
      onChange(compressedBase64)
      setOpen(false)
    } catch (error) {
      console.error("圖片處理失敗:", error)
      alert("圖片處理失敗，請重試")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    onChange(null)
  }

  // 渲染封面預覽
  const renderCoverPreview = () => {
    if (parsed.type === "none") {
      return (
        <div className="w-full h-24 rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center gap-2 text-slate-400">
          <ImagePlus className="h-5 w-5" />
          <span className="text-sm">新增封面</span>
        </div>
      )
    }

    if (parsed.type === "preset" && presetCover) {
      return (
        <div
          className="w-full h-24 rounded-lg flex items-center justify-center relative overflow-hidden"
          style={{ background: presetCover.gradient }}
        >
          {presetCover.emoji === "logo" ? (
            <Image src="/icons/logo.svg" alt="Logo" width={40} height={40} className="rounded-lg" />
          ) : (
            <span className="text-4xl">{presetCover.emoji}</span>
          )}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                handleRemove()
              }
            }}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </div>
        </div>
      )
    }

    if (parsed.type === "custom" && parsed.customUrl) {
      return (
        <div className="w-full h-24 rounded-lg relative overflow-hidden">
          <Image
            src={parsed.customUrl}
            alt="封面"
            fill
            className="object-cover"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                handleRemove()
              }
            }}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          {renderCoverPreview()}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>選擇封面</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 預設封面 */}
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">預設主題</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COVERS.map((cover) => {
                const isSelected = parsed.type === "preset" && parsed.presetId === cover.id
                return (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => handlePresetSelect(cover.id)}
                    className={cn(
                      "relative h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ background: cover.gradient }}
                  >
                    {cover.emoji === "logo" ? (
                      <Image src="/icons/logo.svg" alt="Logo" width={24} height={24} className="rounded" />
                    ) : (
                      <span className="text-xl">{cover.emoji}</span>
                    )}
                    <span className="text-[10px] text-white/90 font-medium">{cover.name}</span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 自訂上傳 */}
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">自訂圖片</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "處理中..." : "上傳圖片"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">支援 JPG、PNG，最大 2MB</p>
          </div>

          {/* 移除封面 */}
          {parsed.type !== "none" && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                handleRemove()
                setOpen(false)
              }}
            >
              移除封面
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 壓縮圖片並轉為 base64
async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement("img")
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let { width, height } = img

        // 計算縮放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("無法取得 canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL("image/jpeg", quality)
        resolve(base64)
      }
      img.onerror = () => reject(new Error("圖片載入失敗"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("檔案讀取失敗"))
    reader.readAsDataURL(file)
  })
}
