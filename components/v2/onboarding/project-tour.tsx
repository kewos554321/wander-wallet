"use client"

import { useEffect, useRef } from "react"
import { driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"

export const PROJECT_TOUR_POPOVER_CLASS = "wander-wallet-tour-v2"

export const PROJECT_TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: "歡迎使用 Wander Wallet！",
      description: "這是專為旅行設計的分帳工具，讓我們快速認識主要功能吧！",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='trip-summary']",
    popover: {
      title: "旅程總覽",
      description: "這裡看得到總支出、平均每人、預算使用進度，以及你在這趟旅程的餘額。",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='feature-grid']",
    popover: {
      title: "主要功能",
      description: "旅伴、結算、統計、匯率都在這裡；結算也可以從上方餘額卡直接進入，點「更多」還有歷史、里程、匯出、筆記、地圖與照片。",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='share']",
    popover: {
      title: "分享",
      description: "一鍵把旅程連結分享到 LINE，邀請朋友加入或認領佔位旅伴。",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='add-expense-area']",
    popover: {
      title: "新增支出",
      description: "點 ＋ 手動輸入；點 ✨ 用說的或拍收據，AI 會自動幫你填好金額和內容。",
      side: "left",
      align: "center",
    },
  },
  {
    popover: {
      title: "準備好了！",
      description: "開始記錄你們的旅行支出吧！",
      side: "bottom",
      align: "center",
    },
  },
]

interface ProjectTourProps {
  onComplete: () => void
  onSkip?: () => void
}

export function ProjectTour({ onComplete, onSkip }: ProjectTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)
  const onCompleteRef = useRef(onComplete)
  const onSkipRef = useRef(onSkip)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onSkipRef.current = onSkip
  }, [onComplete, onSkip])

  useEffect(() => {
    const instance = driver({
      showProgress: true,
      steps: PROJECT_TOUR_STEPS,
      nextBtnText: "下一步",
      prevBtnText: "上一步",
      doneBtnText: "開始使用",
      progressText: "{{current}} / {{total}}",
      popoverClass: PROJECT_TOUR_POPOVER_CLASS,
      stagePadding: 8,
      stageRadius: 12,
      onDestroyStarted: () => {
        // Closed on the last step = completed; closed earlier = skipped.
        if (instance.hasNextStep()) {
          onSkipRef.current?.()
        } else {
          onCompleteRef.current()
        }
        instance.destroy()
      },
    })

    driverRef.current = instance
    instance.drive()

    return () => {
      driverRef.current?.destroy()
    }
  }, [])

  return null
}
