"use client"

import { useRef } from "react"
import Image from "next/image"
import { Calendar, LogOut, Mail, Pencil, User } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SECTION_CARD } from "@/components/v2/expense-form/section-card"
import { useDismiss } from "@/components/v2/use-dismiss"
import { AvatarDisplay, AvatarPicker } from "@/components/avatar-picker"

export interface ProfileV2ViewProps {
  name: string
  image: string | null
  avatarData: { iconId: string; colorId: string } | null
  hasExternalImage: boolean
  pickerOpen: boolean
  saving: boolean
  onOpenPicker: () => void
  onPickerOpenChange: (open: boolean) => void
  onSelectAvatar: (iconId: string, colorId: string) => void
  logoutOpen: boolean
  onLogoutOpenChange: (open: boolean) => void
  onLogout: () => void
}

const ROWS: { label: string; value: string; icon: typeof User }[] = [
  { label: "名稱", value: "", icon: User },
  { label: "帳號類型", value: "LINE 用戶", icon: Mail },
  { label: "登入方式", value: "LINE 帳號", icon: Calendar },
]

export function ProfileV2View({
  name,
  image,
  avatarData,
  hasExternalImage,
  pickerOpen,
  saving,
  onOpenPicker,
  onPickerOpenChange,
  onSelectAvatar,
  logoutOpen,
  onLogoutOpenChange,
  onLogout,
}: ProfileV2ViewProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useDismiss(dialogRef, () => onLogoutOpenChange(false), logoutOpen)

  return (
    <div className="min-h-screen">
      <V2TopBar title="個人資料" backHref="/settings" titleClassName="text-[17px] font-semibold" />

      <div className="flex flex-col items-center gap-3 pt-5">
        <button type="button" data-testid="profile-avatar" onClick={onOpenPicker} className="relative">
          {avatarData ? (
            <AvatarDisplay avatarString={image ?? ""} size="lg" />
          ) : hasExternalImage ? (
            <Image src={image!} alt="頭像" width={88} height={88} className="h-[88px] w-[88px] rounded-full object-cover" />
          ) : (
            <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-v2-lake font-v2-serif text-[30px] font-bold text-v2-paper">
              {name.charAt(0) || "?"}
            </span>
          )}
          <span className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-lake">
            <Pencil className="h-3.5 w-3.5" />
          </span>
        </button>
        <p className="text-[12px] text-v2-ink-muted">點擊更換頭像</p>
        <h2 className="m-0 font-v2-serif text-[22px] font-bold text-v2-ink">{name || "使用者"}</h2>
      </div>

      <div className={`${SECTION_CARD} mt-6`}>
        {ROWS.map((row, index) => (
          <div key={row.label} className={index < ROWS.length - 1 ? "mb-3 flex items-center gap-3 border-b border-v2-line-soft pb-3 last:border-0" : "flex items-center gap-3"}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-v2-sand text-v2-ink-muted">
              <row.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[12px] text-v2-ink-muted">{row.label}</p>
              <p className="m-0 text-[14px] font-semibold text-v2-ink">{row.label === "名稱" ? name || "未設定" : row.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 pb-8 pt-2">
        <button
          type="button"
          data-testid="profile-logout"
          onClick={() => onLogoutOpenChange(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-v2-danger text-[15px] font-bold text-v2-on-lake"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>

      {logoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-v2-overlay p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="logout-title" className="w-[320px] max-w-[calc(100vw-40px)] rounded-[20px] bg-v2-surface p-[22px]">
            <h3 id="logout-title" className="m-0 mb-2 font-v2-serif text-[17px] font-bold text-v2-ink">
              確認登出
            </h3>
            <p className="m-0 mb-4 text-[13px] text-v2-ink-muted">確定要登出嗎？登出後需要重新登入才能使用應用程式。</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => onLogoutOpenChange(false)} className="h-11 flex-1 rounded-[12px] border border-v2-line bg-v2-surface text-[14px] font-semibold text-v2-ink-muted">
                取消
              </button>
              <button type="button" data-testid="logout-confirm-button" onClick={onLogout} className="h-11 flex-1 rounded-[12px] bg-v2-danger text-[14px] font-bold text-v2-on-lake">
                確認登出
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AvatarPicker
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
        currentIcon={avatarData?.iconId || "user"}
        currentColor={avatarData?.colorId || "indigo"}
        onSelect={onSelectAvatar}
        loading={saving}
      />
    </div>
  )
}
