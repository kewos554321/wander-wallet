"use client"

import { useState } from "react"
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
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "@/components/system/theme-provider"
import { LogOut, ChevronRight, ChevronDown, Sun, Moon, Monitor, User } from "lucide-react"
import { AvatarDisplay, parseAvatarString } from "@/components/avatar-picker"

export default function SettingsPage() {
  const [open, setOpen] = useState(false)
  const [themeExpanded, setThemeExpanded] = useState(false)
  const { data: session } = useSession()
  const isCustomAvatar = parseAvatarString(session?.user?.image) !== null
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  async function handleLogout() {
    await signOut({
      redirect: true,
      callbackUrl: "/login"
    })
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
              <AvatarDisplay avatarString={session?.user?.image} size="md" />
            ) : session?.user?.image ? (
              <Image
                src={session.user.image}
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
                {session?.user?.name || "使用者"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {session?.user?.email || ""}
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


