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

  await liff.init({
    liffId,
    withLoginOnExternalBrowser: true,  // 外部瀏覽器自動執行登入
  })
  isInitialized = true
}

export function isLoggedIn(): boolean {
  return liff.isLoggedIn()
}

export function login(redirectUri?: string): void {
  if (redirectUri) {
    liff.login({ redirectUri })
  } else {
    liff.login()
  }
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

export function isInClient(): boolean {
  return liff.isInClient()
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
  } catch {
    return false
  }
}

/**
 * 發送訊息到當前聊天室（以用戶身份）
 * 這不需要 Bot 加入群組
 */
export async function sendMessagesToChat(messages: Parameters<typeof liff.sendMessages>[0]): Promise<boolean> {
  if (!isSendMessagesAvailable()) {
    return false
  }

  try {
    await liff.sendMessages(messages)
    return true
  } catch {
    return false
  }
}

export interface ExpenseChange {
  field: "amount" | "description" | "category" | "payer" | "date" | "location" | "participants" | "image"
  label: string
  oldValue?: string
  newValue?: string
}

export interface ExpenseNotificationData {
  operationType: "create" | "update"
  projectName: string
  projectId: string
  payerName: string
  amount: number
  description?: string
  category?: string
  participantCount: number
  changes?: ExpenseChange[]
}

export interface DeleteNotificationData {
  projectName: string
  projectId: string
  payerName: string
  amount: number
  description?: string
  category?: string
  participantCount: number
}

export interface BatchExpenseItem {
  amount: number
  description?: string
  category?: string
  payerName: string
  participantCount: number
}

export interface BatchExpenseNotificationData {
  projectName: string
  projectId: string
  expenses: BatchExpenseItem[]
}

export interface BatchDeleteNotificationData {
  projectName: string
  projectId: string
  expenses: BatchExpenseItem[]
}

/**
 * 類別對應的 emoji（對應 Lucide icons）
 * @see components/expense/expense-form.tsx CATEGORIES
 */
const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍴",         // Utensils - 餐飲
  transport: "🚗",    // Car - 交通
  accommodation: "🏠", // Home - 住宿
  ticket: "🎫",       // Ticket - 票券
  shopping: "🛍️",     // ShoppingBag - 購物
  entertainment: "🎮", // Gamepad2 - 娛樂
  gift: "🎁",         // Gift - 禮品
  other: "💰",        // Wallet - 其他
}

/**
 * 發送支出通知到當前聊天室（以用戶身份）- 用於新增/更新
 */
export async function sendExpenseNotificationToChat(data: ExpenseNotificationData): Promise<boolean> {
  const operationConfig = {
    create: { label: "新增花費", color: "#5CB87A" },
    update: { label: "更新花費", color: "#E09855" },
  }

  const config = operationConfig[data.operationType]
  const categoryEmoji = CATEGORY_EMOJIS[data.category || "other"] || "💰"

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

  // 建立基礎 body 內容（使用 unknown[] 因為 LIFF SDK 型別較嚴格）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyContents: any[] = [
    // 第一行：emoji + 描述 + 金額（與批次模板一致）
    {
      type: "box" as const,
      layout: "horizontal" as const,
      contents: [
        {
          type: "text" as const,
          text: categoryEmoji,
          size: "md" as const,
          flex: 0,
        },
        {
          type: "text" as const,
          text: data.description || "消費",
          size: "sm" as const,
          color: "#4A4A4A",
          flex: 1,
          margin: "sm" as const,
          weight: "bold" as const,
        },
        {
          type: "text" as const,
          text: formattedAmount,
          size: "sm" as const,
          color: config.color,
          align: "end" as const,
          flex: 0,
          weight: "bold" as const,
        },
      ],
      alignItems: "center" as const,
    },
    // 第二行：付款人 + 分攤資訊
    {
      type: "text" as const,
      text: `${data.payerName} 付 · ${data.participantCount}人分攤 · 每人 ${perPersonAmount}`,
      size: "xs" as const,
      color: "#9E9E9E",
      margin: "sm" as const,
    },
  ]

  // 如果是更新且有變更內容，加入變更區塊
  if (data.operationType === "update" && data.changes && data.changes.length > 0) {
    // 加入分隔線
    bodyContents.push({
      type: "separator" as const,
      margin: "lg" as const,
      color: "#EEEEEE",
    })

    // 加入「變更內容」標題
    bodyContents.push({
      type: "text" as const,
      text: "📝 變更內容",
      size: "sm" as const,
      weight: "bold" as const,
      color: "#4A4A4A",
      margin: "lg" as const,
    })

    // 加入每個變更項目
    for (const change of data.changes) {
      bodyContents.push({
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
          {
            type: "text" as const,
            text: change.label,
            size: "xs" as const,
            color: "#9E9E9E",
            flex: 0,
          },
          {
            type: "text" as const,
            text: `${change.oldValue || "-"} → ${change.newValue || "-"}`,
            size: "xs" as const,
            color: "#E09855",
            align: "end" as const,
            flex: 1,
            wrap: true as const,
          },
        ],
        margin: "sm" as const,
      })
    }
  }

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
        contents: bodyContents,
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

