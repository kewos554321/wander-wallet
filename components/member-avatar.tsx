"use client"

import Image from "next/image"
import { User } from "lucide-react"
import { parseAvatarString, AvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { cn } from "@/lib/utils"

interface MemberAvatarProps {
  image: string | null | undefined
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
  /** 是否使用選中狀態的樣式 */
  selected?: boolean
}

const sizeMap = {
  sm: { container: "h-5 w-5", icon: "h-2.5 w-2.5" },
  md: { container: "h-8 w-8", icon: "h-4 w-4" },
  lg: { container: "h-10 w-10", icon: "h-5 w-5" },
}

const imageSizeMap = {
  sm: 20,
  md: 32,
  lg: 40,
}

export function MemberAvatar({
  image,
  name,
  size = "md",
  className,
  selected = false,
}: MemberAvatarProps) {
  const avatarData = parseAvatarString(image)
  const hasExternalImage = image && !image.startsWith("avatar:")
  const { container, icon } = sizeMap[size]
  const imageSize = imageSizeMap[size]

  // 自訂 avatar (avatar:icon-color 格式)
  if (avatarData) {
    const bgColor = selected ? "rgba(255,255,255,0.3)" : getAvatarColor(avatarData.colorId)

    return (
      <div
        className={cn(container, "rounded-full flex items-center justify-center", className)}
        style={{ backgroundColor: bgColor }}
      >
        <AvatarIcon iconId={avatarData.iconId} className={cn(icon, "text-white")} />
      </div>
    )
  }

  // 外部圖片 (Google OAuth 等)
  if (hasExternalImage) {
    return (
      <div
        className={cn(
          container,
          "rounded-full flex items-center justify-center overflow-hidden",
          selected ? "bg-white/30" : "bg-slate-100 dark:bg-slate-800",
          className
        )}
      >
        <Image
          src={image!}
          alt={name}
          width={imageSize}
          height={imageSize}
          className="rounded-full object-cover"
        />
      </div>
    )
  }

  // 預設 fallback (User icon)
  return (
    <div
      className={cn(
        container,
        "rounded-full flex items-center justify-center",
        selected ? "bg-white/30" : "bg-slate-100 dark:bg-slate-800",
        className
      )}
    >
      <User className={cn(icon, selected ? "text-white" : "text-slate-500")} />
    </div>
  )
}
