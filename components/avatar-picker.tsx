"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  User,
  Cat,
  Dog,
  Bird,
  Fish,
  Rabbit,
  Star,
  Heart,
  Smile,
  Sun,
  Moon,
  Cloud,
  Flower2,
  TreePine,
  Mountain,
  Anchor,
  type LucideIcon,
} from "lucide-react"

// 16 種預設圖案
export const AVATAR_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "user", icon: User, label: "人物" },
  { id: "cat", icon: Cat, label: "貓咪" },
  { id: "dog", icon: Dog, label: "狗狗" },
  { id: "bird", icon: Bird, label: "小鳥" },
  { id: "fish", icon: Fish, label: "魚" },
  { id: "rabbit", icon: Rabbit, label: "兔子" },
  { id: "star", icon: Star, label: "星星" },
  { id: "heart", icon: Heart, label: "愛心" },
  { id: "smile", icon: Smile, label: "笑臉" },
  { id: "sun", icon: Sun, label: "太陽" },
  { id: "moon", icon: Moon, label: "月亮" },
  { id: "cloud", icon: Cloud, label: "雲朵" },
  { id: "flower", icon: Flower2, label: "花朵" },
  { id: "tree", icon: TreePine, label: "樹木" },
  { id: "mountain", icon: Mountain, label: "山峰" },
  { id: "anchor", icon: Anchor, label: "船錨" },
]

// 12 種顏色 — v2 palette (names describe the actual tone)
export const AVATAR_COLORS = [
  { id: "lake", bg: "bg-[#1B5847]", hex: "#1B5847" },
  { id: "lake-mid", bg: "bg-[#2F8F74]", hex: "#2F8F74" },
  { id: "coral", bg: "bg-[#E8825A]", hex: "#E8825A" },
  { id: "coral-strong", bg: "bg-[#C4602F]", hex: "#C4602F" },
  { id: "gold", bg: "bg-[#9C7A28]", hex: "#9C7A28" },
  { id: "olive", bg: "bg-[#6B7A3A]", hex: "#6B7A3A" },
  { id: "plum", bg: "bg-[#6B5B95]", hex: "#6B5B95" },
  { id: "rose", bg: "bg-[#A14A68]", hex: "#A14A68" },
  { id: "sky", bg: "bg-[#4A6FA5]", hex: "#4A6FA5" },
  { id: "danger", bg: "bg-[#C4472F]", hex: "#C4472F" },
  { id: "ink", bg: "bg-[#2A241F]", hex: "#2A241F" },
  { id: "muted", bg: "bg-[#6E6860]", hex: "#6E6860" },
]

// Old Tailwind ids still resolve (stored avatars are `avatar:icon:<oldId>`).
const LEGACY_AVATAR_COLOR: Record<string, { id: string; hex: string }> = {
  red: { id: "coral-strong", hex: "#C4602F" },
  orange: { id: "coral", hex: "#E8825A" },
  amber: { id: "gold", hex: "#9C7A28" },
  yellow: { id: "gold", hex: "#9C7A28" },
  lime: { id: "olive", hex: "#6B7A3A" },
  green: { id: "lake-mid", hex: "#2F8F74" },
  teal: { id: "lake", hex: "#1B5847" },
  cyan: { id: "sky", hex: "#4A6FA5" },
  blue: { id: "sky", hex: "#4A6FA5" },
  indigo: { id: "plum", hex: "#6B5B95" },
  purple: { id: "plum", hex: "#6B5B95" },
  pink: { id: "rose", hex: "#A14A68" },
}

// 解析頭像字串 (格式: avatar:icon:color)
export function parseAvatarString(avatarString: string | null | undefined): {
  iconId: string
  colorId: string
} | null {
  if (!avatarString?.startsWith("avatar:")) return null
  const parts = avatarString.split(":")
  if (parts.length !== 3) return null
  return { iconId: parts[1], colorId: parts[2] }
}