/**
 * 發送單筆刪除通知到當前聊天室（以用戶身份）
 */
export async function sendDeleteNotificationToChat(data: DeleteNotificationData): Promise<boolean> {
  const themeColor = "#D97B7B"
  const categoryEmoji = CATEGORY_EMOJIS[data.category || "other"] || "💰"

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

  const flexMessage = {
    type: "flex" as const,
    altText: `刪除花費：${data.description || "消費"} ${formattedAmount}`,
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
            text: "刪除花費",
            size: "xs" as const,
            color: "#ffffff",
            align: "end" as const,
            flex: 2,
          },
        ],
        backgroundColor: themeColor,
        paddingAll: "lg" as const,
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          // 第一行：emoji + 描述 + 金額（與批次模板一致）
          {
            type: "box" as const,
            layout: "horizontal" as const,
            contents: [
              {
                type: "text" as const,
                text: categoryEmoji,
                size: "md" as const,
                flex: 0,
              },
              {
                type: "text" as const,
                text: data.description || "消費",
                size: "sm" as const,
                color: "#9E9E9E",
                flex: 1,
                margin: "sm" as const,
                weight: "bold" as const,
                decoration: "line-through" as const,
              },
              {
                type: "text" as const,
                text: formattedAmount,
                size: "sm" as const,
                color: themeColor,
                align: "end" as const,
                flex: 0,
                weight: "bold" as const,
                decoration: "line-through" as const,
              },
            ],
            alignItems: "center" as const,
          },
          // 第二行：付款人 + 分攤資訊
          {
            type: "text" as const,
            text: `${data.payerName} 付 · ${data.participantCount}人分攤 · 每人 ${perPersonAmount}`,
            size: "xs" as const,
            color: "#BDBDBD",
            margin: "sm" as const,
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
            color: themeColor,
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

/**
 * 發送批次支出通知到當前聊天室（以用戶身份）
 */
export async function sendBatchExpenseNotificationToChat(data: BatchExpenseNotificationData): Promise<boolean> {
  const themeColor = "#5CB87A"

  // 計算總金額
  const totalAmount = data.expenses.reduce((sum, e) => sum + e.amount, 0)
  const formattedTotal = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(totalAmount)

  // 生成費用列表內容
  const expenseContents = data.expenses.flatMap((expense, index) => {
    const categoryEmoji = CATEGORY_EMOJIS[expense.category || "other"] || "💰"

    const formattedAmount = new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(expense.amount)

    const perPersonAmount = new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(Math.round(expense.amount / expense.participantCount))

    const baseItems = [
      // 第一行：emoji + 描述 + 金額
      {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
          {
            type: "text" as const,
            text: categoryEmoji,
            size: "md" as const,
            flex: 0,
          },
          {
            type: "text" as const,
            text: expense.description || "消費",
            size: "sm" as const,
            color: "#4A4A4A",
            flex: 1,
            margin: "sm" as const,
          },
          {
            type: "text" as const,
            text: formattedAmount,
            size: "sm" as const,
            color: "#4A4A4A",
            align: "end" as const,
            flex: 0,
            weight: "bold" as const,
          },
        ],
        alignItems: "center" as const,
      },
      // 第二行：付款人 + 分攤資訊
      {
        type: "text" as const,
        text: `${expense.payerName} 付 · ${expense.participantCount}人分攤 · 每人 ${perPersonAmount}`,
        size: "xs" as const,
        color: "#9E9E9E",
        margin: "xs" as const,
      },
    ]

    // 在項目之間加入分隔線（除了最後一個）
    if (index < data.expenses.length - 1) {
      return [
        ...baseItems,
        {
          type: "separator" as const,
          margin: "md" as const,
          color: "#EEEEEE",
        },
      ]
    }

    return baseItems
  })

  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || ""
  const projectUrl = `${liffUrl}/projects/${data.projectId}`

  const flexMessage = {
    type: "flex" as const,
    altText: `批次新增 ${data.expenses.length} 筆花費，共 ${formattedTotal}`,
    contents: {
      type: "bubble" as const,
      size: "mega" as const,
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
            text: `批次新增 ${data.expenses.length} 筆`,
            size: "xs" as const,
            color: "#ffffff",
            align: "end" as const,
            flex: 2,
          },
        ],
        backgroundColor: themeColor,
        paddingAll: "lg" as const,
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          // 總金額區塊
          {
            type: "box" as const,
            layout: "horizontal" as const,
            contents: [
              {
                type: "text" as const,
                text: "總計",
                size: "md" as const,
                color: "#4A4A4A",
                weight: "bold" as const,
              },
              {
                type: "text" as const,
                text: formattedTotal,
                size: "xl" as const,
                color: themeColor,
                align: "end" as const,
                weight: "bold" as const,
              },
            ],
            paddingBottom: "md" as const,
          },
          {
            type: "separator" as const,
            color: "#EEEEEE",
          },
          // 費用列表
          {
            type: "box" as const,
            layout: "vertical" as const,
            contents: expenseContents,
            paddingTop: "md" as const,
            spacing: "sm" as const,
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
            color: themeColor,
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

/**
 * 發送批次刪除通知到當前聊天室（以用戶身份）
 */
export async function sendBatchDeleteNotificationToChat(data: BatchDeleteNotificationData): Promise<boolean> {
  const themeColor = "#D97B7B"

  // 計算總金額
  const totalAmount = data.expenses.reduce((sum, e) => sum + e.amount, 0)
  const formattedTotal = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(totalAmount)

  // 生成費用列表內容
  const expenseContents = data.expenses.flatMap((expense, index) => {
    const categoryEmoji = CATEGORY_EMOJIS[expense.category || "other"] || "💰"

    const formattedAmount = new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(expense.amount)

    const baseItems = [
      // 第一行：emoji + 描述 + 金額
      {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
          {
            type: "text" as const,
            text: categoryEmoji,
            size: "md" as const,
            flex: 0,
          },
          {
            type: "text" as const,
            text: expense.description || "消費",
            size: "sm" as const,
            color: "#9E9E9E",
            flex: 1,
            margin: "sm" as const,
            decoration: "line-through" as const,
          },
          {
            type: "text" as const,
            text: formattedAmount,
            size: "sm" as const,
            color: "#9E9E9E",
            align: "end" as const,
            flex: 0,
            weight: "bold" as const,
            decoration: "line-through" as const,
          },
        ],
        alignItems: "center" as const,
      },
      // 第二行：付款人資訊
      {
        type: "text" as const,
        text: `${expense.payerName} 付 · ${expense.participantCount}人分攤`,
        size: "xs" as const,
        color: "#BDBDBD",
        margin: "xs" as const,
      },
    ]

    // 在項目之間加入分隔線（除了最後一個）
    if (index < data.expenses.length - 1) {
      return [
        ...baseItems,
        {
          type: "separator" as const,
          margin: "md" as const,
          color: "#EEEEEE",
        },
      ]
    }

    return baseItems
  })

  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || ""
  const projectUrl = `${liffUrl}/projects/${data.projectId}`

  const flexMessage = {
    type: "flex" as const,
    altText: `批次刪除 ${data.expenses.length} 筆花費，共 ${formattedTotal}`,
    contents: {
      type: "bubble" as const,
      size: "mega" as const,
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
            text: `批次刪除 ${data.expenses.length} 筆`,
            size: "xs" as const,
            color: "#ffffff",
            align: "end" as const,
            flex: 2,
          },
        ],
        backgroundColor: themeColor,
        paddingAll: "lg" as const,
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          // 總金額區塊
          {
            type: "box" as const,
            layout: "horizontal" as const,
            contents: [
              {
                type: "text" as const,
                text: "已刪除",
                size: "md" as const,
                color: "#4A4A4A",
                weight: "bold" as const,
              },
              {
                type: "text" as const,
                text: formattedTotal,
                size: "xl" as const,
                color: themeColor,
                align: "end" as const,
                weight: "bold" as const,
              },
            ],
            paddingBottom: "md" as const,
          },
          {
            type: "separator" as const,
            color: "#EEEEEE",
          },
          // 費用列表
          {
            type: "box" as const,
            layout: "vertical" as const,
            contents: expenseContents,
            paddingTop: "md" as const,
            spacing: "sm" as const,
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
            color: themeColor,
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
