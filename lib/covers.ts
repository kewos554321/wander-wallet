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
    name: "海灘度假",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    emoji: "🏖️",
  },
  {
    id: "2",
    name: "山林探險",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    emoji: "🏔️",
  },
  {
    id: "3",
    name: "城市漫遊",
    gradient: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)",
    emoji: "🌆",
  },
  {
    id: "4",
    name: "美食之旅",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    emoji: "🍜",
  },
  {
    id: "5",
    name: "文化巡禮",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    emoji: "🏛️",
  },
  {
    id: "6",
    name: "自然風光",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    emoji: "🌿",
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
