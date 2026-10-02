// 預設封面設定
export interface PresetCover {
  id: string
  name: string
  gradient: string
  emoji: string
}

export const PRESET_COVERS: PresetCover[] = [
  {
    id: "1",
    name: "經典",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #2dd4bf 50%, #5eead4 100%)",
    emoji: "logo", // 特殊值：使用品牌 Logo
  },
  {
    id: "2",
    name: "海灘度假",
    gradient: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
    emoji: "🏖️",
  },
  {
    id: "3",
    name: "山林探險",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    emoji: "🏔️",
  },
  {
    id: "4",
    name: "城市漫遊",
    gradient: "linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)",
    emoji: "🌆",
  },
  {
    id: "5",
    name: "美食之旅",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    emoji: "🍜",
  },
  {
    id: "6",
    name: "飛行旅程",
    gradient: "linear-gradient(45deg, #00c6fb 0%, #005bea 100%)",
    emoji: "✈️",
  },
  {
    id: "7",
    name: "露營野趣",
    gradient: "linear-gradient(180deg, #d4a574 0%, #8b7355 100%)",
    emoji: "🏕️",
  },
  {
    id: "8",
    name: "購物血拼",
    gradient: "linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)",
    emoji: "🛍️",
  },
  {
    id: "9",
    name: "滑雪假期",
    gradient: "linear-gradient(180deg, #e0eafc 0%, #cfdef3 100%)",
    emoji: "🎿",
  },
  {
    id: "10",
    name: "郵輪度假",
    gradient: "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)",
    emoji: "🚢",
  },
  {
    id: "11",
    name: "商務出差",
    gradient: "linear-gradient(180deg, #485563 0%, #29323c 100%)",
    emoji: "💼",
  },
  {
    id: "12",
    name: "派對慶祝",
    gradient: "linear-gradient(45deg, #f857a6 0%, #ff5858 100%)",
    emoji: "🎉",
  },
]

export type ParsedCover = {
  type: "preset" | "custom" | "icon" | "none"
  presetId?: string
  customUrl?: string
  iconId?: string
  colorId?: string
}

export const COVER_ICONS = [
  { id: "compass", label: "指南針" },
  { id: "leaf", label: "葉子" },
  { id: "utensils", label: "餐具" },
  { id: "globe", label: "地球" },
  { id: "car", label: "汽車" },
  { id: "bed", label: "住宿" },
  { id: "star", label: "星星" },
  { id: "camera", label: "相機" },
  { id: "fork-knife", label: "美食" },
  { id: "hiking", label: "登山" },
  { id: "mountain", label: "山岳" },
  { id: "heart", label: "愛心" },
  { id: "sparkle", label: "亮點" },
] as const

export const COVER_COLORS = [
  { id: "lake", fg: "#1B5847", bg: "#EAF5F1", darkFg: "#4FB394", darkBg: "#17302A" },
  { id: "coral", fg: "#C4602F", bg: "#FBE3D2", darkFg: "#F09A76", darkBg: "#3A2519" },
  { id: "red", fg: "#C4472F", bg: "#F6DCD3", darkFg: "#E8735A", darkBg: "#3A1E18" },
  { id: "rose", fg: "#A14A68", bg: "#F5DDE6", darkFg: "#D77E9C", darkBg: "#37212A" },
  { id: "gold", fg: "#9C7A28", bg: "#F6ECCF", darkFg: "#D4AE55", darkBg: "#332A16" },
  { id: "plum", fg: "#6B5B95", bg: "#E7E2F2", darkFg: "#A897D6", darkBg: "#2A2438" },
  { id: "ink", fg: "#2A241F", bg: "#E9E5DF", darkFg: "#D9D2C7", darkBg: "#2A2622" },
] as const

// D5: red stays in COVER_COLORS for old saved covers but is hidden from the picker.
const PICKER_COLOR_IDS = ["lake", "coral", "plum", "gold", "rose", "ink"] as const
export const COVER_PICKER_COLORS = PICKER_COLOR_IDS.map((id) => COVER_COLORS.find((c) => c.id === id)!)

export const DEFAULT_ICON_COVER = "icon:leaf;color:lake"

const isIconId = (id: string) => COVER_ICONS.some((i) => i.id === id)
const isColorId = (id: string) => COVER_COLORS.some((c) => c.id === id)

export function buildIconCover(iconId: string, colorId: string): string {
  return `icon:${iconId};color:${colorId}`
}

const ICON_COVER_PATTERN = /^icon:([a-z0-9-]+);color:([a-z0-9-]+)$/

// Accepts every cover format the app writes: presets, v2 icon covers,
// https image URLs, and v1's compressed base64 data URLs.
const DATA_IMAGE_PREFIX = /^data:image\/[a-z0-9.+-]+;base64,/i

export function isValidCover(cover: unknown): boolean {
  if (cover === null || cover === undefined || cover === "") return true
  if (typeof cover !== "string") return false
  if (cover.startsWith("preset:")) return PRESET_COVERS.some((p) => `preset:${p.id}` === cover)
  if (cover.startsWith("icon:")) return parseCover(cover).type === "icon"
  if (cover.startsWith("https://")) {
    try {
      new URL(cover)
      return true
    } catch {
      return false
    }
  }
  return DATA_IMAGE_PREFIX.test(cover)
}

// 解析 cover 字串，判斷是預設、圖示、還是自訂
export function parseCover(cover: string | null | undefined): ParsedCover {
  if (!cover) {
    return { type: "none" }
  }

  if (cover.startsWith("preset:")) {
    return {
      type: "preset",
      presetId: cover.replace("preset:", ""),
    }
  }

  // v2 icon cover: icon:<iconId>;color:<colorId>
  if (cover.startsWith("icon:")) {
    const match = ICON_COVER_PATTERN.exec(cover)
    if (!match || !isIconId(match[1]) || !isColorId(match[2])) return { type: "none" }
    return { type: "icon", iconId: match[1], colorId: match[2] }
  }

  // 自訂圖片（base64 或 URL）
  return {
    type: "custom",
    customUrl: cover,
  }
}

// v1 screens do not know icon covers; show the first preset instead of a broken image.
export function toLegacyCover(parsed: ParsedCover): ParsedCover {
  if (parsed.type === "icon") {
    return { type: "preset", presetId: PRESET_COVERS[0].id }
  }
  return parsed
}

// 取得預設封面資料
export function getPresetCover(id: string): PresetCover | undefined {
  return PRESET_COVERS.find((c) => c.id === id)
}

// 產生 cover 字串
export function createCoverString(type: "preset" | "custom", value: string): string {
  if (type === "preset") {
    return `preset:${value}`
  }
  return value
}
