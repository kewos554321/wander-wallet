import Image from "next/image"
import { COVER_COLORS, getPresetCover, parseCover } from "@/lib/covers"
import { COVER_ICON_COMPONENTS } from "./cover-icons"

export function CoverArt({
  cover,
  className = "h-16 w-16 rounded-xl",
  iconClassName = "h-[26px] w-[26px]",
  variant = "default",
}: {
  cover: string | null
  className?: string
  iconClassName?: string
  variant?: "default" | "solid"
}) {
  const parsed = parseCover(cover)
  const box = `relative flex shrink-0 items-center justify-center overflow-hidden ${className}`

  if (parsed.type === "custom" && parsed.customUrl) {
    return (
      <div data-testid="cover-art" data-cover="custom" className={box}>
        <Image src={parsed.customUrl} alt="Custom cover" fill className="object-cover" unoptimized />
      </div>
    )
  }
  if (parsed.type === "preset") {
    const preset = getPresetCover(parsed.presetId!)
    if (preset) {
      return (
        <div data-testid="cover-art" data-cover={`preset:${preset.id}`} className={`${box} text-2xl`} style={{ background: preset.gradient }}>
          <span aria-hidden="true">{preset.emoji}</span>
        </div>
      )
    }
  }
  const iconId = parsed.type === "icon" ? parsed.iconId! : "leaf"
  const color = COVER_COLORS.find((c) => c.id === (parsed.type === "icon" ? parsed.colorId : "lake")) ?? COVER_COLORS[0]
  const Icon = COVER_ICON_COMPONENTS[iconId] ?? COVER_ICON_COMPONENTS.leaf
  const solid = variant === "solid"
  return (
    <div
      data-testid="cover-art"
      data-cover={`icon:${iconId}`}
      data-cover-art=""
      {...(solid ? { "data-cover-art-solid": "" } : {})}
      className={box}
      style={
        {
          "--cover-fg": solid ? "var(--v2-on-lake)" : color.fg,
          "--cover-bg": solid ? color.fg : color.bg,
          "--cover-fg-dark": solid ? "var(--v2-on-lake)" : color.darkFg,
          "--cover-bg-dark": solid ? color.darkFg : color.darkBg,
        } as React.CSSProperties
      }
    >
      <Icon className={iconClassName} strokeWidth={1.5} aria-hidden="true" />
    </div>
  )
}
