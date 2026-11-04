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
    gradient: "linear-gradient(135deg, #1B5847 0%, #2F8F74 100%)",
    emoji: "logo", // 特殊值：使用品牌 Logo
  },
  {
    id: "2",
    name: "海灘度假",
    gradient: "linear-gradient(180deg, #4A6FA5 0%, #A9C2E2 100%)",
    emoji: "🏖️",
  },
  {
    id: "3",
    name: "山林探險",
    gradient: "linear-gradient(135deg, #4C5A26 0%, #9CB06A 100%)",
    emoji: "🏔️",
  },
  {
    id: "4",
    name: "城市漫遊",
    gradient: "linear-gradient(135deg, #2A241F 0%, #C4602F 100%)",
    emoji: "🌆",
  },
  {
    id: "5",
    name: "美食之旅",
    gradient: "linear-gradient(135deg, #C4602F 0%, #E8825A 100%)",
    emoji: "🍜",
  },
  {
    id: "6",
    name: "飛行旅程",
    gradient: "linear-gradient(45deg, #35507A 0%, #8FB4D9 100%)",
    emoji: "✈️",
  },
  {
    id: "7",
    name: "露營野趣",
    gradient: "linear-gradient(180deg, #6B7A3A 0%, #2A241F 100%)",
    emoji: "🏕️",
  },
  {
    id: "8",
    name: "購物血拼",
    gradient: "linear-gradient(90deg, #A14A68 0%, #D7A0B6 100%)",
    emoji: "🛍️",
  },
  {
    id: "9",
    name: "滑雪假期",
    gradient: "linear-gradient(180deg, #EAF5F1 0%, #C9DCE6 100%)",
    emoji: "🎿",
  },
  {
    id: "10",
    name: "郵輪度假",
    gradient: "linear-gradient(90deg, #1B5847 0%, #4A6FA5 100%)",
    emoji: "🚢",
  },
  {
    id: "11",
    name: "商務出差",
    gradient: "linear-gradient(180deg, #2A241F 0%, #4A443D 100%)",
    emoji: "💼",
  },
  {
    id: "12",
    name: "派對慶祝",
    gradient: "linear-gradient(45deg, #6B5B95 0%, #E8825A 100%)",
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

// The nine original v1 themes, kept selectable alongside the v2 icon covers.
export const CLASSIC_COVERS: PresetCover[] = PRESET_COVERS.slice(0, 9)

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
  { id: "plane", label: "飛機" },
  { id: "map-pin", label: "地圖" },
  { id: "tent", label: "露營" },
  { id: "ship", label: "郵輪" },
  { id: "train", label: "火車" },
  { id: "bike", label: "單車" },
  { id: "coffee", label: "咖啡" },
  { id: "shopping-bag", label: "購物" },
  { id: "ticket", label: "票券" },
  { id: "sun", label: "太陽" },
  { id: "music", label: "音樂" },
  { id: "backpack", label: "背包" },
  { id: "palm-tree", label: "度假" },
  { id: "landmark", label: "地標" },
  { id: "luggage", label: "行李" },
  { id: "map", label: "旅遊地圖" },
  { id: "route", label: "路線" },
  { id: "navigation", label: "導航" },
  { id: "anchor", label: "錨" },
  { id: "sailboat", label: "帆船" },
  { id: "bus", label: "巴士" },
  { id: "plane-takeoff", label: "起飛" },
  { id: "plane-landing", label: "降落" },
  { id: "hotel", label: "飯店" },
  { id: "umbrella", label: "陽傘" },
  { id: "snowflake", label: "雪景" },
  { id: "waves", label: "海浪" },
  { id: "trees", label: "森林" },
  { id: "taxi", label: "計程車" },
  { id: "cable-car", label: "纜車" },
  { id: "fuel", label: "加油" },
  { id: "parking", label: "停車" },
  { id: "fish", label: "海鮮" },
  { id: "wine", label: "紅酒" },
  { id: "pizza", label: "披薩" },
  { id: "ice-cream", label: "冰淇淋" },
  { id: "key", label: "鑰匙" },
  { id: "concierge-bell", label: "客房服務" },
  { id: "sunrise", label: "日出" },
  { id: "sunset", label: "日落" },
  { id: "calendar", label: "行程" },
  { id: "languages", label: "語言" },
] as const

export const COVER_COLORS = [
  { id: "lake", fg: "#1B5847", bg: "#EAF5F1", darkFg: "#4FB394", darkBg: "#17302A" },
  { id: "coral", fg: "#C4602F", bg: "#FBE3D2", darkFg: "#F09A76", darkBg: "#3A2519" },
  { id: "red", fg: "#C4472F", bg: "#F6DCD3", darkFg: "#E8735A", darkBg: "#3A1E18" },
  { id: "rose", fg: "#A14A68", bg: "#F5DDE6", darkFg: "#D77E9C", darkBg: "#37212A" },
  { id: "gold", fg: "#9C7A28", bg: "#F6ECCF", darkFg: "#D4AE55", darkBg: "#332A16" },
  { id: "plum", fg: "#6B5B95", bg: "#E7E2F2", darkFg: "#A897D6", darkBg: "#2A2438" },
  { id: "ink", fg: "#2A241F", bg: "#E9E5DF", darkFg: "#D9D2C7", darkBg: "#2A2622" },
  { id: "sky", fg: "#35507A", bg: "#E6EDF7", darkFg: "#8FB4D9", darkBg: "#1D2736" },
  { id: "moss", fg: "#4C5A26", bg: "#EDF1DE", darkFg: "#9CB06A", darkBg: "#242A16" },
  { id: "sand", fg: "#8B7355", bg: "#F3EBDE", darkFg: "#C9AE8C", darkBg: "#2E261C" },
  { id: "slate", fg: "#4A5568", bg: "#E8EBF0", darkFg: "#A9B5C5", darkBg: "#232933" },
  { id: "berry", fg: "#8E3556", bg: "#F6E2EA", darkFg: "#D98AA6", darkBg: "#331C26" },
  { id: "ocean", fg: "#2D6A78", bg: "#E1F0F3", darkFg: "#7BC0CC", darkBg: "#142B30" },
  { id: "cobalt", fg: "#2F4B8F", bg: "#E5EAF8", darkFg: "#8FA6E0", darkBg: "#1A2238" },
  { id: "mint", fg: "#2F7A6B", bg: "#E0F2ED", darkFg: "#7FC4B4", darkBg: "#16302B" },
] as const

// D5: red stays in COVER_COLORS for old saved covers but is hidden from the picker.
const PICKER_COLOR_IDS = ["lake", "coral", "plum", "gold", "rose", "ink", "sky", "moss", "sand", "slate", "berry", "ocean", "cobalt", "mint"] as const
export const COVER_PICKER_COLORS = PICKER_COLOR_IDS.map((id) => COVER_COLORS.find((c) => c.id === id)!)

export const DEFAULT_ICON_COVER = "icon:leaf;color:lake"

const isIconId = (id: string) => COVER_ICONS.some((i) => i.id === id)
const isColorId = (id: string) => COVER_COLORS.some((c) => c.id === id)

export function buildIconCover(iconId: string, colorId: string): string {
  return `icon:${iconId};color:${colorId}`
}

const ICON_COVER_PATTERN = /^icon:([a-z0-9-]+);color:([a-z0-9-]+)$/

// Accepts every cover format the app writes: presets, v2 icon covers,
// https image URLs, and the legacy compressed base64 data URLs.
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
