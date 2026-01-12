"use client"

import { useEffect, useRef } from "react"
import { driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"

interface AppTourProps {
  onComplete: () => void
  onSkip?: () => void
}

export function AppTour({ onComplete, onSkip }: AppTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  useEffect(() => {
    // Define tour steps for project page
    const steps: DriveStep[] = [
      // 1. 歡迎
      {
        popover: {
          title: "歡迎使用 Wander Wallet!",
          description:
            "這是專為旅行設計的分帳工具，讓我們快速認識主要功能吧！",
          side: "bottom",
          align: "center",
        },
      },
      // 2. 新增支出區（語音 + 手動，含收據辨識說明）
      {
        element: "[data-tour='add-expense-area']",
        popover: {
          title: "新增支出",
          description:
            "1. 點 ＋ 手動輸入，也可拍照上傳收據讓 2. AI 辨識；點 ✨ 拍照上傳收據用說的，AI 自動幫你填好金額和內容",
          side: "left",
          align: "center",
        },
      },
      // 3. 結算
      {
        element: "[data-tour='feature-settle']",
        popover: {
          title: "結算",
          description: "查看誰該付錢給誰，系統自動算出最少轉帳次數",
          side: "bottom",
          align: "start",
        },
      },
      // 4. 成員
      {
        element: "[data-tour='feature-members']",
        popover: {
          title: "成員",
          description: "管理成員，可新增佔位成員讓朋友之後認領",
          side: "bottom",
          align: "start",
        },
      },
      // 5. 統計
      {
        element: "[data-tour='feature-stats']",
        popover: {
          title: "統計",
          description: "圖表分析各類別支出佔比、每日消費趨勢",
          side: "bottom",
          align: "start",
        },
      },
      // 6. 邀請
      {
        element: "[data-tour='feature-invite']",
        popover: {
          title: "邀請",
          description: "一鍵分享連結到 LINE，邀請朋友加入專案",
          side: "bottom",
          align: "start",
        },
      },
      // 7. 更多功能（第二頁）
      {
        element: "[data-tour='more-features']",
        popover: {
          title: "更多功能",
          description:
            "功能區可左右滑動！更多功能還有匯出報表、操作歷史、里程計算、匯率設定、共享筆記、消費地圖、旅遊照片來幫你記錄更多旅行分攤細節",
          side: "top",
          align: "center",
        },
      },
      // 8. 完成
      {
        popover: {
          title: "準備好了！",
          description: "開始記錄你們的旅行支出吧！",
          side: "bottom",
          align: "center",
        },
      },
    ]

    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      driverRef.current = driver({
        showProgress: true,
        steps,
        nextBtnText: "下一步",
        prevBtnText: "上一步",
        doneBtnText: "開始使用",
        progressText: "{{current}} / {{total}}",
        popoverClass: "wander-wallet-tour",
        stagePadding: 8,
        stageRadius: 12,
        onDestroyStarted: () => {
          if (driverRef.current?.hasNextStep()) {
            onSkip?.()
          }
          onComplete()
          driverRef.current?.destroy()
        },
      })

      driverRef.current.drive()
    }, 500)

    return () => {
      clearTimeout(timer)
      driverRef.current?.destroy()
    }
  }, [onComplete, onSkip])

  return null
}
