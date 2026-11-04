"use client"

import { useState } from "react"
import { CoverArt } from "./cover-art"
import { CoverPickerV2 } from "./cover-picker-v2"
import { Sheet } from "@/components/v2/ui/sheet"

// A13 48px cover tile; opens a bottom sheet with the shared cover picker (D7).
export function CoverTileButton({ cover, onChange, disabled }: { cover: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" aria-label="更換封面" disabled={disabled} onClick={() => setOpen(true)} className="shrink-0 disabled:opacity-40">
        <CoverArt cover={cover} variant="solid" className="h-12 w-12 rounded-v2-md" iconClassName="h-[22px] w-[22px]" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="更換封面">
        <h2 className="m-0 mb-3 font-v2-serif text-base font-semibold">更換封面</h2>
        <CoverPickerV2 value={cover} onChange={onChange} disabled={disabled} />
        <button type="button" onClick={() => setOpen(false)} className="mt-4 w-full rounded-v2-md bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake">
          完成
        </button>
      </Sheet>
    </>
  )
}
