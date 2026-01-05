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

// 12 種顏色
export const AVATAR_COLORS = [
  { id: "red", bg: "bg-red-500", hex: "#ef4444" },
  { id: "orange", bg: "bg-orange-500", hex: "#f97316" },
  { id: "amber", bg: "bg-amber-500", hex: "#f59e0b" },
  { id: "yellow", bg: "bg-yellow-500", hex: "#eab308" },
  { id: "lime", bg: "bg-lime-500", hex: "#84cc16" },
  { id: "green", bg: "bg-green-500", hex: "#22c55e" },
  { id: "teal", bg: "bg-brand-500", hex: "#5eb4b0" },
  { id: "cyan", bg: "bg-cyan-500", hex: "#06b6d4" },
  { id: "blue", bg: "bg-blue-500", hex: "#3b82f6" },
  { id: "indigo", bg: "bg-indigo-500", hex: "#6366f1" },
  { id: "purple", bg: "bg-purple-500", hex: "#a855f7" },
  { id: "pink", bg: "bg-pink-500", hex: "#ec4899" },
]

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

// 取得顏色
export function getAvatarColor(colorId: string): string {
  return AVATAR_COLORS.find((c) => c.id === colorId)?.hex || "#6366f1"
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
  currentColor = "indigo",
  onSelect,
  loading = false,
}: AvatarPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)
  const [selectedColor, setSelectedColor] = useState(currentColor)

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
