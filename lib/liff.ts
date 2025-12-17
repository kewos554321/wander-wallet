import liff from "@line/liff"

export interface LiffUser {
  lineUserId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

let isInitialized = false

export async function initLiff(): Promise<void> {
  if (isInitialized) return

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    throw new Error("NEXT_PUBLIC_LIFF_ID is not set")
  }

  await liff.init({ liffId })
  isInitialized = true
}

export function isLoggedIn(): boolean {
  return liff.isLoggedIn()
}

export function login(redirectUri?: string): void {
  liff.login({ redirectUri: redirectUri || window.location.href })
}

export function logout(): void {
  liff.logout()
  window.location.reload()
}

export async function getProfile(): Promise<LiffUser | null> {
  if (!liff.isLoggedIn()) return null

  try {
    const profile = await liff.getProfile()
    return {
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    }
  } catch (error) {
    console.error("Failed to get LINE profile:", error)
    return null
  }
}

export function getAccessToken(): string | null {
  return liff.getAccessToken()
}

export function getIdToken(): string | null {
  return liff.getIDToken()
}

export function isInClient(): boolean {
  return liff.isInClient()
}

export function getOS(): "ios" | "android" | "web" | undefined {
  return liff.getOS()
}

export function closeWindow(): void {
  liff.closeWindow()
}

/**
 * 檢查是否可以發送訊息到當前聊天室
 * 需要從 LINE 聊天室（群組/1對1）開啟才能使用
 *
 * 條件：
 * 1. 在 LINE App 內開啟
 * 2. 從聊天室（utou/room/group）開啟
 */
export function isSendMessagesAvailable(): boolean {
  try {
    // 必須在 LINE App 內
    if (!liff.isInClient()) {
      return false
    }

    // 必須從聊天室開啟
    const context = liff.getContext()
    if (!context) {
      return false
    }

    // utou = 1對1聊天, room = 多人聊天室, group = 群組
    const validTypes = ["utou", "room", "group"]
    return validTypes.includes(context.type)
  } catch (error) {
    console.warn("[LIFF] 檢查 sendMessages 可用性失敗:", error)
    return false
  }
}

/**
 * 發送訊息到當前聊天室（以用戶身份）
 * 這不需要 Bot 加入群組
 */
export async function sendMessagesToChat(messages: Parameters<typeof liff.sendMessages>[0]): Promise<boolean> {
  if (!isSendMessagesAvailable()) {
    console.warn("[LIFF] sendMessages API 不可用（可能不是從聊天室開啟）")
    return false
  }

  try {
    await liff.sendMessages(messages)
    console.log("[LIFF] 訊息已發送到聊天室")
    return true
  } catch (error) {
    console.error("[LIFF] 發送訊息失敗:", error)
    return false
  }
}

export interface ExpenseNotificationData {
  operationType: "create" | "update" | "delete"
  projectName: string
  projectId: string
  payerName: string
  amount: number
  description?: string
  category?: string
  participantCount: number
}

/**
 * 發送支出通知到當前聊天室（以用戶身份）
 */
export async function sendExpenseNotificationToChat(data: ExpenseNotificationData): Promise<boolean> {
  const categoryEmojis: Record<string, string> = {
    food: "🍽️",
    drinks: "🥤",
    transport: "🚗",
    accommodation: "🏨",
    entertainment: "🎬",
    shopping: "🛍️",
    ticket: "🎫",
    gift: "🎁",
    medical: "💊",
    other: "📝",
  }

  const operationConfig = {
    create: { label: "新增花費", color: "#5CB87A" },
    update: { label: "更新花費", color: "#E09855" },
    delete: { label: "刪除花費", color: "#D97B7B" },
  }

  const config = operationConfig[data.operationType]
  const categoryEmoji = categoryEmojis[data.category || "other"] || "📝"
  const displayText = data.description
    ? `${categoryEmoji} ${data.description}`
    : categoryEmoji

  const formattedAmount = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(data.amount)

  const perPersonAmount = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(Math.round(data.amount / data.participantCount))

  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || ""
  const projectUrl = `${liffUrl}/projects/${data.projectId}`

  // 刪除時金額加上刪除線
  const amountDecoration = data.operationType === "delete" ? "line-through" as const : "none" as const

  const flexMessage = {
    type: "flex" as const,
    altText: `${config.label}：${data.description || "消費"} ${formattedAmount}`,
    contents: {
      type: "bubble" as const,
      size: "kilo" as const,
      header: {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
          {
            type: "text" as const,
            text: data.projectName,
            size: "xs" as const,
            color: "#ffffff",
            weight: "bold" as const,
            flex: 3,
          },
          {
            type: "text" as const,
            text: config.label,
            size: "xs" as const,
            color: "#ffffff",
            align: "end" as const,
            flex: 2,
          },
        ],
        backgroundColor: config.color,
        paddingAll: "lg" as const,
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          {
            type: "text" as const,
            text: displayText,
            size: "lg" as const,
            weight: "bold" as const,
            color: "#4A4A4A",
            wrap: true as const,
          },
          {
            type: "text" as const,
            text: formattedAmount,
            size: "xxl" as const,
            weight: "bold" as const,
            color: config.color,
            margin: "sm" as const,
            decoration: amountDecoration,
          },
          {
            type: "text" as const,
            text: `${data.participantCount}人分攤 · 每人 ${perPersonAmount}`,
            size: "sm" as const,
            color: "#9E9E9E",
            margin: "md" as const,
            style: "italic" as const,
          },
        ],
        paddingAll: "lg" as const,
      },
      footer: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          {
            type: "button" as const,
            action: {
              type: "uri" as const,
              label: "查看明細",
              uri: projectUrl,
            },
            style: "primary" as const,
            height: "sm" as const,
            color: config.color,
          },
        ],
        paddingTop: "none" as const,
        paddingBottom: "md" as const,
        paddingStart: "lg" as const,
        paddingEnd: "lg" as const,
      },
    },
  }

  return sendMessagesToChat([flexMessage])
}
