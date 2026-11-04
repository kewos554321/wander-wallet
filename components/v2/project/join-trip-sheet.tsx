"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Sheet } from "@/components/v2/ui/sheet"
import { V2Avatar, avatarSeed } from "@/components/v2/ui/v2-avatar"
import type { JoinInfo } from "@/lib/project-overview"

interface JoinTripSheetProps {
  info: JoinInfo
  joining: boolean
  onJoin: () => void
  onClaim: (memberId: string) => void
  onCancel: () => void
}

/** v2 replacement for the old centred v1 dialog: same job, bottom-sheet language. */
export function JoinTripSheet({ info, joining, onJoin, onClaim, onCancel }: JoinTripSheetProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const { joinMode, unclaimedMembers } = info
  const canCreate = joinMode === "both" || joinMode === "create_only"
  const canClaim = (joinMode === "both" || joinMode === "claim_only") && unclaimedMembers.length > 0
  const description =
    joinMode === "claim_only"
      ? "請選擇你要認領的旅伴。"
      : joinMode === "create_only"
        ? "你將以新旅伴身份加入此旅程。"
        : "選擇你要認領的旅伴，或以新旅伴加入這趟旅程。"

  return (
    <Sheet open onClose={onCancel} label={`加入「${info.name}」`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 font-v2-serif text-[19px] font-bold leading-7 text-v2-ink">加入「{info.name}」</h2>
          <p className="m-0 mt-1 text-[12.5px] leading-5 text-v2-ink-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="關閉"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-v2-ink-muted transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {canClaim && (
        <div className="mt-4">
          <p className="m-0 text-[12px] font-bold leading-4 text-v2-ink">認領現有旅伴</p>
          <p className="m-0 mt-1 text-[11.5px] leading-5 text-v2-ink-muted">
            旅程建立者已經幫你留了位置，選你的名字就能看到共同支出。
          </p>
          <div className="mt-2 space-y-2" role="radiogroup" aria-label="認領現有旅伴">
            {unclaimedMembers.map((member) => {
              const active = selected === member.id
              return (
                <button
                  key={member.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={member.displayName}
                  onClick={() => setSelected(member.id)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-v2-sm border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
                    active
                      ? "border-v2-lake bg-v2-lake-soft"
                      : "border-v2-line bg-v2-surface hover:border-v2-check hover:bg-v2-paper"
                  }`}
                >
                  <V2Avatar
                    image={null}
                    name={member.displayName}
                    seed={avatarSeed(null, member.id)}
                    className="h-8 w-8 shrink-0 rounded-full"
                    fallbackClassName="text-[12px] font-bold"
                  />
                  <span className="flex-1 text-sm font-medium text-v2-ink">{member.displayName}</span>
                  {active && <Check className="h-4 w-4 text-v2-lake" strokeWidth={2.4} aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => selected && onClaim(selected)}
            disabled={!selected || joining}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-v2-sm bg-v2-lake text-[14px] font-bold text-v2-on-lake transition-transform duration-150 ease-out hover:shadow-v2-lake-md active:scale-[.98] disabled:cursor-not-allowed disabled:bg-v2-sand disabled:text-v2-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
          >
            {joining ? "認領中…" : "確認認領"}
          </button>
        </div>
      )}

      {canCreate && canClaim && (
        <div className="my-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-v2-line" />
          <span className="text-[11px] text-v2-ink-muted">或</span>
          <span className="h-px flex-1 bg-v2-line" />
        </div>
      )}

      {canCreate && (
        <div className={canClaim ? "" : "mt-4"}>
          {canClaim && <p className="m-0 text-[12px] font-bold leading-4 text-v2-ink">建立新旅伴</p>}
          <p className={`m-0 text-[11.5px] leading-5 text-v2-ink-muted ${canClaim ? "mt-1" : ""}`}>
            以新旅伴身份加入，可查看支出記錄、新增支出並參與分攤。
          </p>
          <button
            type="button"
            onClick={onJoin}
            disabled={joining}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-v2-sm border border-v2-line bg-v2-surface text-[14px] font-bold text-v2-ink transition-colors duration-150 hover:bg-v2-sand disabled:cursor-not-allowed disabled:bg-v2-paper disabled:text-v2-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
          >
            {joining ? "加入中…" : "以新旅伴加入"}
          </button>
        </div>
      )}

      {!canCreate && !canClaim && (
        <p className="m-0 mt-4 py-4 text-center text-[13px] leading-5 text-v2-ink-muted">
          此旅程目前沒有可認領的佔位旅伴，請聯繫旅程建立者
        </p>
      )}

      <button
        type="button"
        onClick={onCancel}
        disabled={joining}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-v2-sm text-[13px] font-medium text-v2-ink-muted transition-colors duration-150 hover:bg-v2-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake disabled:opacity-50 motion-reduce:transition-none"
      >
        取消
      </button>
    </Sheet>
  )
}
