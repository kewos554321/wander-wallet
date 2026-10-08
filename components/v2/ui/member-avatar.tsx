import { User } from "lucide-react"
import { V2Avatar } from "./v2-avatar"

// One member avatar for every surface in the expense form. A placeholder member
// (no linked account — 成員頁面的「佔位成員」) shows the same neutral badge as
// components/v2/members/members-v2-view.tsx; everyone else shows their photo or
// initial. Callers size the circle via `className` (include `rounded-full`).
export function MemberAvatar({
  image,
  name,
  placeholder = false,
  className = "",
  fallbackClassName = "",
  iconClassName = "h-[9px] w-[9px]",
}: {
  image: string | null
  name: string | null
  placeholder?: boolean
  className?: string
  fallbackClassName?: string
  iconClassName?: string
}) {
  if (placeholder) {
    return (
      <span
        aria-hidden="true"
        data-testid="placeholder-avatar"
        className={`flex shrink-0 items-center justify-center bg-v2-sand text-v2-ink-subtle ${className}`}
      >
        <User className={iconClassName} strokeWidth={1.7} />
      </span>
    )
  }
  return <V2Avatar image={image} name={name} className={className} fallbackClassName={fallbackClassName} />
}
