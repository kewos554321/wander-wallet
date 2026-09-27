import Image from "next/image"
import { Leaf } from "lucide-react"
import { parseCover, getPresetCover } from "@/lib/covers"

// Icon/color ids are written from milestone 4; until then any icon cover
// renders the default leaf on the lake gradient.
export function CoverThumb({ cover }: { cover: string | null }) {
  const parsed = parseCover(cover)
  const box = "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"

  if (parsed.type === "custom" && parsed.customUrl) {
    return (
      <div className={box}>
        <Image src={parsed.customUrl} alt="" fill className="object-cover" />
      </div>
    )
  }

  if (parsed.type === "preset") {
    const preset = getPresetCover(parsed.presetId!)
    if (preset) {
      return (
        <div className={`${box} flex items-center justify-center text-2xl`} style={{ background: preset.gradient }}>
          <span aria-hidden="true">{preset.emoji}</span>
        </div>
      )
    }
  }

  return (
    <div className={`${box} flex items-center justify-center bg-gradient-to-br from-v2-lake-soft to-[#CFE8DC]`}>
      <Leaf className="h-[26px] w-[26px] text-v2-lake" strokeWidth={1.5} />
    </div>
  )
}
