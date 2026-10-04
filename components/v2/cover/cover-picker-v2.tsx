"use client"

import { COVER_ICONS, COVER_PICKER_COLORS, DEFAULT_ICON_COVER, buildIconCover, parseCover } from "@/lib/covers"
import { COVER_ICON_COMPONENTS } from "./cover-icons"

export function CoverPickerV2({ value, onChange, disabled }: { value: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const parsed = parseCover(value)
  const currentIcon = parsed.type === "icon" ? parsed.iconId! : "leaf"
  const currentColor = parsed.type === "icon" ? parsed.colorId! : "lake"
  const isCustom = parsed.type === "custom"

  const handleIconClick = (iconId: string) => onChange(buildIconCover(iconId, currentColor))
  const handleColorClick = (colorId: string) => onChange(buildIconCover(currentIcon, colorId))

  const rows = [COVER_ICONS.slice(0, 7), COVER_ICONS.slice(7)]

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-v2-ink-muted">圖示</p>
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-between">
              {row.map((icon) => {
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
              })}
              {rowIndex === rows.length - 1 && (
                <button
                  type="button"
                  disabled
                  title="即將推出"
                  aria-label="更多圖示"
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-v2-line bg-v2-sand text-v2-ink-muted disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <circle cx="6" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="18" cy="12" r="1.6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-v2-ink-muted">顏色</p>
        <div className="flex justify-between">
          {COVER_PICKER_COLORS.map((color) => {
            const selected = currentColor === color.id
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
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]"
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
