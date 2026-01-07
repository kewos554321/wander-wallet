"use client"

import { useState, useEffect } from "react"
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
import { useLiff, useAuthFetch } from "@/components/auth/liff-provider"
import { useTheme } from "@/components/system/theme-provider"
import { LogOut, ChevronRight, ChevronDown, Sun, Moon, Monitor, User, Wallet, Bell, Loader2, MessageCircle, ExternalLink, BookOpen } from "lucide-react"
import { AvatarDisplay, parseAvatarString } from "@/components/avatar-picker"
import { CurrencySelect } from "@/components/ui/currency-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { CurrencyCode } from "@/lib/constants/currencies"
import type { UserPreferences } from "@/types/user-preferences"
import { DEFAULT_PREFERENCES, mergePreferences } from "@/types/user-preferences"

export default function SettingsPage() {
  const [open, setOpen] = useState(false)
  const [themeExpanded, setThemeExpanded] = useState(false)
  const [expenseExpanded, setExpenseExpanded] = useState(false)
  const [notificationExpanded, setNotificationExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user, logout, updatePreferences } = useLiff()
  const authFetch = useAuthFetch()
  const isCustomAvatar = parseAvatarString(user?.image) !== null
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // 合併用戶偏好與預設值
  const preferences = mergePreferences(user?.preferences)

  // 保存偏好設定
  async function savePreferences(newPrefs: UserPreferences) {
    setSaving(true)
    try {
      const res = await authFetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: newPrefs }),
      })
      if (res.ok) {
        updatePreferences(newPrefs)
      }
    } catch (error) {
      console.error("保存偏好設定失敗:", error)
    } finally {
      setSaving(false)
    }
  }

  // 更新預設幣別
  function handleCurrencyChange(currency: CurrencyCode) {
    const newPrefs = { ...preferences, defaultCurrency: currency }
    savePreferences(newPrefs)
  }

  // 更新預設分帳方式
  function handleSplitModeChange(mode: "equal" | "custom") {
    const newPrefs = { ...preferences, defaultSplitMode: mode }
    savePreferences(newPrefs)
  }

  // 更新通知設定
  function handleNotificationChange(key: keyof UserPreferences["notifications"], value: boolean) {
    const newPrefs = {
      ...preferences,
      notifications: { ...preferences.notifications, [key]: value },
    }
    savePreferences(newPrefs)
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
    <AppLayout title="個人設定" showBack>
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

        {/* 記帳偏好設定 */}
        <Card>
          <CardContent className="space-y-3">
            <button
              onClick={() => setExpenseExpanded(!expenseExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-muted-foreground" />
                <span className="font-medium">記帳偏好</span>
              </div>
              <div className="flex items-center gap-2">
                {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                <ChevronDown
                  className={`size-5 text-muted-foreground transition-transform ${
                    expenseExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
            {expenseExpanded && (
              <div className="space-y-4 pt-2">
                {/* 預設幣別 */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">預設幣別</Label>
                  <CurrencySelect
                    value={preferences.defaultCurrency as CurrencyCode}
                    onChange={handleCurrencyChange}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    新增支出時優先使用此幣別
                  </p>
                </div>

                {/* 預設分帳方式 */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">預設分帳方式</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSplitModeChange("equal")}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors text-sm ${
                        preferences.defaultSplitMode === "equal"
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      均分
                    </button>
                    <button
                      onClick={() => handleSplitModeChange("custom")}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors text-sm ${
                        preferences.defaultSplitMode === "custom"
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      自訂金額
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card>
          <CardContent className="space-y-3">
            <button
              onClick={() => setNotificationExpanded(!notificationExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" />
                <span className="font-medium">LINE 通知</span>
              </div>
              <ChevronDown
                className={`size-5 text-muted-foreground transition-transform ${
                  notificationExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {notificationExpanded && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  控制支出操作時是否發送 LINE 群組通知
                </p>

                {/* 新增支出通知 */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">新增支出時通知</span>
                  <Checkbox
                    checked={preferences.notifications.expenseCreated}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("expenseCreated", checked === true)
                    }
                  />
                </label>

                {/* 更新支出通知 */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">更新支出時通知</span>
                  <Checkbox
                    checked={preferences.notifications.expenseUpdated}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("expenseUpdated", checked === true)
                    }
                  />
                </label>

                {/* 刪除支出通知 */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">刪除支出時通知</span>
                  <Checkbox
                    checked={preferences.notifications.expenseDeleted}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("expenseDeleted", checked === true)
                    }
                  />
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 功能介紹 */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => window.open("/", "_blank")}
        >
          <CardContent className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
              <BookOpen className="size-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">功能介紹</p>
              <p className="text-sm text-muted-foreground">
                了解 Wander Wallet 的功能與使用方式
              </p>
            </div>
            <ExternalLink className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* 意見回饋 */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => window.open("https://line.me/R/ti/p/@386mbqva", "_blank")}
        >
          <CardContent className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-[#06C755] flex items-center justify-center">
              <MessageCircle className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">意見回饋</p>
              <p className="text-sm text-muted-foreground">
                Bug 回報、功能建議、問題諮詢
              </p>
            </div>
            <ExternalLink className="size-5 text-muted-foreground" />
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


