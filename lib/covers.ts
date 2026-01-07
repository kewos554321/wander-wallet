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

// 解析 cover 字串，判斷是預設還是自訂
export function parseCover(cover: string | null | undefined): {
  type: "preset" | "custom" | "none"
  presetId?: string
  customUrl?: string
} {
  if (!cover) {
    return { type: "none" }
  }

  if (cover.startsWith("preset:")) {
    return {
      type: "preset",
      presetId: cover.replace("preset:", ""),
    }
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
