"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useLiff, PUBLIC_ROUTES, PUBLIC_PREFIXES } from "./liff-provider"
import { Logo } from "@/components/brand/logo"
import dynamic from "next/dynamic"

// Lazy: only a logged-out v2 user pays for the v2 fonts/bundle.
const LoginV2 = dynamic(() => import("@/components/v2/auth/login-v2").then((m) => m.LoginV2), { ssr: false })

interface AuthGateProps {
  children: ReactNode
}

function FullScreenLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-700/20 dark:via-background dark:to-brand-600/20">
      <div className="text-center animate-fade-in">
        {/* Logo with pulse animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-brand-400/20 dark:bg-brand-400/40 animate-pulse-ring" />
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
    return <LoginV2 isDevMode={isDevMode} onLogin={login} />
  }

  // 已登入，顯示子元素
  return <>{children}</>
}
