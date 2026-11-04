"use client"

import { useState } from "react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CoverArt } from "@/components/v2/cover/cover-art"
import { CoverPickerV2 } from "@/components/v2/cover/cover-picker-v2"
import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"

// Design preview for the cover picker: live preview + inline picker + the real
// bottom-sheet entry point. No data is written.
export default function CoverPickerDemoPage() {
  const [cover, setCover] = useState<string | null>("preset:2")

  return (
    <div className="mx-auto max-w-md pb-16">
      <V2TopBar title="更換封面" backHref="/demo" />

      <div className="space-y-4 p-4">
        <section className="rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <p className="m-0 text-xs font-semibold text-v2-ink-muted">目前封面</p>
          <div className="mt-3 flex items-center gap-3">
            <CoverArt cover={cover} variant="solid" className="h-16 w-16 rounded-v2-md" iconClassName="h-7 w-7" />
            <div className="min-w-0">
              <p className="m-0 truncate font-mono text-[12px] text-v2-ink">{cover ?? "尚未選擇"}</p>
              <p className="m-0 mt-1 text-[12px] leading-relaxed text-v2-ink-muted">
                點擊下方圖示、顏色或經典封面，預覽會立即更新。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <CoverPickerV2 value={cover} onChange={setCover} />
        </section>

        <section className="rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <p className="m-0 text-xs font-semibold text-v2-ink-muted">在底部面板中</p>
          <p className="m-0 mt-1 text-[12px] leading-relaxed text-v2-ink-muted">
            旅程表單實際使用的封面磚；點擊會開啟同一個選擇器。
          </p>
          <div className="mt-3">
            <CoverTileButton cover={cover} onChange={setCover} />
          </div>
        </section>
      </div>
    </div>
  )
}
