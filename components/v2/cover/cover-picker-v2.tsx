"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown } from "lucide-react"
import { CLASSIC_COVERS, COVER_ICONS, COVER_PICKER_COLORS, DEFAULT_ICON_COVER, buildIconCover, parseCover } from "@/lib/covers"
import { COVER_ICON_COMPONENTS } from "./cover-icons"

function rowsOf<T>(items: readonly T[], size = 7): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))
}

export function CoverPickerV2({ value, onChange, disabled }: { value: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const [showAllIcons, setShowAllIcons] = useState(false)
  const [showClassic, setShowClassic] = useState(false)
  const parsed = parseCover(value)
  const currentIcon = parsed.type === "icon" ? parsed.iconId! : "leaf"
  const currentColor = parsed.type === "icon" ? parsed.colorId! : "lake"
  const isCustom = parsed.type === "custom"
  const selectedPreset = parsed.type === "preset" ? CLASSIC_COVERS.find((cover) => cover.id === parsed.presetId) : undefined

  const handleIconClick = (iconId: string) => onChange(buildIconCover(iconId, currentColor))
  const handleColorClick = (colorId: string) => onChange(buildIconCover(currentIcon, colorId))
  const handlePresetClick = (presetId: string) => onChange(`preset:${presetId}`)

  const rows = rowsOf(COVER_ICONS.slice(0, 13))
  const moreRows = rowsOf(COVER_ICONS.slice(13))
  const renderIcon = (icon: (typeof COVER_ICONS)[number]) => {
    const Icon = COVER_ICON_COMPONENTS[icon.id] ?? COVER_ICON_COMPONENTS.leaf
    const selected = parsed.type === "icon" && parsed.iconId === icon.id
    return (
      <button
        key={icon.id}
        type="button"
        onClick={() => handleIconClick(icon.id)}
        disabled={disabled}
        aria-label={icon.label}
        aria-pressed={selected}
        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-50 ${
          selected ? "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft text-v2-lake" : "border-v2-line bg-v2-surface text-v2-ink-muted"
        }`}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-v2-ink-muted">圖示</p>
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-between">
              {row.map(renderIcon)}
              {rowIndex === rows.length - 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllIcons((open) => !open)}
                  disabled={disabled}
                  aria-label="更多圖示"
                  aria-expanded={showAllIcons}
                  aria-controls="cover-more-icons"
                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-50 ${
                    showAllIcons ? "border-v2-lake-mid bg-v2-lake-soft text-v2-lake" : "border-v2-line bg-v2-sand text-v2-ink-muted"
                  }`}
                >
                  {showAllIcons ? (
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                      <path d="M6 15l6-6 6 6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                      <circle cx="6" cy="12" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="18" cy="12" r="1.6" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
          {showAllIcons && (
            <div id="cover-more-icons" className="space-y-2">
              {moreRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-between">
                  {row.map(renderIcon)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-v2-ink-muted">顏色</p>
        <div className="space-y-2">
          {rowsOf(COVER_PICKER_COLORS, 7).map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-between">
              {row.map((color) => {
                const selected = parsed.type === "icon" && currentColor === color.id
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorClick(color.id)}
                    disabled={disabled}
                    aria-label={`顏色 ${color.id}`}
                    aria-pressed={selected}
                    data-cover-art=""
                    data-cover-color-tile=""
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-v2-md"
                    style={
                      {
                        "--cover-bg": color.fg,
                        "--cover-bg-dark": color.darkFg,
                        "--cover-fg": "var(--v2-surface)",
                        "--cover-fg-dark": "var(--v2-surface)",
                        boxShadow: selected ? `0 0 0 2px var(--v2-surface), 0 0 0 3.5px ${color.fg}` : undefined,
                      } as React.CSSProperties
                    }
                  >
                    {selected && (
                      <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 12l5 5L20 6" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowClassic((open) => !open)}
          disabled={disabled}
          aria-expanded={showClassic}
          aria-controls="classic-covers"
          aria-label={showClassic ? "收起經典封面" : "展開經典封面"}
          className="mb-2 flex w-full items-center justify-between text-left disabled:opacity-50"
        >
          <span className="text-xs font-semibold text-v2-ink-muted">經典封面</span>
          <span className="flex items-center gap-1 text-[11px] text-v2-ink-subtle">
            {selectedPreset?.name ?? "9 個主題"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showClassic ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>
        {showClassic && (
          <div id="classic-covers" className="grid grid-cols-3 gap-2">
            {CLASSIC_COVERS.map((preset) => {
              const selected = parsed.type === "preset" && parsed.presetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.id)}
                  disabled={disabled}
                  aria-label={`經典封面 ${preset.name}`}
                  aria-pressed={selected}
                  className="group flex flex-col items-center gap-1 disabled:opacity-50"
                >
                  <span
                    className="flex h-14 w-full items-center justify-center overflow-hidden rounded-v2-md border border-v2-line"
                    style={{
                      background: preset.gradient,
                      boxShadow: selected ? "0 0 0 2px var(--v2-surface), 0 0 0 3.5px var(--v2-lake)" : undefined,
                    }}
                  >
                    {preset.emoji === "logo" ? (
                      <Image src="/icons/logo.svg" alt="" width={24} height={24} className="h-6 w-6 rounded" />
                    ) : (
                      <span className="text-xl leading-none" aria-hidden="true">
                        {preset.emoji}
                      </span>
                    )}
                  </span>
                  <span className={`text-[10px] font-medium ${selected ? "text-v2-lake" : "text-v2-ink-muted"}`}>{preset.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isCustom && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ICON_COVER)}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg border border-v2-line px-3 py-2 text-sm text-v2-ink transition-colors hover:bg-v2-surface disabled:opacity-50"
        >
          移除自訂圖片
        </button>
      )}
    </div>
  )
}
