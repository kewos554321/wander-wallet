"use client"

import { useRef } from "react"
import { Camera, Images, X } from "lucide-react"
import { useCamera } from "./use-camera"

export function CameraStep({ onImage, onManual, onClose }: { onImage: (file: File) => void; onManual: () => void; onClose: () => void }) {
  const { videoRef, mode, capture } = useCamera()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) onImage(file)
  }
  const shoot = async () => {
    const file = await capture()
    if (file) onImage(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#10201B] text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="m-0 text-base font-semibold">拍照記帳</p>
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${mode === "live" ? "" : "hidden"}`} />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-dashed border-white/70" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-6 text-center">
          <p className="m-0 text-sm font-semibold">將發票或收據置於框內</p>
          <p className="m-0 mt-1 text-xs text-white/70">AI 會自動辨識金額與商家</p>
        </div>
      </div>

      <input ref={cameraInput} data-testid="camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryInput} data-testid="gallery-input" type="file" accept="image/*" className="hidden" onChange={pick} />

      <div className="flex items-center justify-center gap-6 px-4 py-6">
        {mode === "fallback" ? (
          <>
            <button type="button" onClick={() => cameraInput.current?.click()} className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#10201B]">
              <Camera className="h-4 w-4" aria-hidden="true" />
              開啟相機
            </button>
            <button type="button" onClick={() => galleryInput.current?.click()} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-bold">
              <Images className="h-4 w-4" aria-hidden="true" />
              從相簿選擇
            </button>
          </>
        ) : (
          <>
            <button type="button" aria-label="從相簿選擇" onClick={() => galleryInput.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Images className="h-5 w-5" />
            </button>
            <button type="button" aria-label="拍照" disabled={mode !== "live"} onClick={shoot} className="h-16 w-16 rounded-full border-4 border-white bg-white/30 disabled:opacity-40" />
            <span className="h-11 w-11" aria-hidden="true" />
          </>
        )}
      </div>

      <button type="button" onClick={onManual} className="mb-6 self-center text-sm font-semibold text-white/80 underline">
        改用手動輸入
      </button>
    </div>
  )
}
