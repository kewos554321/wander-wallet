"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, ChevronRight, ExternalLink, HelpCircle, Loader2, MessageCircle, Monitor, Moon, Sun, Wallet } from "lucide-react"
import { useLiff } from "@/components/auth/liff-provider"
import { useTheme } from "@/components/system/theme-provider"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"
import { V2CurrencyField } from "@/components/v2/ui/currency-field"
import type { CurrencyCode } from "@/lib/constants/currencies"
import { useOnboarding } from "@/lib/hooks"
import { useBetaToggle } from "@/lib/hooks/use-beta-toggle"
import { usePreferences } from "@/lib/hooks/use-preferences"
import type { NotificationPreferences } from "@/types/user-preferences"

const FEEDBACK_URL = "https://line.me/R/ti/p/@386mbqva"

const NOTIFICATION_ITEMS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "expenseCreated", label: "新增支出時通知" },
  { key: "expenseUpdated", label: "更新支出時通知" },
  { key: "expenseDeleted", label: "刪除支出時通知" },
]

const APPEARANCE_OPTIONS = [
  { value: "light", label: "淺色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "系統", Icon: Monitor },
] as const

const cardClass = "rounded-[18px] border border-v2-line bg-v2-surface p-4"
const cardTitleClass = "m-0 text-[13px] font-bold text-v2-lake"

export function GeneralSettingsV2() {
  const router = useRouter()
  const { user } = useLiff()
  const { preferences, save, error } = usePreferences()
  const { theme, setTheme } = useTheme()
  const { enabled: betaEnabled, toggle: betaToggle, saving: betaSaving, error: betaError } = useBetaToggle()
  const { resetOnboarding } = useOnboarding()
  const [resettingTour, setResettingTour] = useState(false)

  const displayName = user?.name || "使用者"

  async function handleResetTour() {
    setResettingTour(true)
    await resetOnboarding()
    setResettingTour(false)
    router.push("/projects")
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <V2TopBar title="通用設定" backHref="/projects" />
        <div className="flex flex-col gap-3.5 p-4">
          {error && (
            <p role="alert" className="text-center text-xs font-semibold text-v2-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            aria-label="編輯個人資料"
            onClick={() => router.push("/settings/profile")}
            className="flex items-center gap-3.5 rounded-[18px] bg-v2-lake p-4 text-left text-v2-paper"
          >
            <V2Avatar
              image={user?.image ?? null}
              name={displayName}
              className="h-12 w-12 shrink-0 rounded-full"
              fallbackClassName="bg-v2-paper/15 text-base font-bold"
            />
            <span className="min-w-0 flex-1">
              <p className="m-0 font-v2-serif text-[15px] font-semibold">{displayName}</p>
              <p className="mt-0.5 text-xs opacity-75">LINE 用戶 · 點擊編輯個人資料</p>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
          </button>

          <div className={`${cardClass} flex flex-col gap-3`}>
            <p className={cardTitleClass}>新版介面</p>
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[13px] font-bold">試用新版介面（Beta）</span>
                <span className="mt-0.5 block text-xs text-v2-ink-subtle">關閉後回到舊版介面</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={betaEnabled}
                aria-label="試用新版介面（Beta）"
                disabled={betaSaving}
                onClick={() => betaToggle(!betaEnabled)}
                className={`relative inline-block h-[19px] w-8 shrink-0 rounded-full disabled:opacity-60 ${
                  betaEnabled ? "bg-v2-lake" : "bg-v2-check"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-[15px] w-[15px] rounded-full bg-v2-knob transition-[left] ${
                    betaEnabled ? "left-[15px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            {betaError && (
              <p role="alert" className="text-xs font-semibold text-v2-danger">
                {betaError}
              </p>
            )}
          </div>

          <div className={`${cardClass} flex flex-col gap-3`}>
            <p className={cardTitleClass}>外觀</p>
            <div className="flex gap-2">
              {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(value)}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 ${
                      active ? "border-[1.5px] border-v2-lake bg-v2-lake-soft" : "border-v2-line bg-v2-paper"
                    }`}
                  >
                    <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-v2-lake" : "text-v2-ink-muted"}`} />
                    <span className={`text-xs ${active ? "font-bold text-v2-lake" : "font-semibold text-v2-ink-muted"}`}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className={`${cardClass} flex flex-col gap-3.5`}>
            <div className="flex items-center gap-2">
              <Wallet className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <p className={cardTitleClass}>記帳偏好</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-v2-ink-muted">預設幣別</label>
              <V2CurrencyField
                value={preferences.defaultCurrency}
                onChange={(currency) => save({ defaultCurrency: currency as CurrencyCode })}
              />
              <p className="mt-1.5 text-xs text-v2-ink-subtle">新增支出時優先使用此幣別</p>
            </div>
          </div>

          <div className={`${cardClass} flex flex-col gap-3`}>
            <div className="flex items-center gap-2">
              <Bell className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <p className={cardTitleClass}>LINE 通知</p>
            </div>
            <p className="m-0 text-xs text-v2-ink-subtle">控制支出操作時是否發送 LINE 群組通知</p>
            {NOTIFICATION_ITEMS.map((item) => {
              const checked = preferences.notifications[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={item.label}
                  onClick={() => save({ notifications: { [item.key]: !checked } })}
                  className="flex w-full items-center justify-between"
                >
                  <span className="text-[13px]">{item.label}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${
                      checked ? "bg-v2-lake" : "border-[1.5px] border-v2-check"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-v2-on-lake" aria-hidden="true">
                        <path d="M4 12l5 5L20 6" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleResetTour}
            disabled={resettingTour}
            className={`${cardClass} flex items-center justify-between text-left`}
          >
            <span>
              <span className="flex items-center gap-2">
                <HelpCircle className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
                <span className="text-[13px] font-bold">重看導覽</span>
              </span>
              <span className="mt-1 block text-xs text-v2-ink-subtle">進入任一旅程時會重新顯示導覽</span>
            </span>
            {resettingTour ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-v2-ink-muted" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => window.open("/", "_blank")}
            className={`${cardClass} flex items-center justify-between text-left`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <span className="text-[13px] font-bold">功能介紹</span>
            </span>
            <ExternalLink className="h-[13px] w-[13px] shrink-0 text-v2-ink-subtle" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => window.open(FEEDBACK_URL, "_blank")}
            className={`${cardClass} flex items-center justify-between text-left`}
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <span className="text-[13px] font-bold">意見回饋</span>
            </span>
            <ExternalLink className="h-[13px] w-[13px] shrink-0 text-v2-ink-subtle" aria-hidden="true" />
          </button>
        </div>
      </div>
    </UiV2Scope>
  )
}
