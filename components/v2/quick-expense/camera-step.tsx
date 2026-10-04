"use client"

import { useRef } from "react"
import { Camera, Images, X } from "lucide-react"
import { useCamera } from "./use-camera"

export function CameraStep({ onImage, onClose }: { onImage: (file: File) => void; onClose: () => void }) {
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
    <div className="fixed inset-0 z-50 flex flex-col bg-v2-camera-bg text-v2-on-dark">
      <div className="flex items-center justify-between px-4 py-[18px]">
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,.12)]">
          <X className="h-[17px] w-[17px]" aria-hidden="true" />
        </button>
        <p className="m-0 text-[13px] font-semibold">拍照記帳</p>
        <span aria-hidden="true" className="h-9 w-9" />
      </div>

      <div className="relative mx-6 mt-3 h-[460px]">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${mode === "live" ? "" : "hidden"}`} />
        <span aria-hidden="true" className="absolute left-0 top-0 h-[34px] w-[34px] rounded-tl-lg border-l-[3px] border-t-[3px] border-v2-coral" />
        <span aria-hidden="true" className="absolute right-0 top-0 h-[34px] w-[34px] rounded-tr-lg border-r-[3px] border-t-[3px] border-v2-coral" />
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-[34px] w-[34px] rounded-bl-lg border-b-[3px] border-l-[3px] border-v2-coral" />
        <span aria-hidden="true" className="absolute bottom-0 right-0 h-[34px] w-[34px] rounded-br-lg border-b-[3px] border-r-[3px] border-v2-coral" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[rgba(255,255,255,.6)]">
          <Camera className="mx-auto mb-2.5 h-[30px] w-[30px]" aria-hidden="true" />
          <p className="m-0 text-[13px]">將發票或收據置於框內</p>
          <p className="m-0 mt-1 text-xs">AI 會自動辨識金額與商家</p>
        </div>
      </div>

      <input ref={cameraInput} data-testid="camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryInput} data-testid="gallery-input" type="file" accept="image/*" className="hidden" onChange={pick} />

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center px-6 pb-[30px] pt-5 ${mode === "fallback" ? "justify-center gap-4" : "justify-between"}`}
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), transparent)" }}
      >
        {mode === "fallback" ? (
          <>
            <button type="button" onClick={() => cameraInput.current?.click()} className="flex h-11 items-center gap-2 rounded-full bg-v2-on-dark px-5 text-sm font-bold text-v2-camera-bg">
              <Camera className="h-4 w-4" aria-hidden="true" />
              開啟相機
            </button>
            <button type="button" onClick={() => galleryInput.current?.click()} className="flex h-11 items-center gap-2 rounded-full border border-[rgba(255,255,255,.25)] bg-[rgba(255,255,255,.14)] px-5 text-sm font-bold">
              <Images className="h-4 w-4" aria-hidden="true" />
              從相簿選擇
            </button>
          </>
        ) : (
          <>
            <button type="button" aria-label="從相簿選擇" onClick={() => galleryInput.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,.25)] bg-[rgba(255,255,255,.14)]">
              <Images className="h-[19px] w-[19px]" aria-hidden="true" />
            </button>
            <button type="button" aria-label="拍照" disabled={mode !== "live"} onClick={shoot} className="flex h-[70px] w-[70px] items-center justify-center rounded-full border-4 border-[rgba(255,255,255,.35)] bg-v2-on-dark disabled:opacity-40">
              <span className="h-14 w-14 rounded-full bg-v2-coral" aria-hidden="true" />
            </button>
            <span className="h-11 w-11" aria-hidden="true" />
          </>
        )}
      </div>

    </div>
  )
}
