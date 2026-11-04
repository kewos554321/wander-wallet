"use client"

import { useRef } from "react"
import { Calendar, LogOut, Mail, User } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SECTION_CARD } from "@/components/v2/expense-form/section-card"
import { useDismiss } from "@/components/v2/use-dismiss"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"

export interface ProfileV2ViewProps {
  name: string
  image: string | null
  userId?: string | null
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
  userId,
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
        <V2Avatar
          image={image}
          name={name}
          seed={userId}
          variant="brand"
          className="h-[88px] w-[88px] rounded-full"
          fallbackClassName="font-v2-serif text-[30px] font-bold"
        />
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-v2-md bg-v2-danger text-[15px] font-bold text-v2-on-lake"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>

      {logoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-v2-overlay p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="logout-title" className="w-[320px] max-w-[calc(100vw-40px)] rounded-v2-lg bg-v2-surface p-[22px]">
            <h3 id="logout-title" className="m-0 mb-2 font-v2-serif text-[17px] font-bold text-v2-ink">
              確認登出
            </h3>
            <p className="m-0 mb-4 text-[13px] text-v2-ink-muted">確定要登出嗎？登出後需要重新登入才能使用應用程式。</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => onLogoutOpenChange(false)} className="h-11 flex-1 rounded-v2-md border border-v2-line bg-v2-surface text-[14px] font-semibold text-v2-ink-muted">
                取消
              </button>
              <button type="button" data-testid="logout-confirm-button" onClick={onLogout} className="h-11 flex-1 rounded-v2-md bg-v2-danger text-[14px] font-bold text-v2-on-lake">
                確認登出
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
