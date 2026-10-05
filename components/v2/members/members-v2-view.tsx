import Link from "next/link"
import { ChevronRight, Settings2, Share2, UserMinus, UserPlus, User } from "lucide-react"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"
import { JOIN_MODE_OPTIONS } from "@/lib/hooks/use-project-form"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"

const AVATAR_TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-coral-soft text-v2-coral-strong",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-gold-soft text-v2-gold",
]

export interface MembersV2ViewProps {
  project: MembersProject
  currentUserId: string | null
  isOwner: boolean
  removing: string | null
  onInvite: () => void
  onAdd: () => void
  onRemove: (memberId: string) => void
}

const pillButton =
  "inline-flex h-8 items-center gap-[5px] rounded-[8px] border border-v2-lake-edge bg-v2-lake-soft px-2.5 text-xs font-semibold text-v2-lake"
const badge = "rounded-full px-[7px] text-xs font-bold"

export function MembersV2View(props: MembersV2ViewProps) {
  const { project } = props
  const joinModeOption = JOIN_MODE_OPTIONS.find((option) => option.value === project.joinMode) ?? JOIN_MODE_OPTIONS[0]

  return (
    <>
      <V2TopBar title="成員" backHref={`/projects/${project.id}`} titleClassName="text-[17px] font-semibold" />
      <div className="mx-4 mb-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="m-0 text-[13px] font-bold text-v2-lake">成員列表</p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="邀請成員" title="邀請成員" onClick={props.onInvite} className={pillButton}>
              <Share2 className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
              分享
            </button>
            <button type="button" aria-label="手動新增成員" title="手動新增" onClick={props.onAdd} className={pillButton}>
              <UserPlus className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
              增加成員
            </button>
          </div>
        </div>
        <div className="mb-3">
          <span className="text-xs text-v2-ink-muted">成員組成 · {project.members.length} 位旅伴</span>
        </div>

        {project.members.map((member, i) => {
          const isMe = member.user?.id === props.currentUserId
          const isCreator = member.role === "owner"
          const isPlaceholder = !member.userId
          const canManage = props.isOwner && !isMe
          return (
            <div
              key={member.id}
              data-testid={`member-${member.id}`}
              className={`flex items-center gap-3 ${i < project.members.length - 1 ? "border-b border-v2-line-soft py-3.5" : "pt-3.5"}`}
            >
              {isPlaceholder ? (
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-v2-sand text-v2-ink-subtle"
                  aria-hidden="true"
                >
                  <User className="h-[19px] w-[19px]" strokeWidth={1.7} />
                </span>
              ) : (
                <V2Avatar
                  image={member.user?.image ?? null}
                  name={member.displayName}
                  className="h-11 w-11 shrink-0 rounded-full"
                  fallbackClassName={`text-sm font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-bold">{member.displayName}</span>
                  {isCreator && <span className={`${badge} bg-v2-lake-soft py-0.5 text-v2-lake`}>建立者</span>}
                  {isMe && <span className={`${badge} border border-v2-lake-border bg-v2-surface py-px text-v2-lake`}>你</span>}
                  {isPlaceholder && <span className={`${badge} bg-v2-sand py-0.5 text-v2-ink-muted`}>佔位成員</span>}
                </span>
                <span className={`mt-0.5 block text-xs ${isPlaceholder ? "text-v2-ink-subtle" : "text-v2-ink-muted"}`}>
                  {isPlaceholder ? "尚未加入" : member.user?.email}
                </span>
              </span>
              {canManage && (
                <button
                  type="button"
                  aria-label={`移除${member.displayName}`}
                  disabled={props.removing === member.id}
                  onClick={() => props.onRemove(member.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-v2-danger disabled:opacity-40"
                >
                  <UserMinus className="h-4 w-4" strokeWidth={1.7} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="mx-4 mb-4 rounded-2xl border border-v2-line bg-v2-surface">
        <Link
          href={`/projects/${project.id}/settings`}
          aria-label={`成員加入方式，目前為${joinModeOption.label}，前往專案設定修改`}
          className="flex items-center gap-3 px-4 py-3.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-v2-lake-soft text-v2-lake" aria-hidden="true">
            <Settings2 className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">成員加入方式</span>
              <span className="shrink-0 rounded-full bg-v2-lake-soft px-2 py-0.5 text-[11px] font-bold text-v2-lake">
                {joinModeOption.label}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-v2-ink-muted">{joinModeOption.description}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
        </Link>
      </div>
    </>
  )
}
