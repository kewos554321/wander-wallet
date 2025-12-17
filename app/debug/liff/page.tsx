"use client"

import { useEffect, useState } from "react"
import { useLiff } from "@/components/auth/liff-provider"
import liff from "@line/liff"

export default function LiffDebugPage() {
  const { user, liffProfile, isLoading, isAuthenticated, isDevMode, canSendMessages } = useLiff()
  const [liffContext, setLiffContext] = useState<Record<string, unknown> | null>(null)
  const [liffOs, setLiffOs] = useState<string | undefined>(undefined)
  const [isInClient, setIsInClient] = useState<boolean | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isDevMode && !isLoading) {
      try {
        setLiffContext(liff.getContext() as Record<string, unknown> | null)
        setLiffOs(liff.getOS())
        setIsInClient(liff.isInClient())
        setIsLoggedIn(liff.isLoggedIn())
      } catch (e) {
        console.error("Failed to get LIFF info:", e)
      }
    }
  }, [isDevMode, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-center mb-6">LIFF Debug</h1>

        {/* 環境狀態 */}
        <DebugCard title="Environment">
          <DebugRow label="NEXT_PUBLIC_LIFF_ID" value={process.env.NEXT_PUBLIC_LIFF_ID || "(not set)"} status={!!process.env.NEXT_PUBLIC_LIFF_ID} />
          <DebugRow label="NEXT_PUBLIC_LIFF_URL" value={process.env.NEXT_PUBLIC_LIFF_URL || "(not set)"} status={!!process.env.NEXT_PUBLIC_LIFF_URL} />
          <DebugRow label="isDevMode" value={String(isDevMode)} status={!isDevMode} />
        </DebugCard>

        {/* LIFF 狀態 */}
        <DebugCard title="LIFF Status">
          <DebugRow label="isInClient" value={String(isInClient)} status={isInClient === true} />
          <DebugRow label="isLoggedIn" value={String(isLoggedIn)} status={isLoggedIn === true} />
          <DebugRow label="OS" value={liffOs || "(unknown)"} />
        </DebugCard>

        {/* LIFF Context */}
        <DebugCard title="LIFF Context">
          {liffContext ? (
            <>
              <DebugRow label="type" value={String(liffContext.type || "(none)")} status={["utou", "room", "group"].includes(String(liffContext.type))} />
              <DebugRow label="viewType" value={String(liffContext.viewType || "(none)")} />
              <DebugRow label="userId" value={liffContext.userId ? "exists" : "(none)"} />
              <DebugRow label="utouId" value={liffContext.utouId ? "exists" : "(none)"} />
              <DebugRow label="roomId" value={liffContext.roomId ? "exists" : "(none)"} />
              <DebugRow label="groupId" value={liffContext.groupId ? "exists" : "(none)"} />
            </>
          ) : (
            <div className="text-sm text-slate-500">No context (DevMode or not initialized)</div>
          )}
        </DebugCard>

        {/* SendMessages 狀態 */}
        <DebugCard title="SendMessages Availability">
          <DebugRow label="canSendMessages" value={String(canSendMessages)} status={canSendMessages} />
          <div className="mt-2 text-xs text-slate-500">
            <p>Requirements:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li className={isInClient ? "text-green-600" : "text-red-500"}>
                {isInClient ? "✓" : "✗"} Must be in LINE app (isInClient)
              </li>
              <li className={["utou", "room", "group"].includes(String(liffContext?.type)) ? "text-green-600" : "text-red-500"}>
                {["utou", "room", "group"].includes(String(liffContext?.type)) ? "✓" : "✗"} Must be opened from chat (type: utou/room/group)
              </li>
            </ul>
          </div>
        </DebugCard>

        {/* 用戶資訊 */}
        <DebugCard title="User Info">
          <DebugRow label="isAuthenticated" value={String(isAuthenticated)} status={isAuthenticated} />
          <DebugRow label="user.id" value={user?.id || "(none)"} />
          <DebugRow label="user.name" value={user?.name || "(none)"} />
          <DebugRow label="liffProfile.displayName" value={liffProfile?.displayName || "(none)"} />
        </DebugCard>

        {/* 結論 */}
        <DebugCard title="Conclusion">
          <div className={`text-center p-4 rounded-lg ${canSendMessages && !isDevMode ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
            <div className={`text-lg font-bold ${canSendMessages && !isDevMode ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {canSendMessages && !isDevMode ? "✅ LINE 通知勾選框會顯示" : "❌ LINE 通知勾選框不會顯示"}
            </div>
            {!canSendMessages && !isDevMode && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                請從 LINE 群組中點擊 LIFF 連結開啟
              </p>
            )}
            {isDevMode && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                開發模式：請設定 NEXT_PUBLIC_LIFF_ID
              </p>
            )}
          </div>
        </DebugCard>
      </div>
    </div>
  )
}

function DebugCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <h2 className="font-bold text-sm text-slate-500 dark:text-slate-400 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DebugRow({ label, value, status }: { label: string; value: string; status?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-600 dark:text-slate-400 font-mono">{label}</span>
      <span className={`font-mono ${status === true ? "text-green-600" : status === false ? "text-red-500" : "text-slate-800 dark:text-slate-200"}`}>
        {value}
      </span>
    </div>
  )
}
