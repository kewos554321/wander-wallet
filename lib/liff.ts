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

export interface LiffContext {
  type: "utou" | "room" | "group" | "none" | "square_chat" | "external"
  groupId?: string
  roomId?: string
  userId?: string
}

/**
 * 取得 LIFF 開啟的環境資訊
 * 如果在群組中開啟，會包含 groupId
 */
export function getContext(): LiffContext | null {
  try {
    const context = liff.getContext()
    if (!context) return null

    return {
      type: context.type,
      groupId: context.type === "group" ? context.groupId : undefined,
      roomId: context.type === "room" ? context.roomId : undefined,
      userId: context.userId,
    }
  } catch (error) {
    // 權限不足或不在 LINE App 內開啟時會拋出錯誤
    console.warn("Unable to get LIFF context:", error)
    return null
  }
}

/**
 * 取得 LINE 群組 ID（如果在群組中開啟）
 */
export function getGroupId(): string | null {
  try {
    const context = getContext()
    return context?.groupId || null
  } catch {
    return null
  }
}

/**
 * 檢查是否支援 shareTargetPicker
 */
export function isShareTargetPickerAvailable(): boolean {
  return liff.isApiAvailable("shareTargetPicker")
}

export interface ExpenseShareData {
  projectName: string
  projectId: string
  payerName: string
  amount: number
  description?: string
  category?: string
  participantCount: number
}

/**
 * 分享消費通知到 LINE 好友或群組
 * 使用 shareTargetPicker 讓用戶選擇分享對象
 */
export async function shareExpenseToLine(data: ExpenseShareData): Promise<boolean> {
  if (!isShareTargetPickerAvailable()) {
    console.warn("shareTargetPicker is not available")
    return false
  }

  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || ""
  const projectUrl = `${liffUrl}/projects/${data.projectId}`

  const categoryLabel = getCategoryLabel(data.category)
  const formattedAmount = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(data.amount)

  try {
    const result = await liff.shareTargetPicker([
      {
        type: "flex",
        altText: `${data.payerName} 新增了一筆 ${formattedAmount} 的消費`,
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: data.projectName,
                size: "sm",
                color: "#888888",
              },
              {
                type: "text",
                text: "新增消費",
                weight: "bold",
                size: "xl",
              },
              {
                type: "separator",
                margin: "lg",
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "付款人",
                        size: "sm",
                        color: "#888888",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: data.payerName,
                        size: "sm",
                        align: "end",
                        flex: 3,
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "金額",
                        size: "sm",
                        color: "#888888",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: formattedAmount,
                        size: "sm",
                        weight: "bold",
                        align: "end",
                        flex: 3,
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "類別",
                        size: "sm",
                        color: "#888888",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: categoryLabel,
                        size: "sm",
                        align: "end",
                        flex: 3,
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                      {
                        type: "text",
                        text: "分攤人數",
                        size: "sm",
                        color: "#888888",
                        flex: 2,
                      },
                      {
                        type: "text",
                        text: `${data.participantCount} 人`,
                        size: "sm",
                        align: "end",
                        flex: 3,
                      },
                    ],
                  },
                  ...(data.description
                    ? [
                        {
                          type: "box" as const,
                          layout: "horizontal" as const,
                          contents: [
                            {
                              type: "text" as const,
                              text: "備註",
                              size: "sm" as const,
                              color: "#888888",
                              flex: 2,
                            },
                            {
                              type: "text" as const,
                              text: data.description,
                              size: "sm" as const,
                              align: "end" as const,
                              flex: 3,
                              wrap: true,
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              },
            ],
            paddingAll: "lg",
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                action: {
                  type: "uri",
                  label: "查看專案",
                  uri: projectUrl,
                },
                style: "primary",
                height: "sm",
              },
            ],
            paddingAll: "md",
          },
        },
      },
    ])

    return result !== undefined
  } catch (error) {
    console.error("Failed to share expense:", error)
    return false
  }
}

function getCategoryLabel(category?: string): string {
  switch (category) {
    case "food":
      return "餐飲"
    case "transport":
      return "交通"
    case "accommodation":
      return "住宿"
    case "entertainment":
      return "娛樂"
    case "shopping":
      return "購物"
    default:
      return "其他"
  }
}
