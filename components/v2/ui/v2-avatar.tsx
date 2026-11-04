const TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-coral-soft text-v2-coral-strong",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-gold-soft text-v2-gold",
]

/** Linked accounts keep one colour across projects; placeholders use their member id. */
export function avatarSeed(userId?: string | null, memberId?: string | null): string | undefined {
  return userId || memberId || undefined
}

function hashSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function isImageSource(image: string | null | undefined): image is string {
  return Boolean(image && /^(https?:\/\/|data:image\/|\/)/.test(image))
}

interface V2AvatarProps {
  image: string | null | undefined
  name: string | null | undefined
  seed?: string | null
  placeholder?: boolean
  variant?: "default" | "on-lake" | "brand"
  className?: string
  fallbackClassName?: string
}

export function V2Avatar({
  image,
  name,
  seed,
  placeholder = false,
  variant = "default",
  className = "",
  fallbackClassName = "",
}: V2AvatarProps) {
  if (isImageSource(image)) {
    return (
      <span aria-hidden="true" className={`inline-flex overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
      </span>
    )
  }

  const initial = name?.trim().charAt(0).toUpperCase() || "?"
  const tone = placeholder
    ? "bg-v2-sand text-v2-ink-muted"
    : variant === "brand"
      ? "bg-v2-lake text-v2-on-lake"
      : variant === "on-lake"
        ? "bg-v2-paper/15 text-v2-paper"
        : TONES[hashSeed(seed || name?.trim() || "?") % TONES.length]

  return (
    <span
      aria-hidden="true"
      data-testid={placeholder ? "placeholder-avatar" : undefined}
      className={`inline-flex items-center justify-center ${className} ${tone} ${fallbackClassName}`}
    >
      {initial}
    </span>
  )
}