// 生成頭像字串
export function generateAvatarString(iconId: string, colorId: string): string {
  return `avatar:${iconId}:${colorId}`
}

// 取得圖案元件
export function getAvatarIcon(iconId: string): LucideIcon {
  return AVATAR_ICONS.find((i) => i.id === iconId)?.icon || User
}

// 渲染頭像圖案的穩定元件
export function AvatarIcon({ iconId, className }: { iconId: string; className?: string }) {
  const iconData = AVATAR_ICONS.find((i) => i.id === iconId)
  const IconComponent = iconData?.icon || User
  return <IconComponent className={className} />
}

// 取得顏色（新 id 優先，舊 Tailwind id 由 alias 對應）
export function getAvatarColor(colorId: string): string {
  return (
    AVATAR_COLORS.find((c) => c.id === colorId)?.hex ||
    LEGACY_AVATAR_COLOR[colorId]?.hex ||
    AVATAR_COLORS[0].hex
  )
}

// 舊 id → 新 id（picker 的選中狀態需要）
export function normalizeAvatarColorId(colorId: string): string {
  if (AVATAR_COLORS.some((c) => c.id === colorId)) return colorId
  return LEGACY_AVATAR_COLOR[colorId]?.id || AVATAR_COLORS[0].id
}

interface AvatarPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentIcon?: string
  currentColor?: string
  onSelect: (iconId: string, colorId: string) => void
  loading?: boolean
}

export function AvatarPicker({
  open,
  onOpenChange,
  currentIcon = "user",
  currentColor = "lake",
  onSelect,
  loading = false,
}: AvatarPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)
  const [selectedColor, setSelectedColor] = useState(normalizeAvatarColorId(currentColor))

  const selectedColorHex = getAvatarColor(selectedColor)
  const selectedIconData = AVATAR_ICONS.find((i) => i.id === selectedIcon)

  function handleSave() {
    onSelect(selectedIcon, selectedColor)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>選擇頭像</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 預覽 */}
          <div className="flex justify-center">
            <div
              className="size-24 rounded-full flex items-center justify-center"
              style={{ backgroundColor: selectedColorHex }}
            >
              {selectedIconData && <selectedIconData.icon className="size-12 text-white" />}
            </div>
          </div>

          {/* 圖案選擇 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">選擇圖案</p>
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_ICONS.map((item) => {
                const Icon = item.icon
                const isSelected = selectedIcon === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIcon(item.id)}
                    className={`size-9 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    title={item.label}
                  >
                    <Icon className="size-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* 顏色選擇 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">選擇顏色</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_COLORS.map((color) => {
                const isSelected = selectedColor === color.id
                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`size-9 rounded-full transition-all ${color.bg} ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-primary"
                        : "hover:scale-110"
                    }`}
                  />
                )
              })}
            </div>
          </div>

          {/* 確認按鈕 */}
          <Button onClick={handleSave} className="w-full" disabled={loading}>
            {loading ? "儲存中..." : "確認"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 頭像顯示元件
interface AvatarDisplayProps {
  avatarString: string | null | undefined
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AvatarDisplay({
  avatarString,
  size = "md",
  className = "",
}: AvatarDisplayProps) {
  const parsed = parseAvatarString(avatarString)

  if (!parsed) {
    // 如果不是自訂頭像格式，返回 null 讓外部處理
    return null
  }

  const iconData = AVATAR_ICONS.find((i) => i.id === parsed.iconId)
  const colorHex = getAvatarColor(parsed.colorId)

  if (!iconData) {
    return null
  }

  const sizeClasses = {
    sm: "size-10",
    md: "size-12",
    lg: "size-24",
  }

  const iconSizes = {
    sm: "size-5",
    md: "size-6",
    lg: "size-12",
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: colorHex }}
    >
      <iconData.icon className={`${iconSizes[size]} text-white`} />
    </div>
  )
}
