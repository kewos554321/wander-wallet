/**
 * LINE Messaging API 通知服務
 * 用於發送費用通知到 LINE 群組
 */

const LINE_MESSAGING_API_URL = "https://api.line.me/v2/bot/message/push"

interface FlexMessage {
  type: "flex"
  altText: string
  contents: FlexContainer
}

interface FlexContainer {
  type: "bubble"
  body: FlexBox
  footer?: FlexBox
}

interface FlexBox {
  type: "box"
  layout: "vertical" | "horizontal" | "baseline"
  contents: FlexComponent[]
  spacing?: string
  margin?: string
  paddingAll?: string
}

type FlexComponent = FlexBox | FlexText | FlexSeparator | FlexButton

interface FlexText {
  type: "text"
  text: string
  size?: string
  weight?: string
  color?: string
  wrap?: boolean
  align?: string
}

interface FlexSeparator {
  type: "separator"
  margin?: string
}

interface FlexButton {
  type: "button"
  action: {
    type: "uri"
    label: string
    uri: string
  }
  style?: "primary" | "secondary" | "link"
  height?: string
}

export interface ExpenseNotification {
  projectName: string
  projectId: string
  payerName: string
  amount: number
  description?: string
  category?: string
  participantCount: number
}

/**
 * 發送費用通知到 LINE 群組
 */
export async function sendExpenseNotification(
  groupId: string,
  expense: ExpenseNotification
): Promise<boolean> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  if (!channelAccessToken) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set, skipping notification")
    return false
  }

  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || ""
  const projectUrl = `${liffUrl}/projects/${expense.projectId}`

  const categoryLabel = getCategoryLabel(expense.category)
  const formattedAmount = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(expense.amount)

  const flexMessage: FlexMessage = {
    type: "flex",
    altText: `${expense.payerName} 新增了一筆 ${formattedAmount} 的消費`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: expense.projectName,
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
                  },
                  {
                    type: "text",
                    text: expense.payerName,
                    size: "sm",
                    align: "end",
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
                  },
                  {
                    type: "text",
                    text: formattedAmount,
                    size: "sm",
                    weight: "bold",
                    align: "end",
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
                  },
                  {
                    type: "text",
                    text: categoryLabel,
                    size: "sm",
                    align: "end",
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
                  },
                  {
                    type: "text",
                    text: `${expense.participantCount} 人`,
                    size: "sm",
                    align: "end",
                  },
                ],
              },
              ...(expense.description
                ? [
                    {
                      type: "box" as const,
                      layout: "horizontal" as const,
                      contents: [
                        {
                          type: "text" as const,
                          text: "備註",
                          size: "sm",
                          color: "#888888",
                        },
                        {
                          type: "text" as const,
                          text: expense.description,
                          size: "sm",
                          align: "end" as const,
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
  }

  try {
    const response = await fetch(LINE_MESSAGING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [flexMessage],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to send LINE notification:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error sending LINE notification:", error)
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
