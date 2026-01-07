"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useLiff, PUBLIC_ROUTES, PUBLIC_PREFIXES } from "./liff-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { Logo } from "@/components/brand/logo"

interface AuthGateProps {
  children: ReactNode
}

function FullScreenLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-700/20 dark:via-background dark:to-brand-600/20">
      <div className="text-center animate-fade-in">
        {/* Logo with pulse animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-brand-400/20 animate-pulse-ring" />
          <Logo variant="simple" size="xl" />
        </div>

        {/* Brand name */}
        <h1 className="text-xl font-bold text-foreground mb-1">Wander Wallet</h1>
        <p className="text-sm text-muted-foreground mb-6">旅行分帳好幫手</p>

        {/* Loading spinner */}
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto" />
      </div>
    </div>
  )
}

export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname()
  const { user, isLoading, isDevMode, login } = useLiff()

  // 公開路由：直接顯示內容
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))

  // 檢查是否有 liff.state（即將跳轉到其他頁面）
  const hasLiffState = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("liff.state")

  // 如果有 liff.state，顯示載入畫面（避免閃頁面）
  if (hasLiffState) {
    return <FullScreenLoading />
  }

  if (isPublicRoute) {
    return <>{children}</>
  }

  // 載入中
  if (isLoading) {
    return <FullScreenLoading />
  }

  // 未登入
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-700/20 dark:via-background dark:to-brand-600/20">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo variant="simple" size="lg" />
            </div>
            <div>
              <CardTitle className="text-2xl">Wander Wallet</CardTitle>
              <CardDescription className="mt-2">
                旅行分帳好幫手
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isDevMode && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">開發模式</p>
                  <p className="text-amber-600 dark:text-amber-500">
                    LIFF ID 未設定，使用模擬登入。
                  </p>
                </div>
              </div>
            )}

            <Button
              className="w-full h-12"
              onClick={() => login()}
            >
              {isDevMode ? (
                <>開發模式登入</>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  使用 LINE 登入
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 已登入，顯示子元素
  return <>{children}</>
}
