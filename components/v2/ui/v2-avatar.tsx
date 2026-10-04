import { parseAvatarString, getAvatarColor, AvatarIcon } from "@/components/avatar-picker"

interface V2AvatarProps {
  image: string | null
  name: string | null
  className?: string
  fallbackClassName?: string
  iconClassName?: string
}

export function V2Avatar({ image, name, className = "", fallbackClassName = "", iconClassName }: V2AvatarProps) {
  const parsed = parseAvatarString(image)

  if (parsed) {
    return (
      <div
        aria-hidden="true"
        className={`inline-flex items-center justify-center ${className}`}
        style={{ backgroundColor: getAvatarColor(parsed.colorId) }}
      >
        <AvatarIcon iconId={parsed.iconId} className={`text-v2-on-dark ${iconClassName ?? ""}`} />
      </div>
    )
  }

  if (image) {
    return (
      <div aria-hidden="true" className={`inline-flex overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div aria-hidden="true" className={`inline-flex items-center justify-center ${className} ${fallbackClassName}`}>
      {name?.trim().charAt(0).toUpperCase() || "?"}
    </div>
  )
}
