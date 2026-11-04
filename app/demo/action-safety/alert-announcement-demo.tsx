"use client"

import { AlertCircle, Volume2 } from "lucide-react"

/**
 * Demo-only: the same error is currently exposed twice to assistive tech —
 * once by the inline split result and once by the footer. Visually useful,
 * but a screen reader announces it twice. The after side keeps both visual
 * messages and makes only the footer an alert.
 */

const MESSAGE = "阿明的固定金額比總額多 TWD 200"

export function AlertAnnouncementDemo({ view }: { view: "before" | "after" }) {
  const inlineRole = view === "before" ? 'role="alert"' : 'role="status"'
  const announcements = view === "before" ? [MESSAGE, MESSAGE] : [MESSAGE]

  return (
    <div className="mx-4 rounded-v2-lg border border-v2-line bg-v2-surface p-3.5">
      <div className="space-y-2">
        <div className="rounded-v2-md border border-v2-danger-border bg-v2-danger-wash px-3 py-2.5">
          <p className="m-0 text-[10px] font-bold tracking-[.4px] text-v2-ink-muted">A · 分攤區</p>
          <p className="m-0 mt-1 flex items-start gap-2 text-[12px] font-semibold leading-4 text-v2-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {MESSAGE}
          </p>
          <span className="mt-1.5 inline-flex rounded-full bg-v2-sand px-2 py-0.5 font-mono text-[10px] font-bold text-v2-ink-muted">
            {inlineRole}
          </span>
        </div>

        <div className="rounded-v2-md border border-v2-line bg-v2-paper px-3 py-2.5">
          <p className="m-0 text-[10px] font-bold tracking-[.4px] text-v2-ink-muted">B · Footer</p>
          <p className="m-0 mt-1 flex items-start gap-2 text-[12px] font-semibold leading-4 text-v2-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {MESSAGE}
          </p>
          <span className="mt-1.5 inline-flex rounded-full bg-v2-sand px-2 py-0.5 font-mono text-[10px] font-bold text-v2-ink-muted">
            role=&quot;alert&quot;
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-v2-md bg-v2-ink px-3 py-2.5 text-v2-paper">
        <p className="m-0 flex items-center gap-1.5 text-[11px] font-bold text-v2-gold-soft">
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          螢幕閱讀器會念
        </p>
        <ol className="m-0 mt-1 list-none space-y-1 p-0 text-[12px] leading-5">
          {announcements.map((line, index) => (
            <li key={index} className="flex gap-2">
              <span className="shrink-0 text-v2-gold-soft">{index + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-1.5 text-[10px] leading-4 text-v2-paper/80">
          {view === "before"
            ? "inline 與 footer 都是 alert，所以同一句會被念兩次。"
            : "只有 footer 是 alert；inline 改成 status，視覺保留但不再搶著朗讀。"}
        </p>
      </div>
    </div>
  )
}
