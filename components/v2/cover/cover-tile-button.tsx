"use client"

import { useState } from "react"
import { CoverArt } from "./cover-art"
import { CoverPickerV2 } from "./cover-picker-v2"

// A13 48px cover tile; opens a bottom sheet with the shared cover picker (D7).
export function CoverTileButton({ cover, onChange, disabled }: { cover: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" aria-label="更換封面" disabled={disabled} onClick={() => setOpen(true)} className="shrink-0 disabled:opacity-40">
        <CoverArt cover={cover} variant="solid" className="h-12 w-12 rounded-[14px]" iconClassName="h-[22px] w-[22px]" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-v2-overlay sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-v2-surface p-5 sm:rounded-2xl">
            <h2 className="m-0 mb-3 font-v2-serif text-base font-semibold">更換封面</h2>
            <CoverPickerV2 value={cover} onChange={onChange} disabled={disabled} />
            <button type="button" onClick={() => setOpen(false)} className="mt-4 w-full rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake">
              完成
            </button>
          </div>
        </div>
      )}
    </>
  )
}
