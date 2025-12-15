"use client"

import { useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { User, Mail, Calendar, Pencil } from "lucide-react"
import {
  AvatarPicker,
  AvatarDisplay,
  parseAvatarString,
  generateAvatarString,
} from "@/components/avatar-picker"

export default function SettingsProfilePage() {
  const { data: session, update } = useSession()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const avatarData = parseAvatarString(session?.user?.image)

  async function handleAvatarSelect(iconId: string, colorId: string) {
    setSaving(true)
    try {
      const avatarString = generateAvatarString(iconId, colorId)

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: avatarString }),
      })

      if (!res.ok) {
        throw new Error("儲存失敗")
      }

      await update()
      setPickerOpen(false)
    } catch (error) {
      console.error("更新頭像失敗:", error)
      alert("儲存失敗，請稍後再試")
    } finally {
      setSaving(false)
    }
  }

  // 判斷是否為自訂頭像、外部圖片或無頭像
  const isCustomAvatar = avatarData !== null
  const hasExternalImage =
    session?.user?.image &&
    !session.user.image.startsWith("avatar:") &&
    !session.user.image.startsWith("data:")

  return (
    <AppLayout title="個人資料" showBack>
      <div className="space-y-6">
        {/* 頭像區塊 */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setPickerOpen(true)}
            className="relative group"
          >
            {isCustomAvatar ? (
              <AvatarDisplay
                avatarString={session?.user?.image}
                size="lg"
              />
            ) : hasExternalImage ? (
              <Image
                src={session!.user!.image!}
                alt="頭像"
                width={96}
                height={96}
                className="rounded-full object-cover size-24"
              />
            ) : (
              <div className="size-24 rounded-full bg-muted flex items-center justify-center">
                <User className="size-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="size-6 text-white" />
            </div>
          </button>
          <p className="text-xs text-muted-foreground">點擊更換頭像</p>
          <h2 className="text-xl font-semibold">
            {session?.user?.name || "使用者"}
          </h2>
        </div>

        {/* 帳號資訊 */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                <User className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">名稱</p>
                <p className="font-medium">{session?.user?.name || "未設定"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">電子郵件</p>
                <p className="font-medium">{session?.user?.email || "未設定"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">登入方式</p>
                <p className="font-medium">
                  {session?.user?.email?.includes("@gmail.com") ? "Google 帳號" : "電子郵件"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 頭像選擇器 */}
      <AvatarPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentIcon={avatarData?.iconId || "user"}
        currentColor={avatarData?.colorId || "indigo"}
        onSelect={handleAvatarSelect}
        loading={saving}
      />
    </AppLayout>
  )
}
