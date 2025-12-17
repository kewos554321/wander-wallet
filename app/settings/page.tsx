"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLiff } from "@/components/auth/liff-provider"
import { useTheme } from "@/components/system/theme-provider"
import { LogOut, ChevronRight, ChevronDown, Sun, Moon, Monitor, User, Download, CheckCircle2 } from "lucide-react"
import { AvatarDisplay, parseAvatarString } from "@/components/avatar-picker"

// PWA Install types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };
const hasStandalone = (n: Navigator): n is NavigatorWithStandalone => "standalone" in n;

type WindowWithMSStream = Window & { MSStream?: unknown };
const hasMSStream = (w: Window): w is WindowWithMSStream => "MSStream" in w;

const NEVER_SHOW_KEY = "install-prompt-never-show";

export default function SettingsPage() {
  const [open, setOpen] = useState(false)
  const [themeExpanded, setThemeExpanded] = useState(false)
  const { user, logout } = useLiff()
  const isCustomAvatar = parseAvatarString(user?.image) !== null
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  const isiOS = useMemo(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined") return false
    const isiOSUA = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const noMS = !hasMSStream(window)
    return isiOSUA && noMS
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches
    const iosStandalone = hasStandalone(window.navigator) && window.navigator.standalone === true
    setIsStandalone(mediaStandalone || iosStandalone)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsStandalone(true)
        // 清除永不顯示設定，因為已安裝
        localStorage.removeItem(NEVER_SHOW_KEY)
      }
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }

  function resetInstallPrompt() {
    localStorage.removeItem(NEVER_SHOW_KEY)
    alert("已重置安裝提示設定，下次進入時會再次顯示安裝提示")
  }

  async function handleLogout() {
    await logout()
  }

  const themeOptions = [
    { value: "light", label: "淺色", icon: Sun },
    { value: "dark", label: "深色", icon: Moon },
    { value: "system", label: "系統", icon: Monitor },
  ] as const

  return (
    <AppLayout title="設定">
      <div className="space-y-4">
        {/* 用戶資料預覽 */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push("/settings/profile")}
        >
          <CardContent className="flex items-center gap-4">
            {isCustomAvatar ? (
              <AvatarDisplay avatarString={user?.image} size="md" />
            ) : user?.image ? (
              <Image
                src={user.image}
                alt="頭像"
                width={48}
                height={48}
                className="rounded-full object-cover size-12"
              />
            ) : (
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <User className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user?.name || "使用者"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                LINE 用戶
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* 主題設定 */}
        <Card>
          <CardContent className="space-y-3">
            <button
              onClick={() => setThemeExpanded(!themeExpanded)}
              className="w-full flex items-center justify-between"
            >
              <span className="font-medium">外觀</span>
              <ChevronDown
                className={`size-5 text-muted-foreground transition-transform ${
                  themeExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {themeExpanded && (
              <div className="flex gap-2 pt-1">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = theme === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <Icon className={`size-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 安裝應用程式 */}
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isStandalone ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <Download className="size-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">安裝應用程式</p>
                  <p className="text-sm text-muted-foreground">
                    {isStandalone
                      ? "已安裝到主畫面"
                      : isiOS
                      ? "點擊分享按鈕 ⎋ 後選擇「加入主畫面」"
                      : "安裝到主畫面享受更好的體驗"}
                  </p>
                </div>
              </div>
              {!isStandalone && !isiOS && deferredPrompt && (
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                >
                  {isInstalling ? "安裝中..." : "安裝"}
                </Button>
              )}
            </div>
            {!isStandalone && (
              <button
                onClick={resetInstallPrompt}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                重新顯示安裝提示
              </button>
            )}
          </CardContent>
        </Card>

        {/* 登出 */}
        <div className="pt-4">
          <Button
            variant="destructive"
            onClick={() => setOpen(true)}
            className="w-full"
          >
            <LogOut className="size-4" />
            登出
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認登出</DialogTitle>
            <DialogDescription>
              確定要登出嗎？登出後需要重新登入才能使用應用程式。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
            >
              確認登出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}


