"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { useLiff } from "@/components/auth/liff-provider"
import { useTheme } from "@/components/system/theme-provider"
import { ChevronRight, ChevronDown, Sun, Moon, Monitor, User, Wallet, Bell, Loader2, MessageCircle, ExternalLink, BookOpen, HelpCircle } from "lucide-react"
import { AvatarDisplay, parseAvatarString } from "@/components/avatar-picker"
import { CurrencySelect } from "@/components/ui/currency-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { CurrencyCode } from "@/lib/constants/currencies"
import type { UserPreferences } from "@/types/user-preferences"
import { useOnboarding } from "@/lib/hooks"
import { useBetaToggle } from "@/lib/hooks/use-beta-toggle"
import { usePreferences } from "@/lib/hooks/use-preferences"

export function GeneralSettingsV1() {
  const [themeExpanded, setThemeExpanded] = useState(false)
  const [expenseExpanded, setExpenseExpanded] = useState(false)
  const [notificationExpanded, setNotificationExpanded] = useState(false)
  const { user } = useLiff()
  const isCustomAvatar = parseAvatarString(user?.image) !== null
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { resetOnboarding } = useOnboarding()
  const [resettingTour, setResettingTour] = useState(false)
  const { preferences, save, saving } = usePreferences()
  const { enabled: betaEnabled, toggle: betaToggle } = useBetaToggle()

  // 更新預設幣別
  function handleCurrencyChange(currency: CurrencyCode) {
    save({ defaultCurrency: currency })
  }

  // 更新預設分帳方式
  function handleSplitModeChange(mode: "equal" | "custom") {
    save({ defaultSplitMode: mode })
  }

  // 更新通知設定
  function handleNotificationChange(key: keyof UserPreferences["notifications"], value: boolean) {
    save({ notifications: { [key]: value } })
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

        {/* Beta 新版介面 */}
        <Card>
          <CardContent>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">試用新版介面（Beta）</p>
                <p className="text-xs text-muted-foreground mt-1">
                  搶先體驗全新設計，可隨時關閉
                </p>
              </div>
              <Checkbox
                checked={betaEnabled}
                onCheckedChange={(checked) => betaToggle(checked === true)}
              />
            </label>
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

        {/* 重看導覽 */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={async () => {
            setResettingTour(true)
            await resetOnboarding()
            setResettingTour(false)
            router.push("/projects")
          }}
        >
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-muted-foreground" />
                <span className="font-medium">重看導覽</span>
              </div>
              {resettingTour ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              進入任一專案時會重新顯示導覽
            </p>
          </CardContent>
        </Card>

        {/* 功能介紹 */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => window.open("/", "_blank")}
        >
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                <span className="font-medium">功能介紹</span>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* 意見回饋 */}
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => window.open("https://line.me/R/ti/p/@386mbqva", "_blank")}
        >
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-muted-foreground" />
                <span className="font-medium">意見回饋</span>
              </div>
              <ExternalLink className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


